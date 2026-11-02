// All SQL lives here. Search, filter, sort and paging happen in Postgres.
import { pool, withTransaction } from '@/lib/db';
import { ApiError, notFound } from '@/lib/errors';
import { allowedActions, assertTransition, assertEditable, assertRemovable, decisionFields } from '@/lib/rules';
import { REQUEST_FIELD_NAMES } from '@/lib/validation';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const COLUMNS = `id, reference, customer_name, customer_email, customer_phone, order_number,
  item_sku, item_name, quantity, reason, status, resolution, refund_amount, created_at, updated_at`;

// Sort keys are mapped to SQL here, never interpolated from user input.
const SORT_SQL = {
  created_at: 'created_at',
  updated_at: 'updated_at',
  reference: 'reference',
  customer_name: 'lower(customer_name)',
  order_number: 'order_number',
  status: "array_position(ARRAY['OPEN','IN_REVIEW','APPROVED','COMPLETED','REJECTED'], status)",
};

function present(row) {
  return {
    ...row,
    refund_amount: row.refund_amount === null ? null : Number(row.refund_amount), // pg returns numeric as string
    actions: allowedActions(row),
  };
}

// Turns known database constraint violations into proper API errors.
function translateDbError(err) {
  if (err.code === '23505' && err.constraint === 'uniq_live_request_per_order_item') {
    return new ApiError(
      409,
      'DUPLICATE_LIVE_REQUEST',
      'A live return request already exists for this item on this order. It must be Rejected or Completed before a new one can be raised.',
    );
  }
  return err;
}

const inTransaction = (fn) =>
  withTransaction(fn).catch((err) => {
    throw translateDbError(err);
  });

async function findRow(db, id, { lock = false } = {}) {
  if (!UUID_RE.test(id)) throw notFound();
  const { rows } = await db.query(
    `SELECT ${COLUMNS} FROM return_requests WHERE id = $1 AND deleted_at IS NULL ${lock ? 'FOR UPDATE' : ''}`,
    [id],
  );
  if (!rows[0]) throw notFound();
  return rows[0];
}

export async function listRequests({ q, status, reason, sort, order, page, pageSize }) {
  const where = ['deleted_at IS NULL'];
  const params = [];
  const bind = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (q) {
    // Escape LIKE wildcards so a search for "50%" matches literally.
    const p = bind(`%${q.replace(/[\\%_]/g, '\\$&')}%`);
    where.push(
      `(customer_name ILIKE ${p} OR customer_email ILIKE ${p} OR order_number ILIKE ${p} OR reference ILIKE ${p})`,
    );
  }
  if (status) where.push(`status = ${bind(status)}`);
  if (reason) where.push(`reason = ${bind(reason)}`);

  const whereSql = where.join(' AND ');
  const direction = order === 'asc' ? 'ASC' : 'DESC';
  const n = params.length;

  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT ${COLUMNS} FROM return_requests
       WHERE ${whereSql}
       ORDER BY ${SORT_SQL[sort]} ${direction}, id
       LIMIT $${n + 1} OFFSET $${n + 2}`,
      [...params, pageSize, (page - 1) * pageSize],
    ),
    pool.query(`SELECT count(*)::int AS total FROM return_requests WHERE ${whereSql}`, params),
  ]);

  const total = count.rows[0].total;
  return {
    data: rows.rows.map(present),
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function getRequest(id) {
  const row = await findRow(pool, id);
  const { rows: notes } = await pool.query(
    'SELECT id, body, author, created_at FROM request_notes WHERE request_id = $1 ORDER BY created_at, id',
    [id],
  );
  return { ...present(row), notes };
}

export async function createRequest(data) {
  try {
    const { rows } = await pool.query(
      `INSERT INTO return_requests
         (customer_name, customer_email, customer_phone, order_number, item_sku, item_name, quantity, reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING ${COLUMNS}`,
      [
        data.customer_name,
        data.customer_email,
        data.customer_phone || null,
        data.order_number,
        data.item_sku,
        data.item_name,
        data.quantity,
        data.reason,
      ],
    );
    return { ...present(rows[0]), notes: [] };
  } catch (err) {
    throw translateDbError(err);
  }
}

export function updateRequest(id, data) {
  return inTransaction(async (db) => {
    const row = await findRow(db, id, { lock: true });
    assertEditable(row.status);

    // Column names come from the zod whitelist (strict schema), never raw input.
    const keys = Object.keys(data).filter((k) => REQUEST_FIELD_NAMES.includes(k));
    const sets = keys.map((k, i) => `${k} = $${i + 2}`);
    const values = keys.map((k) => (k === 'customer_phone' ? data[k] || null : data[k]));

    const { rows } = await db.query(
      `UPDATE return_requests SET ${sets.join(', ')}, updated_at = now()
       WHERE id = $1 RETURNING ${COLUMNS}`,
      [id, ...values],
    );
    return present(rows[0]);
  });
}

export function transitionRequest(id, input) {
  return inTransaction(async (db) => {
    // FOR UPDATE: two agents acting at once can't both move the same request.
    const row = await findRow(db, id, { lock: true });
    assertTransition(row.status, input.status);
    const { resolution, refund_amount } = decisionFields(input.status, input);

    const { rows } = await db.query(
      `UPDATE return_requests
       SET status = $2,
           resolution = COALESCE($3, resolution),
           refund_amount = COALESCE($4, refund_amount),
           updated_at = now()
       WHERE id = $1 RETURNING ${COLUMNS}`,
      [id, input.status, resolution, refund_amount],
    );
    return present(rows[0]);
  });
}

// Soft delete: the row stays in the database, it just disappears from the API.
export function removeRequest(id) {
  return inTransaction(async (db) => {
    const row = await findRow(db, id, { lock: true });
    assertRemovable(row.status);
    await db.query('UPDATE return_requests SET deleted_at = now(), updated_at = now() WHERE id = $1', [id]);
  });
}

// Notes are allowed in every status, including final ones.
export async function addNote(id, { body, author }) {
  await findRow(pool, id);
  const { rows } = await pool.query(
    `INSERT INTO request_notes (request_id, body, author)
     VALUES ($1, $2, COALESCE($3, 'Agent'))
     RETURNING id, body, author, created_at`,
    [id, body, author ?? null],
  );
  return rows[0];
}

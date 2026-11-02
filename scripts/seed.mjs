// Fills a database with demo data. Applies the schema first, then WIPES the
// ReturnDesk tables, so it works against a brand-new or an existing database.
import pg from 'pg';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env and edit it.');
  process.exit(1);
}

const STATUSES = ['OPEN', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED'];
const REASONS = ['DAMAGED', 'WRONG_ITEM', 'SIZE_ISSUE', 'NOT_AS_DESCRIBED', 'CHANGED_MIND'];
const RESOLUTIONS = ['REFUND', 'REPLACEMENT', 'STORE_CREDIT'];

const CUSTOMERS = [
  ['Aarav Mehta', 'aarav.mehta@example.com', '+91 98100 11001'],
  ['Diya Sharma', 'diya.sharma@example.com', '+91 98100 11002'],
  ['Rohan Verma', 'rohan.verma@example.com', null],
  ['Ananya Iyer', 'ananya.iyer@example.com', '+91 98100 11004'],
  ['Kabir Singh', 'kabir.singh@example.com', '+91 98100 11005'],
  ['Meera Nair', 'meera.nair@example.com', null],
  ['Vihaan Gupta', 'vihaan.gupta@example.com', '+91 98100 11007'],
  ['Isha Kapoor', 'isha.kapoor@example.com', '+91 98100 11008'],
];

const ITEMS = [
  ['TSH-BLK-M', 'Black Cotton T-Shirt (M)'],
  ['JNS-BLU-32', 'Slim Fit Jeans (32)'],
  ['SNK-WHT-9', 'White Sneakers (UK 9)'],
  ['HDP-PRO-01', 'Wireless Headphones Pro'],
  ['BAG-LTH-02', 'Leather Backpack'],
  ['WCH-SLV-05', 'Silver Wrist Watch'],
  ['JKT-GRN-L', 'Green Bomber Jacket (L)'],
  ['MUG-CER-04', 'Ceramic Mug Set (4)'],
];

const NOTES = [
  'Customer contacted by email; waiting for photos of the item.',
  'Photos received. Item looks damaged in transit.',
  'Checked order history: no previous returns from this customer.',
  'Courier pickup scheduled for the next working day.',
  'Warehouse confirmed the item is back in stock.',
  'Customer confirmed they prefer the original payment method.',
];

function buildRequests() {
  const rows = [];
  for (let i = 0; i < 36; i++) {
    const [name, email, phone] = CUSTOMERS[(i * 3) % CUSTOMERS.length];
    const [sku, itemName] = ITEMS[i % ITEMS.length];
    const status = STATUSES[i % 5];
    const decided = status === 'APPROVED' || status === 'COMPLETED';
    const resolution = decided ? RESOLUTIONS[i % 3] : null;
    rows.push({
      name, email, phone,
      order: `ORD-${1001 + i}`,
      sku, itemName,
      quantity: 1 + (i % 3),
      reason: REASONS[(i + Math.floor(i / 5)) % 5],
      status,
      resolution,
      refund: resolution === 'REFUND' ? 499 + ((i * 137) % 2000) : null,
      hoursAgo: (40 - i) * 5,
      notes: i % 2 === 0 ? 1 + (i % 3) : 0,
    });
  }
  // Rule 3 demo: request #4 (ORD-1004) was Rejected, so a fresh Open request
  // for the same order + item is allowed.
  const rejected = rows[3];
  rows.push({ ...rejected, status: 'OPEN', resolution: null, refund: null, reason: 'CHANGED_MIND', hoursAgo: 2, notes: 1 });
  return rows;
}

const schema = readFileSync(fileURLToPath(new URL('../db/schema.sql', import.meta.url)), 'utf8');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  await client.query(schema);
  await client.query('BEGIN');
  await client.query('TRUNCATE request_notes, return_requests'); // TRUNCATE skips the append-only trigger
  await client.query('ALTER SEQUENCE request_ref_seq RESTART WITH 1');
  await client.query("SELECT setval(pg_get_serial_sequence('request_notes', 'id'), 1, false)");

  const requests = buildRequests();
  let noteCount = 0;
  for (const r of requests) {
    const { rows } = await client.query(
      `INSERT INTO return_requests
         (customer_name, customer_email, customer_phone, order_number, item_sku, item_name,
          quantity, reason, status, resolution, refund_amount, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
               now() - make_interval(hours => $12), now() - make_interval(hours => $12))
       RETURNING id`,
      [r.name, r.email, r.phone, r.order, r.sku, r.itemName, r.quantity, r.reason,
       r.status, r.resolution, r.refund, r.hoursAgo],
    );
    for (let n = 0; n < r.notes; n++) {
      await client.query('INSERT INTO request_notes (request_id, body) VALUES ($1, $2)', [
        rows[0].id,
        NOTES[(noteCount + n) % NOTES.length],
      ]);
      noteCount++;
    }
  }

  await client.query('COMMIT');
  console.log(`Seeded ${requests.length} requests and ${noteCount} notes.`);
} catch (err) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('Seeding failed:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

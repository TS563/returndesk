// Shape/format validation (zod). Business rules live in lib/rules.js.
import { z } from 'zod';
import { ApiError } from '@/lib/errors';
import { REASONS, RESOLUTIONS, STATUSES, SORT_FIELDS } from '@/lib/constants';

const text = (label, max = 200) =>
  z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} must be text` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);

const oneOf = (values, label) =>
  z.enum(values, {
    errorMap: () => ({ message: `${label} must be one of: ${values.join(', ')}` }),
  });

// The editable fields of a request. Anything else (status, reference, ...) is
// rejected by .strict(), so a client can never type a reference or sneak in a status.
const requestFields = {
  customer_name: text('Customer name'),
  customer_email: z
    .string({ required_error: 'Customer email is required', invalid_type_error: 'Customer email must be text' })
    .trim()
    .email('Customer email must be a valid email address')
    .max(200),
  customer_phone: z.string({ invalid_type_error: 'Customer phone must be text' }).trim().max(30).nullish(),
  order_number: text('Order number', 50),
  item_sku: text('Item SKU', 50),
  item_name: text('Item name'),
  quantity: z
    .number({ required_error: 'Quantity is required', invalid_type_error: 'Quantity must be a number' })
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(1000),
  reason: oneOf(REASONS, 'Reason'),
};

export const REQUEST_FIELD_NAMES = Object.keys(requestFields);

export const createRequestSchema = z.object(requestFields).strict();

export const updateRequestSchema = z
  .object(requestFields)
  .partial()
  .strict()
  .refine((o) => Object.keys(o).length > 0, { message: 'Provide at least one field to update' });

export const transitionSchema = z
  .object({
    status: oneOf(STATUSES, 'Status'),
    resolution: oneOf(RESOLUTIONS, 'Resolution').nullish(),
    refund_amount: z.number({ invalid_type_error: 'Refund amount must be a number' }).nullish(),
  })
  .strict();

export const noteSchema = z.object({ body: text('Note', 2000), author: text('Author', 80).optional() }).strict();

export const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: oneOf(STATUSES, 'Status').optional(),
  reason: oneOf(REASONS, 'Reason').optional(),
  sort: oneOf(SORT_FIELDS, 'Sort').default('created_at'),
  order: oneOf(['asc', 'desc'], 'Order').default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export function parse(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  throw new ApiError(
    422,
    'VALIDATION_ERROR',
    'Some fields are invalid.',
    result.error.issues.map((i) => ({ field: i.path.join('.') || null, message: i.message })),
  );
}

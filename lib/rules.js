// The business rules. Pure functions: no database access, easy to read and test.
import { ApiError } from '@/lib/errors';
import {
  TRANSITIONS,
  EDITABLE_STATUSES,
  REMOVABLE_STATUSES,
  RESOLUTIONS,
  STATUS_LABELS,
} from '@/lib/constants';

const MAX_REFUND = 99999999.99; // numeric(10,2)

const invalid = (message, details) => new ApiError(422, 'VALIDATION_ERROR', message, details);

// What the UI is allowed to offer for a request in its current state.
// The server uses the same functions below to enforce it.
export function allowedActions(request) {
  return {
    transitions: TRANSITIONS[request.status],
    can_edit: EDITABLE_STATUSES.includes(request.status),
    can_delete: REMOVABLE_STATUSES.includes(request.status),
  };
}

// Rule 1: status flow.
export function assertTransition(from, to) {
  if (!TRANSITIONS[from].includes(to)) {
    const final = TRANSITIONS[from].length === 0;
    throw new ApiError(
      409,
      'INVALID_TRANSITION',
      final
        ? `A ${STATUS_LABELS[from]} request is final and cannot change status.`
        : `A request cannot move from ${STATUS_LABELS[from]} to ${STATUS_LABELS[to]}.`,
      { from, to, allowed: TRANSITIONS[from] },
    );
  }
}

// Rule 2: approval needs a resolution (and refund amount rules).
// Returns the resolution/refund to store for this transition.
export function decisionFields(nextStatus, { resolution, refund_amount }) {
  if (nextStatus !== 'APPROVED') {
    if (resolution != null || refund_amount != null) {
      throw invalid('Resolution and refund amount can only be provided when approving a request.', [
        { field: 'resolution', message: 'Only allowed when status is APPROVED' },
      ]);
    }
    return { resolution: null, refund_amount: null };
  }

  if (resolution == null) {
    throw invalid('A resolution is required to approve a request.', [
      { field: 'resolution', message: `Must be one of: ${RESOLUTIONS.join(', ')}` },
    ]);
  }

  if (resolution === 'REFUND') {
    const cents = typeof refund_amount === 'number' ? refund_amount * 100 : NaN;
    const valid =
      Number.isFinite(cents) &&
      refund_amount > 0 &&
      refund_amount <= MAX_REFUND &&
      Math.abs(cents - Math.round(cents)) < 1e-6;
    if (!valid) {
      throw invalid('A refund needs an amount greater than zero (at most 2 decimal places).', [
        { field: 'refund_amount', message: 'Must be a number greater than 0' },
      ]);
    }
    return { resolution, refund_amount };
  }

  if (refund_amount != null) {
    throw invalid('A refund amount can only be recorded when the resolution is Refund.', [
      { field: 'refund_amount', message: 'Must be empty unless resolution is REFUND' },
    ]);
  }
  return { resolution, refund_amount: null };
}

// Rule 4: locked once decided.
export function assertEditable(status) {
  if (!EDITABLE_STATUSES.includes(status)) {
    throw new ApiError(
      409,
      'REQUEST_LOCKED',
      `A ${STATUS_LABELS[status]} request is locked and its details can no longer be edited. Notes can still be added.`,
      { status },
    );
  }
}

// Rule 5: removal.
export function assertRemovable(status) {
  if (!REMOVABLE_STATUSES.includes(status)) {
    throw new ApiError(
      409,
      'CANNOT_REMOVE',
      `Only Open or Rejected requests can be removed. This request is ${STATUS_LABELS[status]}.`,
      { status },
    );
  }
}

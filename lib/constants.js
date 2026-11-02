// Single source of truth for the domain vocabulary. Used by the API and the UI.
// (The same values also appear in the CHECK constraints in db/schema.sql.)

export const STATUSES = ['OPEN', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED'];
export const REASONS = ['DAMAGED', 'WRONG_ITEM', 'SIZE_ISSUE', 'NOT_AS_DESCRIBED', 'CHANGED_MIND'];
export const RESOLUTIONS = ['REFUND', 'REPLACEMENT', 'STORE_CREDIT'];

// Rule 1: the only legal moves. REJECTED and COMPLETED are final.
export const TRANSITIONS = {
  OPEN: ['IN_REVIEW'],
  IN_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['COMPLETED'],
  REJECTED: [],
  COMPLETED: [],
};

// Rule 4: details may only be edited while the request is undecided.
export const EDITABLE_STATUSES = ['OPEN', 'IN_REVIEW'];
// Rule 5: only these may be taken off the desk.
export const REMOVABLE_STATUSES = ['OPEN', 'REJECTED'];

export const SORT_FIELDS = ['created_at', 'updated_at', 'reference', 'customer_name', 'order_number', 'status'];

export const STATUS_LABELS = {
  OPEN: 'Open',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  COMPLETED: 'Completed',
};

export const REASON_LABELS = {
  DAMAGED: 'Damaged',
  WRONG_ITEM: 'Wrong Item',
  SIZE_ISSUE: 'Size Issue',
  NOT_AS_DESCRIBED: 'Not As Described',
  CHANGED_MIND: 'Changed Mind',
};

export const RESOLUTION_LABELS = {
  REFUND: 'Refund',
  REPLACEMENT: 'Replacement',
  STORE_CREDIT: 'Store Credit',
};

export const ACTION_LABELS = {
  IN_REVIEW: 'Start review',
  APPROVED: 'Approve…',
  REJECTED: 'Reject',
  COMPLETED: 'Mark completed',
};

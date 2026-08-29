// Boards live in the `nexus` account-storage collection, one document per board
// keyed by a uuid documentId. BOARDS_STORE is the collection-only descriptor used
// to list every board and to read/write an individual board by documentId.
export const BOARDS_STORE = {
  collection: 'nexus',
};

// Legacy single-board document. Retained only so we can migrate it into a uuid
// board (and then delete it) — see the migration logic in the nexus nerdlet.
export const DOC_STORE = {
  collection: 'nexus',
  documentId: 'settings',
};

// Per-user preferences (favorites, dismissed banners). Stored in the *user*
// store, so it never appears in the account-storage board listing above.
export const USER_PREFS_STORE = {
  collection: 'nexus',
  documentId: 'preferences',
};

// Soft-deleted boards. Deleting a board moves its document here (keyed by the
// same board uuid) wrapped in a { board, deletedAt, deletedBy } envelope, so a
// delete is undoable. Documents are purged after DELETED_BOARDS_TTL_MS.
export const DELETED_BOARDS_STORE = {
  collection: 'nexus-deleted-boards',
};

// How long a soft-deleted board is retained before it's permanently purged.
export const DELETED_BOARDS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

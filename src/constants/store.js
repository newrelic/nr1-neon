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

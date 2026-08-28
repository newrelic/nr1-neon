// Reserved documentIds in the `nexus` account-storage collection that are not
// boards. Used to defensively skip non-board docs when listing (e.g. a legacy
// `settings` doc that hasn't been migrated/deleted yet).
const NON_BOARD_DOC_IDS = new Set(['settings', 'preferences', 'userPrefs']);

// Generate a uuid for a new board. Prefer the platform crypto API; fall back to
// an RFC4122-ish v4 string for environments where it's unavailable.
export const generateId = () => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Normalize the result of a collection-only account-storage query into a list of
// board objects. NerdStorage returns an array of `{ id, document }`; we tolerate
// bare documents too, and always surface an `id` (falling back to the document's
// own stored id). Non-board docs are filtered out defensively.
export const normalizeBoards = (data) => {
  if (!Array.isArray(data)) return [];
  return data
    .map((entry) => {
      const id = entry?.id ?? entry?.document?.id;
      const doc = entry?.document ?? entry;
      if (!id || NON_BOARD_DOC_IDS.has(id)) return null;
      return { ...doc, id };
    })
    .filter(Boolean);
};

// "Created by Jane Doe · Aug 27, 2026" — omits the pieces that aren't available.
export const formatCreatedMeta = (createdBy, createdAt) => {
  const who = createdBy?.name || createdBy?.email;
  let when = '';
  if (createdAt) {
    const d = new Date(createdAt);
    if (!Number.isNaN(d.getTime())) {
      when = d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  }
  const byPart = who ? `Created by ${who}` : 'Created';
  return when ? `${byPart} · ${when}` : byPart;
};

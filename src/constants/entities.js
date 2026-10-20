export { default as ENTITIES_TYPES_ARRAY } from './entities-types.json';

export const ALERTING_SEVERITIES = new Set(['WARNING', 'CRITICAL']);

export const ENTITY_FRAGMENT_EXTENSION = `
  fragment EntityFragmentExtension on EntityOutline {
    goldenMetrics {
      metrics {
        name
        query
        title
        unit
      }
    }
    goldenTags {
      tags {
        key
      }
    }
  }
`;

// Alert severity, worst to best. Shared by the type tabs (worst type first) and
// the entity rows' status sort.
export const SEVERITY_RANK = {
  CRITICAL: 3,
  WARNING: 2,
  NOT_ALERTING: 1,
  NOT_CONFIGURED: 0,
};

// Row orders for an entities table. Stored as a per-user pref, so it applies to
// every entity type, workload and board the user views.
export const ENTITY_SORTS = {
  STATUS_WORST: 'status-worst',
  STATUS_BEST: 'status-best',
  NAME_ASC: 'name-asc',
  NAME_DESC: 'name-desc',
};

export const DEFAULT_ENTITY_SORT = ENTITY_SORTS.STATUS_WORST;

export const ENTITY_SORT_OPTIONS = [
  { value: ENTITY_SORTS.STATUS_WORST, label: 'Status: critical first' },
  { value: ENTITY_SORTS.STATUS_BEST, label: 'Status: healthy first' },
  { value: ENTITY_SORTS.NAME_ASC, label: 'Name: A → Z' },
  { value: ENTITY_SORTS.NAME_DESC, label: 'Name: Z → A' },
];

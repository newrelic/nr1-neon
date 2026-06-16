import { ENTITY_BATCH_SIZE } from '../constants';

// Fields requested for any entity outline (children of a workload, or hits
// from an entitySearch result). The `... on WorkloadEntity` block fetches
// workloadStatus for workload-typed entities so we can populate node.status
// inline without a separate NRQL round-trip.
const ENTITY_OUTLINE_FRAGMENT = `
  accountId
  alertSeverity
  domain
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
  guid
  name
  tags { key values }
  type
  ... on WorkloadEntityOutline {
    workloadStatus { statusValue }
  }
`;

export const ENTITY_FRAGMENT = `
  ... on WorkloadEntity {
    accountId
    guid
    name
    workloadStatus { statusValue }
    relatedEntities(filter: {direction: OUTBOUND, relationshipTypes: {include: CONTAINS}}) {
      results {
        target {
          entity {
            ${ENTITY_OUTLINE_FRAGMENT}
          }
        }
      }
    }
  }
`;

export const ENTITIES_BATCH_ALIAS_PREFIX = (idx) => `idx_${idx}_b`;
export const COLLECTION_BATCH_ALIAS_PREFIX = 'wc_';
export const SEARCH_BATCH_ALIAS_PREFIX = 'es_';
export const ACCOUNT_ALIAS_PREFIX = 'a_';

export const queryFromGuids = (guids, idx) => {
  const fragments = [];
  for (let i = 0, b = 0; i < guids.length; i += ENTITY_BATCH_SIZE, b += 1) {
    const batch = guids.slice(i, i + ENTITY_BATCH_SIZE);
    fragments.push(
      `${ENTITIES_BATCH_ALIAS_PREFIX(idx)}${b}: entities(guids: ["${batch.join(
        '", "'
      )}"]) { ${ENTITY_FRAGMENT} }`
    );
  }
  return `{ actor { ${fragments.join('\n')} } }`;
};

// Fetches the entitySearchQuery for collection-style workloads (whose
// constituent members aren't reachable via entity-graph relatedEntities).
// `workloadsByAccount` is shaped like `{ [accountId]: [guid, ...] }`.
export const queryCollectionsByAccount = (workloadsByAccount) => {
  const accountFragments = [];
  let aliasIdx = 0;
  for (const [acctId, guids] of Object.entries(workloadsByAccount)) {
    const aliasedCollections = guids
      .map((g) => {
        const alias = `${COLLECTION_BATCH_ALIAS_PREFIX}${aliasIdx++}`;
        return `${alias}: collection(guid: "${g}") { guid entitySearchQuery }`;
      })
      .join('\n');
    accountFragments.push(
      `${ACCOUNT_ALIAS_PREFIX}${acctId}: account(id: ${acctId}) { workload { ${aliasedCollections} } }`
    );
  }
  return `{ actor { ${accountFragments.join('\n')} } }`;
};

// Runs an entitySearch for each provided search-query string, one alias per
// workload, and returns entity outlines for the resolved members.
// `searches` is an ordered array of `{ guid, query }` — the alias index in
// the response (`es_0`, `es_1`, …) lines up with the array index.
export const queryEntitySearches = (searches) => {
  const fragments = searches.map(
    ({ query }, i) =>
      `${SEARCH_BATCH_ALIAS_PREFIX}${i}: entitySearch(query: ${JSON.stringify(
        query
      )}) {
        results {
          entities {
            ${ENTITY_OUTLINE_FRAGMENT}
          }
        }
      }`
  );
  return `{ actor { ${fragments.join('\n')} } }`;
};

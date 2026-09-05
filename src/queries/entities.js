// Fields requested for any entity outline (children of a workload, or hits
// from an entitySearch result). Trimmed to navigation essentials so we stay
// under NerdGraph's per-query field limit (225). goldenMetrics, goldenTags,
// and tags can be lazy-fetched on demand later if a downstream view needs
// them; for tree navigation we only need identity, type, status, severity.
const ENTITY_OUTLINE_FRAGMENT = `
  accountId
  alertSeverity
  domain
  guid
  name
  type
  ... on WorkloadEntityOutline {
    workloadStatus { statusValue }
  }
`;

// Fields requested per workload entity. Reads its constituents through
// `CollectionEntity.collection(name: "WORKLOAD").members` — the same cached
// path NR's Workloads UI uses, which avoids the relationship service's
// eventual-consistency / transient-empty issue that affects relatedEntities.
// See docs: https://docs.newrelic.com/docs/apis/nerdgraph/examples/nerdgraph-workloads-api-tutorials/
export const ENTITY_FRAGMENT = `
  accountId
  guid
  name
  ... on WorkloadEntity {
    workloadStatus { statusValue }
  }
  ... on CollectionEntity {
    collection(name: "WORKLOAD") {
      members {
        count
        results {
          entities {
            ${ENTITY_OUTLINE_FRAGMENT}
          }
        }
      }
    }
  }
`;

// Fetches workload-scoped tags for a batch of workload guids in one request.
// `tagsWithMetadata` (rather than the generic `tags`) returns the smaller
// set of tags actually applied to the workload entity, e.g. its `team`
// ownership tag.
export const queryWorkloadTags = (guids) => {
  const guidList = guids.map((g) => `"${g}"`).join(', ');
  return `{
    actor {
      entities(guids: [${guidList}]) {
        guid
        ... on WorkloadEntity {
          tagsWithMetadata {
            key
            values {
              value
            }
          }
        }
      }
    }
  }`;
};

export const ENTITIES_BATCH_ALIAS_PREFIX = (idx) => `idx_${idx}_b`;
export const COLLECTION_BATCH_ALIAS_PREFIX = 'wc_';
export const SEARCH_BATCH_ALIAS_PREFIX = 'es_';
export const ACCOUNT_ALIAS_PREFIX = 'a_';

// `actor.entity(guid:)` is single-entity, so each requested guid gets its
// own sequential alias (`idx_<level>_b0`, `idx_<level>_b1`, …). Order matches
// `lastQueriedGuids` so a missing alias in the response maps back to its
// source guid. NerdGraph accepts many aliases in one query, so we don't
// chunk — keeps response handling straightforward.
export const queryFromGuids = (guids, idx) => {
  const fragments = guids.map(
    (g, i) =>
      `${ENTITIES_BATCH_ALIAS_PREFIX(
        idx
      )}${i}: entity(guid: "${g}") { ${ENTITY_FRAGMENT} }`
  );
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

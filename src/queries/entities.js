export const ENTITY_FRAGMENT = `
  ... on WorkloadEntity {
    accountId
    guid
    name
    relatedEntities(filter: {direction: OUTBOUND, relationshipTypes: {include: CONTAINS}}) {
      results {
        target {
          entity {
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
          }
        }
      }
    }
  }
`;

export const queryFromGuids = (guids, idx) =>
  `{ actor { idx_${idx}: entities(guids: ["${guids.join(
    '", "'
  )}"]) { ${ENTITY_FRAGMENT} } } }`;

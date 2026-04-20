export const ENTITY_FRAGMENT = `
  ... on WorkloadEntity {
    accountId
    guid
    name
    relatedEntities(filter: {direction: OUTBOUND, relationshipTypes: {include: CONTAINS}}) {
      results {
        target {
          entity {
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

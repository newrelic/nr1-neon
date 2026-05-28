import { ENTITY_BATCH_SIZE } from '../constants';

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

export const ENTITIES_BATCH_ALIAS_PREFIX = (idx) => `idx_${idx}_b`;

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

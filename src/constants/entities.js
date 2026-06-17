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

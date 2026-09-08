import { useMemo } from 'react';
import { useNerdGraphQuery } from 'nr1';

import { queryWorkloadTags } from '../queries';

// Flattens tagsWithMetadata's `values: [{ value }]` shape into the plain
// `values: [string]` shape used everywhere else in this codebase (see
// EntityRow/GoldenTags), so consumers don't need to care which NerdGraph
// field the tags came from.
const normalizeTags = (tagsWithMetadata) =>
  (tagsWithMetadata || []).map((tag) => ({
    key: tag.key,
    values: (tag.values || []).map((v) => v?.value).filter(Boolean),
  }));

// Fetches workload-scoped tags (via `tagsWithMetadata`) for a set of
// workload guids and returns a `{ [guid]: tags }` map.
const useWorkloadTags = (guids = []) => {
  const query = useMemo(
    () => (guids.length ? queryWorkloadTags(guids) : null),
    [guids]
  );

  const { data, loading, error } = useNerdGraphQuery({
    query: query || '{ actor { user { timeZoneName } } }',
    skip: !query,
  });

  const tagsByGuid = useMemo(() => {
    const map = {};
    (data?.actor?.entities || []).forEach((entity) => {
      if (entity?.guid)
        map[entity.guid] = normalizeTags(entity.tagsWithMetadata);
    });
    return map;
  }, [data]);

  return { data: tagsByGuid, loading: !!query && loading, error };
};

export default useWorkloadTags;

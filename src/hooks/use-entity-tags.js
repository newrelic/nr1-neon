import { useMemo } from 'react';
import { useEntitiesByGuidsQuery } from 'nr1';

// Fetches tags for an arbitrary set of entity guids and returns a
// `{ [guid]: [{ key, values: [string] }] }` map. Unlike `useWorkloadTags`
// (which is WorkloadEntity-scoped via `tagsWithMetadata`), this works for any
// entity — used to resolve owning-team tags (`nr.teamGuid`/`team`) for the
// entities an issue involves, which aren't otherwise hydrated.
const useEntityTags = (guids = []) => {
  const skip = guids.length === 0;

  const { data, loading, error } = useEntitiesByGuidsQuery({
    entityGuids: guids,
    skip,
  });

  const tagsByGuid = useMemo(() => {
    const map = {};
    (data?.entities || []).forEach((entity) => {
      if (entity?.guid)
        map[entity.guid] = (entity.tags || []).map((tag) => ({
          key: tag.key,
          values: tag.values,
        }));
    });
    return map;
  }, [data]);

  return { data: tagsByGuid, loading: !skip && loading, error };
};

export default useEntityTags;

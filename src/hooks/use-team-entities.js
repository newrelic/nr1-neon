import { useMemo } from 'react';
import { useEntitiesByGuidsQuery } from 'nr1';

// Hydrates a set of Team entity guids (domain=NGEP, type=TEAM) into a
// `{ [guid]: { guid, name, accountId } }` map. These guids come from the
// NR-managed `nr.teamGuid` tag stamped on owned entities by NR's Entity
// Ownership discovery service, so we can resolve the real Team entity (and
// link to it) instead of relying on the human-readable `team` tag value.
const useTeamEntities = (teamGuids = []) => {
  const skip = teamGuids.length === 0;

  const { data, loading, error } = useEntitiesByGuidsQuery({
    entityGuids: teamGuids,
    skip,
  });

  const teamsByGuid = useMemo(() => {
    const map = {};
    (data?.entities || []).forEach((entity) => {
      if (entity?.guid)
        map[entity.guid] = {
          guid: entity.guid,
          name: entity.name,
          accountId: entity.accountId,
        };
    });
    return map;
  }, [data]);

  return { data: teamsByGuid, loading: !skip && loading, error };
};

export default useTeamEntities;

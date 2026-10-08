import { useEffect, useMemo, useState } from 'react';
import { EntitiesByGuidsQuery, useEntitiesByGuidsQuery } from 'nr1';

import { ENTITIES_BY_GUIDS_LIMIT } from '../queries';
import { chunk, mapWithConcurrency } from '../utils';

const MAX_CONCURRENT_QUERIES = 4;
const IDLE = { sig: '', entities: [], error: null, loading: false };

// Drop-in for nr1's useEntitiesByGuidsQuery, which only accepts 25 guids.
// Up to that cap it *is* useEntitiesByGuidsQuery (so small sets keep the SDK's
// caching); above it, the guids are fetched in parallel 25-guid batches and
// merged into the same `{ data: { entities }, loading, error }` shape.
const useEntitiesByGuids = ({
  entityGuids = [],
  skip = false,
  entityFragmentExtension,
}) => {
  const overCap = entityGuids.length > ENTITIES_BY_GUIDS_LIMIT;

  const single = useEntitiesByGuidsQuery({
    entityGuids: overCap ? [] : entityGuids,
    skip: skip || overCap,
    entityFragmentExtension,
  });

  const sig = !skip && overCap ? entityGuids.join('|') : '';
  const [batched, setBatched] = useState(IDLE);

  useEffect(() => {
    if (!sig) return;
    let cancelled = false;
    setBatched({ ...IDLE, sig, loading: true });
    (async () => {
      try {
        const results = await mapWithConcurrency(
          chunk(entityGuids, ENTITIES_BY_GUIDS_LIMIT),
          MAX_CONCURRENT_QUERIES,
          (guids) =>
            EntitiesByGuidsQuery.query({
              entityGuids: guids,
              entityFragmentExtension,
            })
        );
        if (cancelled) return;
        setBatched({
          sig,
          entities: results.flatMap((r) => r?.data?.entities || []),
          error: results.find((r) => r?.error)?.error || null,
          loading: false,
        });
      } catch (error) {
        if (!cancelled) setBatched({ ...IDLE, sig, error });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sig, entityFragmentExtension]);

  // Only expose a batched result once it matches the current guids, so a
  // previous set's entities never show against a new one.
  const current = batched.sig === sig;
  const batchedData = useMemo(
    () => ({ entities: current ? batched.entities : [] }),
    [batched, current]
  );

  if (!overCap) return single;
  return {
    data: batchedData,
    loading: !skip && (!current || batched.loading),
    error: current ? batched.error : null,
  };
};

export default useEntitiesByGuids;

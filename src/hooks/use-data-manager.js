import { useCallback, useEffect, useRef, useState } from 'react';
import { NerdGraphQuery } from 'nr1';

import { loadWorkloadTree } from '../utils/workload-tree';

const EMPTY_RESULT = { data: [], loading: false, error: null };

// Loads the workload tree for `topLevelGuids` (see loadWorkloadTree). `data`
// is only published once the whole tree is in, and `loading` stays true until
// then — partial NerdGraph errors along the way don't end the load early.
const useDataManager = (topLevelGuids) => {
  const [result, setResult] = useState(EMPTY_RESULT);
  const [refreshKey, setRefreshKey] = useState(0);
  const startedSigRef = useRef(null);
  // Bumped per fetch (and on unmount) so a superseded load can't land.
  const fetchIdRef = useRef(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(
    () => () => {
      fetchIdRef.current += 1;
    },
    []
  );

  useEffect(() => {
    if (!topLevelGuids?.length) {
      // All workloads removed from the board: drop the previous tree rather
      // than keep showing it.
      if (startedSigRef.current !== null) {
        startedSigRef.current = null;
        fetchIdRef.current += 1;
        setResult(EMPTY_RESULT);
      }
      return;
    }

    // refreshKey is part of the sig so refresh() forces a fresh fetch even
    // when the topLevelGuids array contents are unchanged.
    const sig = `${topLevelGuids.join('|')}#${refreshKey}`;
    if (startedSigRef.current === sig) return;
    startedSigRef.current = sig;

    const fetchId = ++fetchIdRef.current;
    // A manual refresh must bypass the Apollo cache to pick up new statuses.
    const fetchPolicy =
      refreshKey > 0
        ? { fetchPolicyType: NerdGraphQuery.FETCH_POLICY_TYPE?.NETWORK_ONLY }
        : {};
    const runQuery = (query) => NerdGraphQuery.query({ query, ...fetchPolicy });

    setResult({ data: [], loading: true, error: null });
    (async () => {
      let next;
      try {
        next = await loadWorkloadTree(topLevelGuids, runQuery);
      } catch (error) {
        next = { data: [], error };
      }
      if (fetchId !== fetchIdRef.current) return;
      if (next.error) {
        // eslint-disable-next-line no-console
        console.error('[useDataManager] load failed', next.error);
      }
      setResult({ data: next.data, loading: false, error: next.error });
    })();
  }, [topLevelGuids, refreshKey]);

  // Bridge the gap between "we know there are guids to fetch" and "the start
  // effect above has actually flipped result.loading to true". Without this,
  // there's a render right after topLevelGuids becomes non-empty (or changes)
  // where result.loading is still false, which lets consumers briefly render an
  // empty/"no data" state before the fetch even kicks off. Once the fetch has
  // been started for the current guids (startedSigRef matches), loading follows
  // result.loading, so a genuinely-empty result still settles to loading:false.
  const wantsData = (topLevelGuids?.length ?? 0) > 0;
  const currentSig = `${(topLevelGuids || []).join('|')}#${refreshKey}`;
  const notYetStarted = startedSigRef.current !== currentSig;
  const loading = result.loading || (wantsData && notYetStarted);

  return { ...result, loading, refresh };
};

export default useDataManager;

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNerdGraphQuery } from 'nr1';

import {
  ACCOUNT_ALIAS_PREFIX,
  COLLECTION_BATCH_ALIAS_PREFIX,
  ENTITIES_BATCH_ALIAS_PREFIX,
  SEARCH_BATCH_ALIAS_PREFIX,
  queryCollectionsByAccount,
  queryEntitySearches,
  queryFromGuids,
} from '../queries';

const MAX_TREE_DEPTH = 10;
// EntitySearch returns at most 200 entities per page; we don't paginate yet,
// so log when we hit it as a signal that pagination may need adding.
const ENTITY_SEARCH_PAGE_LIMIT = 200;
const LOG_PREFIX = '[useDataManager]';

const logOutgoingQuery = (label, queryString) => {
  // eslint-disable-next-line no-console
  console.log(`${LOG_PREFIX} outgoing query (${label}):\n${queryString}`);
};

const collectBrokenWorkloads = (tree) => {
  const out = [];
  const walk = (nodes, depth) => {
    for (const node of nodes) {
      if (!node) continue;
      const isWorkload = depth === 0 || node.type === 'WORKLOAD';
      if (!isWorkload) continue;
      const childCount = Array.isArray(node.children)
        ? node.children.length
        : 0;
      const hasStatus = !!node.status && node.status !== 'UNKNOWN';
      if (childCount === 0 && !hasStatus) {
        out.push({ guid: node.guid, name: node.name, depth });
      }
      if (childCount > 0) walk(node.children, depth + 1);
    }
  };
  walk(tree, 0);
  return out;
};

const useDataManager = (topLevelGuids) => {
  const [result, setResult] = useState({
    data: [],
    loading: false,
    error: null,
  });
  const [query, setQuery] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const allWorkloadGuids = useRef(new Set());
  const allAccountIds = useRef(new Set());
  const visitedGuids = useRef(new Set());
  const isFetching = useRef(false);
  const dataTree = useRef([]);
  const guidLookup = useRef({});
  const treeLevel = useRef(1);
  const startedSigRef = useRef(null);
  const lastQueriedGuids = useRef([]);
  const nullRelatedByLevel = useRef({});
  const emptyResultsByLevel = useRef({});
  // 'fetching-level' | 'fetching-collections' | 'fetching-search' | 'idle'
  const currentPhase = useRef('idle');
  // Holds nextLevelWorkloadGuids from main level processing while a fallback
  // (Phase 1 + Phase 2) runs; combined with fallback-discovered guids before
  // advancing to the next level.
  const pendingNextLevel = useRef([]);
  // Phase 1 result handed to Phase 2: ordered [{ guid, query }, …].
  const pendingSearches = useRef([]);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const { error: queryError, data: queryData } = useNerdGraphQuery({
    query: query || '{ actor { user { timeZoneName } } }',
    skip: !query,
  });

  useEffect(() => {
    if (!topLevelGuids?.length) return;

    // refreshKey is part of the sig so refresh() forces a fresh fetch even
    // when the topLevelGuids array contents are unchanged.
    const sig = `${topLevelGuids.join('|')}#${refreshKey}`;
    if (startedSigRef.current === sig) return;
    startedSigRef.current = sig;

    // Reset all per-fetch state so a re-selection starts clean.
    treeLevel.current = 1;
    allWorkloadGuids.current = new Set();
    allAccountIds.current = new Set();
    visitedGuids.current = new Set();
    guidLookup.current = {};
    dataTree.current = [];
    lastQueriedGuids.current = topLevelGuids;
    nullRelatedByLevel.current = {};
    emptyResultsByLevel.current = {};
    currentPhase.current = 'fetching-level';
    pendingNextLevel.current = [];
    pendingSearches.current = [];
    isFetching.current = true;

    topLevelGuids.forEach((g) => visitedGuids.current.add(g));
    // eslint-disable-next-line no-console
    console.log(
      `${LOG_PREFIX} starting fetch: ${topLevelGuids.length} top-level workloads`
    );
    const initialQuery = queryFromGuids(topLevelGuids, treeLevel.current);
    logOutgoingQuery(`level ${treeLevel.current}`, initialQuery);
    setQuery(initialQuery);
    setResult({ data: [], loading: true, error: null });
  }, [topLevelGuids, refreshKey]);

  useEffect(() => {
    // ----- helpers (closures over refs) -----
    const finalizeLoad = () => {
      isFetching.current = false;
      currentPhase.current = 'idle';

      const totalNullRelated = Object.values(
        nullRelatedByLevel.current
      ).reduce((acc, list) => acc + list.length, 0);
      const totalEmptyResults = Object.values(
        emptyResultsByLevel.current
      ).reduce((acc, list) => acc + list.length, 0);

      // eslint-disable-next-line no-console
      console.log(
        `${LOG_PREFIX} done: ${allWorkloadGuids.current.size} workloads across ${allAccountIds.current.size} accounts, max depth ${treeLevel.current}`
      );
      if (totalNullRelated > 0) {
        // eslint-disable-next-line no-console
        console.warn(
          `${LOG_PREFIX} ${totalNullRelated} workload(s) had null relatedEntities. Per-level breakdown:`,
          nullRelatedByLevel.current
        );
      }
      if (totalEmptyResults > 0) {
        // eslint-disable-next-line no-console
        console.warn(
          `${LOG_PREFIX} ${totalEmptyResults} workload(s) had empty relatedEntities (entitySearchQuery fallback may have recovered some). Per-level breakdown:`,
          emptyResultsByLevel.current
        );
      }
      const broken = collectBrokenWorkloads(dataTree.current);
      if (broken.length > 0) {
        // eslint-disable-next-line no-console
        console.warn(
          `${LOG_PREFIX} ${broken.length} workload(s) appear broken (empty children AND unknown status — likely missing data in NerdGraph):`,
          broken
        );
      }
      setResult({
        data: [...dataTree.current],
        loading: false,
        error: null,
      });
    };

    const advanceAfterFallback = (newGuids) => {
      const combined = [...pendingNextLevel.current, ...newGuids];
      pendingNextLevel.current = [];

      const atDepthCap = treeLevel.current >= MAX_TREE_DEPTH;
      if (atDepthCap && combined.length > 0) {
        // eslint-disable-next-line no-console
        console.warn(
          `${LOG_PREFIX} hit MAX_TREE_DEPTH (${MAX_TREE_DEPTH}); ${combined.length} workload(s) not expanded`
        );
      }

      if (combined.length > 0 && !atDepthCap) {
        treeLevel.current += 1;
        lastQueriedGuids.current = combined;
        currentPhase.current = 'fetching-level';
        const nextQuery = queryFromGuids(combined, treeLevel.current);
        logOutgoingQuery(`level ${treeLevel.current}`, nextQuery);
        setQuery(nextQuery);
      } else {
        finalizeLoad();
      }
    };

    const formatEntity = (entity) => {
      if (entity?.type === 'WORKLOAD' && entity.guid) {
        allWorkloadGuids.current.add(entity.guid);
        if (entity.accountId) allAccountIds.current.add(entity.accountId);
      }
      return {
        alertSeverity: entity?.alertSeverity,
        domain: entity?.domain,
        guid: entity?.guid,
        name: entity?.name,
        type: entity?.type,
        accountId: entity?.accountId,
        status: entity?.workloadStatus?.statusValue || 'UNKNOWN',
        tags: (entity?.tags || []).map((tag) => ({
          key: tag.key,
          values: tag.values,
        })),
        goldenMetrics: (entity?.goldenMetrics?.metrics || []).map((gm) => ({
          name: gm.name,
          query: gm.query,
          title: gm.title,
          unit: gm.unit,
        })),
        goldenTags: (entity?.goldenTags?.tags || []).map((gt) => gt?.key),
      };
    };

    // ----- Phase 1: WorkloadCollection.entitySearchQuery responses -----
    if (currentPhase.current === 'fetching-collections') {
      const actor = queryData?.actor || {};
      // Guard against an in-between queryData (e.g., level-1 response still
      // present, or briefly empty while the SDK transitions). Without this we
      // would prematurely advanceAfterFallback([]) and finalize the load.
      const hasResponse = Object.keys(actor).some((k) =>
        k.startsWith(ACCOUNT_ALIAS_PREFIX)
      );
      if (!hasResponse) return;

      const searches = [];
      let withoutSearchQuery = 0;

      for (const accountKey of Object.keys(actor)) {
        if (!accountKey.startsWith(ACCOUNT_ALIAS_PREFIX)) continue;
        const wlMap = actor[accountKey]?.workload;
        if (!wlMap) continue;
        for (const collKey of Object.keys(wlMap)) {
          if (!collKey.startsWith(COLLECTION_BATCH_ALIAS_PREFIX)) continue;
          const coll = wlMap[collKey];
          if (!coll?.guid) continue;
          if (coll.entitySearchQuery) {
            searches.push({
              guid: coll.guid,
              query: coll.entitySearchQuery,
            });
          } else {
            withoutSearchQuery += 1;
          }
        }
      }

      // eslint-disable-next-line no-console
      console.log(
        `${LOG_PREFIX} fallback collections: ${searches.length} entitySearchQueries fetched, ${withoutSearchQuery} workload(s) had no entitySearchQuery`
      );

      if (searches.length === 0) {
        advanceAfterFallback([]);
        return;
      }

      pendingSearches.current = searches;
      currentPhase.current = 'fetching-search';
      const searchQuery = queryEntitySearches(searches);
      logOutgoingQuery(
        `entitySearch (level ${treeLevel.current})`,
        searchQuery
      );
      setQuery(searchQuery);
      return;
    }

    // ----- Phase 2: actor.entitySearch responses -----
    if (currentPhase.current === 'fetching-search') {
      const actor = queryData?.actor || {};
      // Same in-between guard as Phase 1.
      const hasResponse = Object.keys(actor).some((k) =>
        k.startsWith(SEARCH_BATCH_ALIAS_PREFIX)
      );
      if (!hasResponse) return;

      const searches = pendingSearches.current;

      let recovered = 0;
      let stillEmpty = 0;
      let truncated = 0;
      const newWorkloadGuids = [];

      for (let i = 0; i < searches.length; i += 1) {
        const search = searches[i];
        const aliasKey = `${SEARCH_BATCH_ALIAS_PREFIX}${i}`;
        const searchData = actor[aliasKey];
        const path = guidLookup.current[search.guid];
        if (path === undefined) continue;

        let targetNode = dataTree.current;
        const pathArray = Array.isArray(path) ? path : [path];
        pathArray.forEach((idx, j) => {
          if (j === 0) targetNode = targetNode[idx];
          else targetNode = targetNode?.children?.[idx];
        });
        if (!targetNode) continue;

        const rawEntities = searchData?.results?.entities || [];
        if (rawEntities.length >= ENTITY_SEARCH_PAGE_LIMIT) truncated += 1;

        // Drop any self-reference: a workload's entitySearchQuery sometimes
        // matches its own entity, which would otherwise create a cycle.
        const filtered = rawEntities.filter(
          (e) => e?.guid && e.guid !== search.guid
        );

        if (filtered.length === 0) {
          stillEmpty += 1;
          continue;
        }

        const newChildren = filtered.map((e) => formatEntity(e));
        targetNode.children = newChildren;
        recovered += 1;

        newChildren.forEach((child, ncIdx) => {
          if (!child.guid) return;
          guidLookup.current[child.guid] = [...pathArray, ncIdx];
          if (
            child.type === 'WORKLOAD' &&
            !visitedGuids.current.has(child.guid)
          ) {
            visitedGuids.current.add(child.guid);
            newWorkloadGuids.push(child.guid);
          }
        });
      }

      // eslint-disable-next-line no-console
      console.log(
        `${LOG_PREFIX} fallback entitySearch: ${searches.length} searches, ${recovered} recovered, ${stillEmpty} still empty, ${truncated} hit page limit`
      );
      if (truncated > 0) {
        // eslint-disable-next-line no-console
        console.warn(
          `${LOG_PREFIX} ${truncated} workload(s) hit ENTITY_SEARCH_PAGE_LIMIT (${ENTITY_SEARCH_PAGE_LIMIT}); only first page of members shown`
        );
      }

      pendingSearches.current = [];
      advanceAfterFallback(newWorkloadGuids);
      return;
    }

    // ----- Default: a level (relatedEntities) response -----
    const batchPrefix = ENTITIES_BATCH_ALIAS_PREFIX(treeLevel.current);
    const actor = queryData?.actor || {};
    const currentEntities = Object.keys(actor)
      .filter((k) => k.startsWith(batchPrefix))
      .flatMap((k) => actor[k] || []);

    if (!currentEntities || currentEntities.length === 0) return;

    const nextLevelWorkloadGuids = [];
    let skippedDuplicates = 0;
    const nullRelatedAtThisLevel = [];
    const emptyResultsAtThisLevel = [];

    const noteRelatedEntitiesShape = (entity) => {
      if (entity?.relatedEntities == null) {
        nullRelatedAtThisLevel.push({
          guid: entity?.guid,
          name: entity?.name,
          accountId: entity?.accountId,
        });
      } else if ((entity.relatedEntities.results?.length ?? 0) === 0) {
        emptyResultsAtThisLevel.push({
          guid: entity?.guid,
          name: entity?.name,
          accountId: entity?.accountId,
        });
      }
    };

    const enqueueChild = (guid) => {
      if (visitedGuids.current.has(guid)) {
        skippedDuplicates += 1;
        return;
      }
      visitedGuids.current.add(guid);
      nextLevelWorkloadGuids.push(guid);
    };

    if (treeLevel.current === 1) {
      dataTree.current = currentEntities.map((parent, pIdx) => {
        allWorkloadGuids.current.add(parent.guid);
        if (parent.accountId) allAccountIds.current.add(parent.accountId);
        noteRelatedEntitiesShape(parent);

        const children = (parent.relatedEntities?.results || []).map((res) =>
          formatEntity(res.target?.entity)
        );

        guidLookup.current[parent.guid] = pIdx;

        children.forEach((child, cIdx) => {
          if (child.guid) {
            guidLookup.current[child.guid] = [pIdx, cIdx];
            if (child.type === 'WORKLOAD') enqueueChild(child.guid);
          }
        });

        return {
          accountId: parent.accountId,
          name: parent.name,
          guid: parent.guid,
          status: parent?.workloadStatus?.statusValue || 'UNKNOWN',
          children: children,
        };
      });
      // eslint-disable-next-line no-console
      console.log(
        `${LOG_PREFIX} top-level workloads (guid / name / accountId):`,
        dataTree.current.map(({ guid, name, accountId }) => ({
          guid,
          name,
          accountId,
        }))
      );
    } else {
      currentEntities.forEach((entityData) => {
        const path = guidLookup.current[entityData.guid];
        if (path === undefined) return;

        let targetNode = dataTree.current;
        const pathArray = Array.isArray(path) ? path : [path];
        pathArray.forEach((idx, i) => {
          if (i === 0) targetNode = targetNode[idx];
          else targetNode = targetNode.children[idx];
        });
        if (!targetNode) return;

        noteRelatedEntitiesShape(entityData);
        targetNode.accountId = entityData.accountId;
        targetNode.status =
          entityData?.workloadStatus?.statusValue || 'UNKNOWN';
        targetNode.children = (entityData.relatedEntities?.results || []).map(
          (res) => formatEntity(res.target?.entity)
        );

        targetNode.children.forEach((newChild, ncIdx) => {
          if (newChild.guid) {
            const newPath = [...pathArray, ncIdx];
            guidLookup.current[newChild.guid] = newPath;
            if (newChild.type === 'WORKLOAD') enqueueChild(newChild.guid);
          }
        });
      });
    }

    const expectedCount = lastQueriedGuids.current.length;
    const returnedGuids = new Set(currentEntities.map((e) => e?.guid));
    const missingFromResponse = lastQueriedGuids.current.filter(
      (g) => !returnedGuids.has(g)
    );

    if (nullRelatedAtThisLevel.length) {
      nullRelatedByLevel.current[treeLevel.current] = nullRelatedAtThisLevel;
    }
    if (emptyResultsAtThisLevel.length) {
      emptyResultsByLevel.current[treeLevel.current] = emptyResultsAtThisLevel;
    }

    // eslint-disable-next-line no-console
    console.log(
      `${LOG_PREFIX} level ${treeLevel.current}: processed ${currentEntities.length}/${expectedCount}, next ${nextLevelWorkloadGuids.length}, skipped ${skippedDuplicates} duplicate(s), ${nullRelatedAtThisLevel.length} null relatedEntities, ${emptyResultsAtThisLevel.length} empty results`
    );

    if (missingFromResponse.length) {
      // eslint-disable-next-line no-console
      console.warn(
        `${LOG_PREFIX} level ${treeLevel.current}: ${missingFromResponse.length} guid(s) queried but not returned by NerdGraph`,
        missingFromResponse
      );
    }
    if (nullRelatedAtThisLevel.length) {
      // eslint-disable-next-line no-console
      console.warn(
        `${LOG_PREFIX} level ${treeLevel.current}: ${nullRelatedAtThisLevel.length} workload(s) returned null relatedEntities (likely transient; will appear unclickable)`,
        nullRelatedAtThisLevel
      );
    }
    if (emptyResultsAtThisLevel.length) {
      // eslint-disable-next-line no-console
      console.warn(
        `${LOG_PREFIX} level ${treeLevel.current}: ${emptyResultsAtThisLevel.length} workload(s) returned empty results (will fall back to entitySearchQuery)`,
        emptyResultsAtThisLevel
      );
    }

    // Decide what's next. Empties with a known accountId trigger a fallback
    // pass; the regular nextLevelWorkloadGuids waits for that to complete
    // before advancing so all newly-discovered children flow into one query.
    const fallbackTargets = emptyResultsAtThisLevel.filter(
      (e) => e.accountId != null
    );

    if (fallbackTargets.length > 0) {
      pendingNextLevel.current = nextLevelWorkloadGuids;

      const workloadsByAccount = {};
      for (const e of fallbackTargets) {
        const list = workloadsByAccount[e.accountId] || [];
        list.push(e.guid);
        workloadsByAccount[e.accountId] = list;
      }
      currentPhase.current = 'fetching-collections';
      const collectionsQuery = queryCollectionsByAccount(workloadsByAccount);
      logOutgoingQuery(
        `collections (level ${treeLevel.current})`,
        collectionsQuery
      );
      setQuery(collectionsQuery);
      return;
    }

    const atDepthCap = treeLevel.current >= MAX_TREE_DEPTH;
    if (atDepthCap && nextLevelWorkloadGuids.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `${LOG_PREFIX} hit MAX_TREE_DEPTH (${MAX_TREE_DEPTH}); ${nextLevelWorkloadGuids.length} workload(s) not expanded`
      );
    }

    if (nextLevelWorkloadGuids.length > 0 && !atDepthCap) {
      treeLevel.current += 1;
      lastQueriedGuids.current = nextLevelWorkloadGuids;
      currentPhase.current = 'fetching-level';
      const nextQuery = queryFromGuids(
        nextLevelWorkloadGuids,
        treeLevel.current
      );
      logOutgoingQuery(`level ${treeLevel.current}`, nextQuery);
      setQuery(nextQuery);
    } else {
      finalizeLoad();
    }
  }, [queryData]);

  useEffect(() => {
    if (queryError) {
      // eslint-disable-next-line no-console
      console.error(
        `${LOG_PREFIX} query error at level ${treeLevel.current}`,
        queryError
      );
      setResult((prev) => ({ ...prev, loading: false, error: queryError }));
    }
  }, [queryError]);

  return { ...result, refresh };
};

export default useDataManager;

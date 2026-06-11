import { useCallback, useEffect, useRef, useState } from 'react';
import { useNerdGraphQuery } from 'nr1';

import {
  ENTITIES_BATCH_ALIAS_PREFIX,
  RETRY_BATCH_ALIAS_PREFIX,
  getWorkloadsStatusQuery,
  queryForRetry,
  queryFromGuids,
} from '../queries';

const MAX_TREE_DEPTH = 10;
const LOG_PREFIX = '[useDataManager]';

const logOutgoingQuery = (label, queryString) => {
  // eslint-disable-next-line no-console
  console.log(`${LOG_PREFIX} outgoing query (${label}):\n${queryString}`);
};

const collectBrokenWorkloads = (tree, guidsWithStatus) => {
  const out = [];
  const walk = (nodes, depth) => {
    for (const node of nodes) {
      if (!node) continue;
      const isWorkload = depth === 0 || node.type === 'WORKLOAD';
      if (!isWorkload) continue;
      const childCount = Array.isArray(node.children) ? node.children.length : 0;
      const hasStatus = guidsWithStatus.has(node.guid);
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
  const isRetrying = useRef(false);

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
    isRetrying.current = false;
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
    if (isRetrying.current) {
      const actor = queryData?.actor || {};
      const retryEntities = Object.keys(actor)
        .filter((k) => k.startsWith(RETRY_BATCH_ALIAS_PREFIX))
        .flatMap((k) => actor[k] || []);

      if (retryEntities.length === 0) return;

      // eslint-disable-next-line no-console
      console.log(
        `${LOG_PREFIX} retry response (guid / name / accountId / resultCount):`,
        retryEntities.map((e) => ({
          guid: e?.guid,
          name: e?.name,
          accountId: e?.accountId,
          resultCount: e?.relatedEntities?.results?.length ?? 'null',
        }))
      );

      let recovered = 0;
      let stillEmpty = 0;

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
          status: 'UNKNOWN',
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

      retryEntities.forEach((entityData) => {
        const path = guidLookup.current[entityData?.guid];
        if (path === undefined) return;

        let targetNode = dataTree.current;
        const pathArray = Array.isArray(path) ? path : [path];

        pathArray.forEach((idx, i) => {
          if (i === 0) targetNode = targetNode[idx];
          else targetNode = targetNode.children[idx];
        });

        const newChildren = (entityData.relatedEntities?.results || []).map(
          (res) => formatEntity(res.target?.entity)
        );

        if (newChildren.length > 0) {
          targetNode.children = newChildren;
          newChildren.forEach((child, ncIdx) => {
            if (child.guid) {
              guidLookup.current[child.guid] = [...pathArray, ncIdx];
            }
          });
          recovered += 1;
        } else {
          stillEmpty += 1;
        }
      });

      // eslint-disable-next-line no-console
      console.log(
        `${LOG_PREFIX} retry: ${retryEntities.length} retried, ${recovered} recovered, ${stillEmpty} still empty`
      );

      isRetrying.current = false;

      if (allWorkloadGuids.current.size > 0) {
        const statusQuery = getWorkloadsStatusQuery(
          Array.from(allWorkloadGuids.current),
          Array.from(allAccountIds.current)
        );
        logOutgoingQuery('status (post-retry)', statusQuery);
        setQuery(statusQuery);
      } else {
        isFetching.current = false;
        setResult({
          data: [...dataTree.current],
          loading: false,
          error: null,
        });
      }
      return;
    }

    const statusResults = queryData?.actor?.nrql?.results;
    if (statusResults) {
      const statusMap = Object.fromEntries(
        statusResults.map((res) => [res.facet, res['latest.statusValue']])
      );

      Object.keys(statusMap).forEach((guid) => {
        const path = guidLookup.current[guid];
        if (path === undefined) return;

        const pathArray = Array.isArray(path) ? path : [path];
        let targetNode = dataTree.current;

        pathArray.forEach((idx, i) => {
          if (i === 0) {
            targetNode = targetNode[idx];
          } else {
            targetNode = targetNode.children[idx];
          }
        });

        if (targetNode) {
          targetNode.status = statusMap[guid];
        }
      });

      isFetching.current = false;
      const guidsWithStatus = new Set(Object.keys(statusMap));
      const guidsMissingStatus = [...allWorkloadGuids.current].filter(
        (g) => !guidsWithStatus.has(g)
      );
      // eslint-disable-next-line no-console
      console.log(
        `${LOG_PREFIX} done: ${allWorkloadGuids.current.size} workloads across ${allAccountIds.current.size} accounts, max depth ${treeLevel.current}, status applied to ${guidsWithStatus.size}/${allWorkloadGuids.current.size}`
      );
      const totalNullRelated = Object.values(
        nullRelatedByLevel.current
      ).reduce((acc, list) => acc + list.length, 0);
      const totalEmptyResults = Object.values(
        emptyResultsByLevel.current
      ).reduce((acc, list) => acc + list.length, 0);
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
          `${LOG_PREFIX} ${totalEmptyResults} workload(s) had empty relatedEntities results. Per-level breakdown:`,
          emptyResultsByLevel.current
        );
      }
      if (guidsMissingStatus.length > 0) {
        // eslint-disable-next-line no-console
        console.warn(
          `${LOG_PREFIX} ${guidsMissingStatus.length} workload(s) did not receive a status update (will display UNKNOWN). Likely missing WorkloadStatus events or accountId not in query scope:`,
          guidsMissingStatus
        );
      }
      const broken = collectBrokenWorkloads(
        dataTree.current,
        guidsWithStatus
      );
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
      return;
    }

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
      // null/undefined relatedEntities → partial NerdGraph response (transient).
      // empty results array → workload returned but with no related entities.
      // Both produce empty children downstream; the cause is different.
      if (entity?.relatedEntities == null) {
        nullRelatedAtThisLevel.push({
          guid: entity?.guid,
          name: entity?.name,
        });
      } else if ((entity.relatedEntities.results?.length ?? 0) === 0) {
        emptyResultsAtThisLevel.push({
          guid: entity?.guid,
          name: entity?.name,
        });
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
        status: 'UNKNOWN',
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

        if (path !== undefined) {
          let targetNode = dataTree.current;
          const pathArray = Array.isArray(path) ? path : [path];

          pathArray.forEach((idx, i) => {
            if (i === 0) {
              targetNode = targetNode[idx];
            } else {
              targetNode = targetNode.children[idx];
            }
          });

          noteRelatedEntitiesShape(entityData);
          targetNode.accountId = entityData.accountId;
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
        }
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
        `${LOG_PREFIX} level ${treeLevel.current}: ${emptyResultsAtThisLevel.length} workload(s) returned empty results (no children; will appear unclickable)`,
        emptyResultsAtThisLevel
      );
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
      const nextQuery = queryFromGuids(
        nextLevelWorkloadGuids,
        treeLevel.current
      );
      logOutgoingQuery(`level ${treeLevel.current}`, nextQuery);
      setQuery(nextQuery);
    } else if (allWorkloadGuids.current.size > 0) {
      const retryGuids = [
        ...new Set(
          Object.values(emptyResultsByLevel.current)
            .flat()
            .map((e) => e?.guid)
            .filter(Boolean)
        ),
      ];
      if (retryGuids.length > 0) {
        isRetrying.current = true;
        // eslint-disable-next-line no-console
        console.log(
          `${LOG_PREFIX} retrying ${retryGuids.length} empty-results workload(s) with single-guid queries`
        );
        const retryQuery = queryForRetry(retryGuids);
        logOutgoingQuery('retry', retryQuery);
        setQuery(retryQuery);
      } else {
        const statusQuery = getWorkloadsStatusQuery(
          Array.from(allWorkloadGuids.current),
          Array.from(allAccountIds.current)
        );
        logOutgoingQuery('status', statusQuery);
        setQuery(statusQuery);
      }
    } else {
      isFetching.current = false;
      setResult({
        data: [...dataTree.current],
        loading: false,
        error: null,
      });
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

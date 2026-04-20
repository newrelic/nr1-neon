import { useEffect, useRef, useState } from 'react';
import { useNerdGraphQuery } from 'nr1';

import { ENTITY_FRAGMENT } from '../queries';

const queryFromGuids = (guids, idx) =>
  `{ actor { idx_${idx}: entities(guids: ["${guids.join(
    '", "'
  )}"]) { ${ENTITY_FRAGMENT} } } }`;

const useDataManager = (topLevelGuids) => {
  const [result, setResult] = useState({
    data: {},
    loading: false,
    error: null,
  });
  const [query, setQuery] = useState(null);
  const isFetching = useRef(false);
  const dataTree = useRef([]);
  const guidLookup = useRef({});
  const treeLevel = useRef(1);
  const { error: queryError, data: queryData } = useNerdGraphQuery({
    query: query || '{ actor { user { timeZoneName } } }',
    skip: !query,
  });

  useEffect(() => {
    if (topLevelGuids?.length && treeLevel.current === 1) {
      isFetching.current = true;
      setQuery(queryFromGuids(topLevelGuids, treeLevel.current));
    }
  }, [topLevelGuids]);

  useEffect(() => {
    const currentKey = `idx_${treeLevel.current}`;
    const currentEntities = queryData?.actor?.[currentKey];

    if (!currentEntities || currentEntities.length === 0) return;

    const nextLevelWorkloadGuids = [];
    const formatEntity = (entity) => ({
      alertSeverity: entity?.alertSeverity,
      domain: entity?.domain,
      guid: entity?.guid,
      name: entity?.name,
      type: entity?.type,
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
    });

    if (treeLevel.current === 1) {
      dataTree.current = currentEntities.map((parent, pIdx) => {
        const children = (parent.relatedEntities?.results || []).map((res) =>
          formatEntity(res.target?.entity)
        );

        guidLookup.current[parent.guid] = pIdx;

        children.forEach((child, cIdx) => {
          if (child.guid) {
            guidLookup.current[child.guid] = [pIdx, cIdx];
            if (child.type === 'WORKLOAD')
              nextLevelWorkloadGuids.push(child.guid);
          }
        });

        return {
          accountId: parent.accountId,
          name: parent.name,
          guid: parent.guid,
          children: children,
        };
      });
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

          targetNode.accountId = entityData.accountId;
          targetNode.children = (entityData.relatedEntities?.results || []).map(
            (res) => formatEntity(res.target?.entity)
          );

          targetNode.children.forEach((newChild, ncIdx) => {
            if (newChild.guid) {
              const newPath = [...pathArray, ncIdx];
              guidLookup.current[newChild.guid] = newPath;

              if (newChild.type === 'WORKLOAD') {
                nextLevelWorkloadGuids.push(newChild.guid);
              }
            }
          });
        }
      });
    }

    if (nextLevelWorkloadGuids.length > 0) {
      treeLevel.current += 1;
      setQuery(queryFromGuids(nextLevelWorkloadGuids, treeLevel.current));
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
      setResult((prev) => ({ ...prev, loading: false, error: queryError }));
    }
  }, [queryError]);

  return result;
};

export default useDataManager;

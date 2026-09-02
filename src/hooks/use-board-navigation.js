import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { navigation, useEntitiesByGuidsQuery } from 'nr1';

import { ENTITY_FRAGMENT_EXTENSION } from '../constants';

// Split a workload's children into sub-workloads (NR1:WORKLOAD) and leaf entities.
const splitChildren = (w) =>
  (w?.children || []).reduce(
    (acc, cur) =>
      cur.domain === 'NR1' && cur.type === 'WORKLOAD'
        ? { ...acc, workloadChilds: [...acc.workloadChilds, cur] }
        : { ...acc, entityChilds: [...acc.entityChilds, cur] },
    { workloadChilds: [], entityChilds: [] }
  );

// Replay a drill-down `path` (ordered workload guids) from the root grid, so a
// URL path can be turned back into { navigationStack, gridData, entities }.
// Stops early if a guid no longer resolves (workloads changed/removed), landing
// at the deepest still-valid level.
export const resolveNav = (rootGrid, path = []) => {
  let level = rootGrid || [];
  const navigationStack = [];
  let entities = [];
  for (const guid of path) {
    const node = level.find((n) => n.guid === guid);
    if (!node) break;
    const { workloadChilds, entityChilds } = splitChildren(node);
    navigationStack.push({ items: level, activeId: guid });
    level = workloadChilds;
    entities = entityChilds;
  }
  return { navigationStack, gridData: level, entities };
};

const pathOf = (navigationStack) => navigationStack.map((l) => l.activeId);

// In-board navigation with two-way URL sync. Click handlers update local state
// (instant, animated) AND record the step in urlState via setUrlState; effects
// reconcile local state back from urlState when the URL changes on its own
// (browser Back/Forward, or a deep link on mount). boardId (and any other key)
// is preserved because writes go through the functional-updater + spread form.
export const useBoardNavigation = ({
  rootGrid,
  data,
  issuesData,
  urlState,
  setUrlState,
}) => {
  const [gridData, setGridData] = useState([]);
  const [entities, setEntities] = useState([]);
  const [navigationStack, setNavigationStack] = useState([]);
  const [issuesWorkload, setIssuesWorkload] = useState(null);
  const [issuesEntity, setIssuesEntity] = useState(null);

  // Refs mirror state so callbacks can read current values without listing them
  // in dep arrays.
  const gridDataRef = useRef([]);
  gridDataRef.current = gridData;
  const navStackRef = useRef([]);
  navStackRef.current = navigationStack;
  const entitiesRef = useRef([]);
  entitiesRef.current = entities;
  // Tracks the (data, issuesData) that gridData currently reflects — see gridSynced.
  const syncedSourceRef = useRef({ data: null, issuesData: null });

  const path = useMemo(
    () => (Array.isArray(urlState?.path) ? urlState.path : []),
    [urlState]
  );
  const pathRef = useRef(path);
  pathRef.current = path;
  const pathKey = JSON.stringify(path);

  const tab = urlState?.tab ?? null;
  const issuesWorkloadGuid = urlState?.issuesWorkloadGuid ?? null;
  const issuesEntityGuid = urlState?.issuesEntityGuid ?? null;

  // setNerdletState merges, but write via the functional form + spread so we
  // never clobber boardId (or any other key another part of the app owns).
  const patchUrlState = useCallback(
    (patch) => setUrlState((prev) => ({ ...prev, ...patch })),
    [setUrlState]
  );

  // Single rebuild: resolve the URL path against the current root grid. Handles
  // initial load, data refresh, deep links and Back/Forward path changes.
  useEffect(() => {
    const resolved = resolveNav(rootGrid, pathRef.current);
    setGridData(resolved.gridData);
    setNavigationStack(resolved.navigationStack);
    setEntities(resolved.entities);
    syncedSourceRef.current = { data, issuesData };
  }, [rootGrid, pathKey]);

  // True once the rebuild above reflects the current data. While false, gridData
  // is stale/empty relative to `data`, so callers should still show loading
  // rather than flash an empty grid.
  const gridSynced =
    syncedSourceRef.current.data === data &&
    syncedSourceRef.current.issuesData === issuesData;

  // --- Entity hydration -----------------------------------------------------
  const entityGuids = useMemo(
    () => (entities || []).map((e) => e?.guid).filter(Boolean),
    [entities]
  );
  const { loading: entitiesHydrating, data: hydratedEntitiesData } =
    useEntitiesByGuidsQuery({
      entityGuids,
      skip: entityGuids.length === 0,
      entityFragmentExtension: ENTITY_FRAGMENT_EXTENSION,
    });

  // `entities` (pre-hydration) already carries per-entity `.issues` from the
  // mergeData/issuesTree pass, but hydratedEntitiesData doesn't — look up by guid.
  const entityIssuesByGuid = useMemo(
    () => new Map((entities || []).map((e) => [e?.guid, e?.issues ?? []])),
    [entities]
  );

  const hydratedEntities = useMemo(
    () =>
      (hydratedEntitiesData?.entities ?? []).map((entity) => ({
        alertSeverity: entity?.alertSeverity,
        domain: entity?.domain,
        guid: entity?.guid,
        name: entity?.name,
        type: entity?.type,
        accountId: entity?.accountId,
        status: 'UNKNOWN',
        issues: entityIssuesByGuid.get(entity?.guid) ?? [],
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
      })),
    [hydratedEntitiesData, entityIssuesByGuid]
  );
  const hydratedEntitiesRef = useRef([]);
  hydratedEntitiesRef.current = hydratedEntities;

  // --- Modal reconcile from URL (covers Back/Forward) -----------------------
  useEffect(() => {
    setIssuesWorkload(
      issuesWorkloadGuid
        ? gridDataRef.current.find((w) => w.guid === issuesWorkloadGuid) ?? null
        : null
    );
  }, [issuesWorkloadGuid, gridData]);

  useEffect(() => {
    setIssuesEntity(
      issuesEntityGuid
        ? hydratedEntitiesRef.current.find(
            (e) => e.guid === issuesEntityGuid
          ) ??
            entitiesRef.current.find((e) => e.guid === issuesEntityGuid) ??
            null
        : null
    );
  }, [issuesEntityGuid, hydratedEntities]);

  // --- Handlers (instant local update + URL patch) --------------------------
  const onCardClick = useCallback(
    (w) => {
      const { workloadChilds, entityChilds } = splitChildren(w);
      setNavigationStack((prev) => [
        ...prev,
        { items: gridDataRef.current, activeId: w.guid },
      ]);
      setGridData(workloadChilds);
      setEntities(entityChilds);
      patchUrlState({
        path: [...pathOf(navStackRef.current), w.guid],
        tab: null,
      });
    },
    [patchUrlState]
  );

  const onHomeClick = useCallback(() => {
    if (!navStackRef.current.length) return; // already at the top-most level
    const items = navStackRef.current[0].items;
    setNavigationStack([]);
    setGridData(items);
    setEntities([]);
    patchUrlState({ path: [], tab: null });
  }, [patchUrlState]);

  const onChipClick = useCallback(
    (depth, w) => {
      const { workloadChilds, entityChilds } = splitChildren(w);
      const currentPath = pathOf(navStackRef.current);
      const isLastRow = depth === navStackRef.current.length - 1;
      if (isLastRow) {
        setNavigationStack((prev) => [
          ...prev.slice(0, depth),
          { items: prev[depth].items, activeId: w.guid },
        ]);
        setGridData(workloadChilds);
        setEntities(entityChilds);
        patchUrlState({
          path: [...currentPath.slice(0, depth), w.guid],
          tab: null,
        });
        return;
      }
      if (workloadChilds.length) {
        setNavigationStack((prev) => [
          ...prev.slice(0, depth),
          { items: prev[depth].items, activeId: w.guid },
        ]);
        setGridData(workloadChilds);
        setEntities([]);
        patchUrlState({
          path: [...currentPath.slice(0, depth), w.guid],
          tab: null,
        });
      } else {
        const items = navStackRef.current[depth]?.items ?? [];
        setNavigationStack((prev) => prev.slice(0, depth));
        setGridData(items);
        setEntities([]);
        patchUrlState({ path: currentPath.slice(0, depth), tab: null });
      }
    },
    [patchUrlState]
  );

  const onIssuesClick = useCallback(
    (w) => {
      setIssuesWorkload(w);
      patchUrlState({ issuesWorkloadGuid: w?.guid ?? null });
    },
    [patchUrlState]
  );

  const onEntityClick = useCallback(
    (entity) => {
      setIssuesEntity(entity);
      patchUrlState({ issuesEntityGuid: entity?.guid ?? null });
    },
    [patchUrlState]
  );

  const onTabChange = useCallback(
    (value) => patchUrlState({ tab: value }),
    [patchUrlState]
  );

  const closeWorkloadIssues = useCallback(() => {
    setIssuesWorkload(null);
    patchUrlState({ issuesWorkloadGuid: null });
  }, [patchUrlState]);

  const closeEntityIssues = useCallback(() => {
    setIssuesEntity(null);
    patchUrlState({ issuesEntityGuid: null });
  }, [patchUrlState]);

  const openEntityInNewTab = useCallback((entity) => {
    const link = navigation.getOpenEntityLocation(entity?.guid, {
      platformState: { accountId: entity?.accountId },
    });
    // The nerdlet runs inside an NR1 iframe; ancestorOrigins provides the host origin needed to build an absolute URL.
    const ancestors = window.location.ancestorOrigins;
    const origin = ancestors[ancestors.length - 1];
    const url = `${origin}${link.pathname}${link.search || ''}`;
    window.open(url, '_blank');
  }, []);

  return {
    navigationStack,
    gridData,
    entities,
    hydratedEntities,
    entitiesHydrating,
    gridSynced,
    activeTab: tab,
    issuesWorkload,
    issuesEntity,
    onCardClick,
    onHomeClick,
    onChipClick,
    onIssuesClick,
    onEntityClick,
    onTabChange,
    closeWorkloadIssues,
    closeEntityIssues,
    openEntityInNewTab,
  };
};

export default useBoardNavigation;

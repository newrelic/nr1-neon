import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import PropTypes from 'prop-types';

import { EmptyState, PlatformStateContext, useNerdletState } from 'nr1';

import { BoardView } from '../../src/components';
import {
  useBoardChrome,
  useBoardData,
  useBoardNavigation,
  useEntityTags,
  useTeamEntities,
  useWorkloadTags,
} from '../../src/hooks';
import BoardNotFound from './board-not-found';

// Single board experience: wires the data, navigation (with URL sync) and
// chrome hooks together, owns the board-doc write actions and the
// Settings/Workloads modal open-state, and renders the presentational BoardView.
const Board = ({
  boardId,
  onBack,
  onDeleteBoard,
  defaultBoardId = null,
  defaultBoardTitle = null,
  onSetDefaultBoard,
}) => {
  const { accountId } = useContext(PlatformStateContext);
  const [urlState, setUrlState] = useNerdletState();

  const {
    docLoading,
    docError,
    docData,
    boardMissing,
    data,
    dataLoading,
    dataError,
    refreshData,
    issuesData,
    issuesLoading,
    issuesError,
    workloadGuids,
    rootGrid,
    writeBoard,
  } = useBoardData(boardId, accountId);

  const nav = useBoardNavigation({
    rootGrid,
    data,
    issuesData,
    urlState,
    setUrlState,
  });

  // Fetch the `team` ownership tag for whichever workloads are currently shown
  // in the grid, so their cards can surface an owning-team badge.
  const workloadGuidsInView = useMemo(
    () => (nav.gridData || []).map((w) => w?.guid).filter(Boolean),
    [nav.gridData]
  );
  const { data: tagsByGuid } = useWorkloadTags(workloadGuidsInView);

  // The entities that generate an open issues modal's issues are usually deep
  // descendants that aren't hydrated, so their tags aren't otherwise in scope.
  // Fetch tags for the union of every issue's `entityGuids` so each IssueRow
  // can show its owning-team pill.
  const issueEntityGuids = useMemo(() => {
    const guids = new Set();
    const issues = [
      ...(nav.issuesWorkload?.issues || []),
      ...(nav.issuesEntity?.issues || []),
    ];
    issues.forEach((issue) =>
      (issue?.entityGuids || []).filter(Boolean).forEach((g) => guids.add(g))
    );
    return [...guids];
  }, [nav.issuesWorkload, nav.issuesEntity]);
  const { data: issueEntityTagsByGuid } = useEntityTags(issueEntityGuids);

  // NR's Entity Ownership discovery stamps the owning Team entity's guid onto
  // each entity as an `nr.teamGuid` tag (multi-valued). Collect those guids —
  // from the workloads in view, the hydrated child entities, and the entities
  // behind the open issues modal — and hydrate them into real Team entities so
  // the badge can show the team name and link through to the entity.
  const teamGuids = useMemo(() => {
    const guids = new Set();
    const collect = (tags) =>
      (tags || [])
        .find((t) => t?.key === 'nr.teamGuid')
        ?.values?.filter(Boolean)
        .forEach((g) => guids.add(g));
    Object.values(tagsByGuid || {}).forEach(collect);
    (nav.hydratedEntities || []).forEach((e) => collect(e?.tags));
    Object.values(issueEntityTagsByGuid || {}).forEach(collect);
    return [...guids];
  }, [tagsByGuid, nav.hydratedEntities, issueEntityTagsByGuid]);
  const { data: teamEntitiesByGuid } = useTeamEntities(teamGuids);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isWorkloadsModalOpen, setIsWorkloadsModalOpen] = useState(false);
  const openSettingsModal = useCallback(() => setIsSettingsModalOpen(true), []);
  const openWorkloadsModal = useCallback(
    () => setIsWorkloadsModalOpen(true),
    []
  );

  // Per-card KPI editing. KPI definitions are stored normalized on the board doc
  // (`kpis` keyed by id) and referenced per card by `cardKpis` (workload guid ->
  // ordered ids), so a definition can be shared across cards. Resolve that back
  // into a guid -> [def,...] map for rendering.
  const [editingCardGuid, setEditingCardGuid] = useState(null);
  const kpisByGuid = useMemo(() => {
    const defs = docData?.kpis || {};
    const byCard = docData?.cardKpis || {};
    const out = {};
    Object.entries(byCard).forEach(([guid, ids]) => {
      out[guid] = (ids || []).map((id) => defs[id]).filter(Boolean);
    });
    return out;
  }, [docData]);

  // Per-card hero KPI (workload guid -> kpiId), featured as a big-number chart.
  const kpiHeroByGuid = useMemo(() => docData?.cardHeroKpis || {}, [docData]);

  // Per-card pinned KPIs (workload guid -> [kpiId]); pinned KPIs stay visible
  // even when a card is collapsed.
  const kpiPinnedByGuid = useMemo(
    () => docData?.cardPinnedKpis || {},
    [docData]
  );

  // Board-level "Expand all" / "Collapse all". `expandToken` is bumped on each
  // action to broadcast the new target state to every card without clobbering
  // per-card toggles in between.
  const [allExpanded, setAllExpanded] = useState(false);
  const [expandToken, setExpandToken] = useState(0);
  const toggleExpandAll = useCallback(() => {
    setAllExpanded((prev) => !prev);
    setExpandToken((t) => t + 1);
  }, []);

  const openCardSettings = useCallback(
    (workload) => setEditingCardGuid(workload?.guid || null),
    []
  );
  const setCardSettingsOpen = useCallback((open) => {
    if (!open) setEditingCardGuid(null);
  }, []);

  const editingCardName = useMemo(() => {
    if (!editingCardGuid) return '';
    const match = (nav.gridData || []).find((w) => w?.guid === editingCardGuid);
    return match?.name || '';
  }, [editingCardGuid, nav.gridData]);

  // Persist the working KPI list (ordered) plus the card's hero and pinned
  // selections: upsert its defs into the shared `kpis` map, set this card's
  // ordered id list / hero / pinned ids, then prune anything the card no longer
  // references.
  const saveCardKpis = useCallback(
    async ({ kpis: workingKpis = [], heroId, pinnedIds = [] } = {}) => {
      const guid = editingCardGuid;
      if (!guid) return {};

      const nextDefs = { ...(docData?.kpis || {}) };
      workingKpis.forEach((k) => {
        nextDefs[k.id] = {
          id: k.id,
          label: k.label,
          accountId: k.accountId,
          query: k.query,
        };
      });

      const onCard = new Set(workingKpis.map((k) => k.id));
      const nextCardKpis = { ...(docData?.cardKpis || {}) };
      const nextCardHeroKpis = { ...(docData?.cardHeroKpis || {}) };
      const nextCardPinnedKpis = { ...(docData?.cardPinnedKpis || {}) };
      const heroOnCard = heroId && onCard.has(heroId) ? heroId : null;
      const pinnedOnCard = (pinnedIds || []).filter((id) => onCard.has(id));
      if (workingKpis.length > 0) {
        nextCardKpis[guid] = workingKpis.map((k) => k.id);
        if (heroOnCard) nextCardHeroKpis[guid] = heroOnCard;
        else delete nextCardHeroKpis[guid];
        if (pinnedOnCard.length > 0) nextCardPinnedKpis[guid] = pinnedOnCard;
        else delete nextCardPinnedKpis[guid];
      } else {
        // No KPIs left on the card — drop its ordering, hero and pins entirely.
        delete nextCardKpis[guid];
        delete nextCardHeroKpis[guid];
        delete nextCardPinnedKpis[guid];
      }

      const referenced = new Set();
      Object.values(nextCardKpis).forEach((ids) =>
        (ids || []).forEach((id) => referenced.add(id))
      );
      Object.keys(nextDefs).forEach((id) => {
        if (!referenced.has(id)) delete nextDefs[id];
      });

      const { error } = await writeBoard({
        kpis: nextDefs,
        cardKpis: nextCardKpis,
        cardHeroKpis: nextCardHeroKpis,
        cardPinnedKpis: nextCardPinnedKpis,
      });
      if (error) console.error('Unable to save KPIs', error);
      return { error };
    },
    [editingCardGuid, docData, writeBoard]
  );

  useBoardChrome({
    boardMissing,
    docLoading,
    title: docData?.title,
    onRefresh: refreshData,
    onOpenWorkloads: openWorkloadsModal,
    onOpenSettings: openSettingsModal,
    allExpanded,
    onToggleExpandAll: toggleExpandAll,
  });

  useEffect(() => {
    if (docError) console.log('Error fetching board', docError);
    if (dataError) console.log('Error fetching statuses', dataError);
    if (issuesError) console.log('Error fetching issues', issuesError);
  }, [docError, dataError, issuesError]);

  const saveWorkloads = useCallback(
    async ({ workloads }) => {
      const { error } = await writeBoard({
        start: workloads?.map(({ accountId, guid, name }) => ({
          accountId,
          guid,
          name,
        })),
      });
      if (error) console.error('Unable to save workloads', error);
      return { error };
    },
    [writeBoard]
  );

  const saveBoardMeta = useCallback(
    async ({ title, description, hideUnacknowledged }) => {
      const { error } = await writeBoard({
        title,
        description,
        hideUnacknowledged: !!hideUnacknowledged,
      });
      if (error) console.error('Unable to save settings', error);
      return { error };
    },
    [writeBoard]
  );

  // Deletion is owned by the parent (NexusNerdlet): it redirects to the listing
  // immediately, soft-deletes the board, and shows an undoable toast. We just
  // hand over the current board document so it can be archived/restored.
  const deleteBoard = useCallback(
    () => onDeleteBoard?.({ ...(docData || {}), id: boardId }),
    [onDeleteBoard, docData, boardId]
  );

  const isDefaultBoard = defaultBoardId === boardId;
  const handleSetDefault = useCallback(
    (makeDefault) => onSetDefaultBoard?.(makeDefault ? boardId : null),
    [boardId, onSetDefaultBoard]
  );

  // Show the loading state until the board is genuinely ready: the doc is
  // loading, data is loading, or the board has workloads whose grid hasn't been
  // built yet. That last case covers the render between `data` resolving and the
  // rebuild effect running, which would otherwise flash the empty-grid state.
  const preparingContent =
    !boardMissing &&
    (dataLoading || (workloadGuids.length > 0 && !nav.gridSynced));

  if (docLoading || preparingContent)
    return (
      <EmptyState
        fullHeight
        fullWidth
        title="Setting up..."
        type={EmptyState.TYPE.LOADING}
      />
    );

  if (boardMissing) return <BoardNotFound onBack={onBack} />;

  return (
    <BoardView
      navigationStack={nav.navigationStack}
      gridData={nav.gridData}
      tagsByGuid={tagsByGuid}
      teamEntitiesByGuid={teamEntitiesByGuid}
      issueEntityTagsByGuid={issueEntityTagsByGuid}
      kpisByGuid={kpisByGuid}
      kpiHeroByGuid={kpiHeroByGuid}
      kpiPinnedByGuid={kpiPinnedByGuid}
      allExpanded={allExpanded}
      expandToken={expandToken}
      onTeamClick={nav.openEntityInNewTab}
      onEditCard={openCardSettings}
      entities={nav.entities}
      hydratedEntities={nav.hydratedEntities}
      entitiesHydrating={nav.entitiesHydrating}
      activeTab={nav.activeTab}
      dataLoading={dataLoading}
      issuesLoading={issuesLoading}
      hideUnacknowledged={!!docData?.hideUnacknowledged}
      onCardClick={nav.onCardClick}
      onIssuesClick={nav.onIssuesClick}
      onChipClick={nav.onChipClick}
      onHomeClick={nav.onHomeClick}
      onEntityClick={nav.onEntityClick}
      onTabChange={nav.onTabChange}
      onOpenWorkloads={openWorkloadsModal}
      issuesWorkload={nav.issuesWorkload}
      entityNameByGuid={nav.entityNameByGuid}
      workloadAncestorNames={nav.workloadAncestorNames}
      onCloseWorkloadIssues={nav.closeWorkloadIssues}
      issuesEntity={nav.issuesEntity}
      onCloseEntityIssues={nav.closeEntityIssues}
      onOpenEntity={nav.openEntityInNewTab}
      settingsModal={{
        onSave: saveBoardMeta,
        onDelete: deleteBoard,
        onSetDefault: handleSetDefault,
        isOpen: isSettingsModalOpen,
        setIsOpen: setIsSettingsModalOpen,
        savedTitle: docData?.title ?? '',
        savedDescription: docData?.description ?? '',
        savedHideUnacknowledged: !!docData?.hideUnacknowledged,
        savedIsDefault: isDefaultBoard,
        otherDefaultBoardTitle: isDefaultBoard ? null : defaultBoardTitle,
      }}
      workloadsModal={{
        onSave: saveWorkloads,
        isOpen: isWorkloadsModalOpen,
        setIsOpen: setIsWorkloadsModalOpen,
        savedWorkloads: docData?.start ?? [],
      }}
      cardSettingsModal={{
        onSave: saveCardKpis,
        isOpen: !!editingCardGuid,
        setIsOpen: setCardSettingsOpen,
        workloadName: editingCardName,
        savedKpis: editingCardGuid ? kpisByGuid[editingCardGuid] ?? [] : [],
        savedHeroId: editingCardGuid
          ? kpiHeroByGuid[editingCardGuid]
          : undefined,
        savedPinnedIds: editingCardGuid
          ? kpiPinnedByGuid[editingCardGuid]
          : undefined,
        defaultAccountId: accountId,
      }}
    />
  );
};

Board.propTypes = {
  boardId: PropTypes.string,
  onBack: PropTypes.func,
  onDeleteBoard: PropTypes.func,
  defaultBoardId: PropTypes.string,
  defaultBoardTitle: PropTypes.string,
  onSetDefaultBoard: PropTypes.func,
};

export default Board;

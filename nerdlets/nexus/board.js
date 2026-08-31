import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';

import {
  EmptyState,
  Icon,
  navigation,
  nerdlet,
  PlatformStateContext,
  useAccountStorageMutation,
  useAccountStorageQuery,
  useEntitiesByGuidsQuery,
} from 'nr1';

import {
  Breadcrumb,
  EntitiesView,
  IssuesList,
  Modal,
  SettingsModal,
  WorkloadGrid,
  WorkloadsModal,
} from '../../src/components';
import { useAlertingEntitiesIssues, useDataManager } from '../../src/hooks';
import { mergeData } from '../../src/utils';
import { BOARDS_STORE, ENTITY_FRAGMENT_EXTENSION } from '../../src/constants';
import BoardNotFound from './board-not-found';

// Single board experience: the drill-down grid, entities, issues and settings.
// Reads/writes its own NerdStorage document keyed by `boardId`.
const Board = ({
  boardId,
  onBack,
  onDeleteBoard,
  defaultBoardId = null,
  defaultBoardTitle = null,
  onSetDefaultBoard,
}) => {
  const [gridData, setGridData] = useState([]);
  const [entities, setEntities] = useState([]);
  const [navigationStack, setNavigationStack] = useState([]);
  // Refs mirror state so callbacks can read current values without listing them in dep arrays.
  const gridDataRef = useRef([]);
  gridDataRef.current = gridData;
  const navStackRef = useRef([]);
  navStackRef.current = navigationStack;
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isWorkloadsModalOpen, setIsWorkloadsModalOpen] = useState(false);
  const [issuesWorkload, setIssuesWorkload] = useState(null);
  const [issuesEntity, setIssuesEntity] = useState(null);
  const { accountId } = useContext(PlatformStateContext);
  const {
    loading: docLoading,
    error: docError,
    data: docData,
  } = useAccountStorageQuery({
    accountId,
    ...BOARDS_STORE,
    documentId: boardId,
    skip: !accountId || !boardId,
  });
  const [docWrite] = useAccountStorageMutation({
    actionType: useAccountStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
  });
  const workloadGuids = useMemo(
    () => docData?.start?.map(({ guid }) => guid) || [],
    [docData]
  );
  const {
    loading: dataLoading,
    error: dataError,
    data,
    refresh: refreshData,
  } = useDataManager(workloadGuids);
  const {
    data: issuesData,
    loading: issuesLoading,
    error: issuesError,
  } = useAlertingEntitiesIssues({
    data,
    skip: dataLoading || !data || data.length === 0,
  });
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

  // `entities` (pre-hydration) already carries per-entity `.issues` from the mergeData/issuesTree
  // pass, but hydratedEntitiesData (from useEntitiesByGuidsQuery) doesn't — look issues up by guid.
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

  const openSettingsModal = useCallback(() => setIsSettingsModalOpen(true), []);
  const openWorkloadsModal = useCallback(
    () => setIsWorkloadsModalOpen(true),
    []
  );

  // A board document is missing once the query has settled with no data.
  const boardMissing = !docLoading && !docError && !docData;

  useEffect(() => {
    if (docLoading) return; // wait until we know whether the board exists

    // Board-not-found: revert the platform header to the Nexus default (no board
    // name) rather than leaving a stale/placeholder title behind.
    if (boardMissing) {
      nerdlet.setConfig({
        accountPicker: true,
        accountPickerValues: [...nerdlet.ACCOUNT_PICKER_DEFAULT_VALUES],
        timePicker: false,
        actionControls: false,
        actionControlButtons: [],
        headerTitle: 'Nexus',
        headerParentTitle: undefined,
        headerParentLocation: undefined,
      });
      return;
    }

    nerdlet.setConfig({
      accountPicker: true,
      accountPickerValues: [...nerdlet.ACCOUNT_PICKER_DEFAULT_VALUES],
      actionControls: true,
      actionControlButtons: [
        {
          label: 'Refresh',
          hint: 'Reload all workload data',
          iconType: Icon.TYPE.INTERFACE__OPERATIONS__REDO,
          onClick: refreshData,
        },
        {
          label: 'Workloads',
          hint: 'Choose the workloads shown on this board',
          iconType: Icon.TYPE.HARDWARE_AND_SOFTWARE__SOFTWARE__WORKLOADS,
          onClick: openWorkloadsModal,
        },
        {
          label: 'Settings',
          hint: 'Edit settings for the board',
          iconType: Icon.TYPE.INTERFACE__OPERATIONS__CONFIGURE,
          onClick: openSettingsModal,
        },
      ],
      timePicker: false,
      headerTitle: docData?.title || 'Nexus',
      headerParentTitle: 'Nexus',
      // getOpenNerdletLocation returns a location descriptor WITHOUT navigating.
      // openNerdlet() would navigate immediately on mount and wipe boardId.
      headerParentLocation: navigation.getOpenNerdletLocation({
        id: 'nexus',
        urlState: { boardId: null },
      }),
    });
  }, [
    openSettingsModal,
    openWorkloadsModal,
    refreshData,
    docData?.title,
    boardMissing,
    docLoading,
  ]);

  useEffect(() => {
    setGridData(() => mergeData(data, issuesData));
    setNavigationStack([]); // clear drill-down on every data refresh so stale nav state doesn't survive account switches
    setEntities([]);
  }, [data, issuesData]);

  useEffect(() => {
    if (docError) console.log('Error fetching board', docError);
    if (dataError) console.log('Error fetching statuses', dataError);
    if (issuesError) console.log('Error fetching issues', issuesError);
  }, [docError, dataError, issuesError]);

  const gridClickHandler = useCallback((w) => {
    const { workloadChilds, entityChilds } = (w?.children || []).reduce(
      (acc, cur) =>
        cur.domain === 'NR1' && cur.type === 'WORKLOAD'
          ? {
              ...acc,
              workloadChilds: [...acc.workloadChilds, cur],
            }
          : {
              ...acc,
              entityChilds: [...acc.entityChilds, cur],
            },
      { workloadChilds: [], entityChilds: [] }
    );
    setNavigationStack((prev) => [
      ...prev,
      { items: gridDataRef.current, activeId: w.guid },
    ]);
    setGridData(workloadChilds);
    setEntities(entityChilds);
  }, []);

  const breadcrumbHomeClickHandler = useCallback(() => {
    if (!navStackRef.current.length) return; // already at the top-most level
    const items = navStackRef.current[0].items;
    setNavigationStack([]);
    setGridData(items);
    setEntities([]);
  }, []);

  const breadcrumbClickHandler = useCallback((depth, w) => {
    const { workloadChilds, entityChilds } = (w?.children || []).reduce(
      (acc, cur) =>
        cur.domain === 'NR1' && cur.type === 'WORKLOAD'
          ? { ...acc, workloadChilds: [...acc.workloadChilds, cur] }
          : { ...acc, entityChilds: [...acc.entityChilds, cur] },
      { workloadChilds: [], entityChilds: [] }
    );
    const isLastRow = depth === navStackRef.current.length - 1;
    if (isLastRow) {
      setNavigationStack((prev) => [
        ...prev.slice(0, depth),
        { items: prev[depth].items, activeId: w.guid },
      ]);
      setGridData(workloadChilds);
      setEntities(entityChilds);
      return;
    }
    if (workloadChilds.length) {
      setNavigationStack((prev) => [
        ...prev.slice(0, depth),
        { items: prev[depth].items, activeId: w.guid },
      ]);
      setGridData(workloadChilds);
      setEntities([]);
    } else {
      const items = navStackRef.current[depth]?.items ?? [];
      setNavigationStack((prev) => prev.slice(0, depth));
      setGridData(items);
      setEntities([]);
    }
  }, []);

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

  const entityClickHandler = useCallback(
    (entity) => setIssuesEntity(entity),
    []
  );

  // Merge-write the board doc: preserve identity/metadata, patch only the given fields.
  const writeBoard = useCallback(
    async (patch) => {
      const { error } = await docWrite({
        accountId,
        ...BOARDS_STORE,
        documentId: boardId,
        document: { ...(docData || {}), id: boardId, ...patch },
      });
      return { error };
    },
    [accountId, boardId, docData, docWrite]
  );

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

  const openIssuesModal = useCallback((w) => setIssuesWorkload(w), []);

  const currentView = useMemo(() => {
    if (gridData?.length || entities?.length || navigationStack.length > 0)
      return (
        <div className="container">
          <div className="main">
            <Breadcrumb
              levels={navigationStack}
              onChipClick={breadcrumbClickHandler}
              onHomeClick={breadcrumbHomeClickHandler}
            />
            <WorkloadGrid
              workloads={gridData}
              issuesLoading={dataLoading || issuesLoading}
              hideUnacknowledged={!!docData?.hideUnacknowledged}
              onCardClick={gridClickHandler}
              onIssuesClick={openIssuesModal}
            />
            <EntitiesView
              entities={hydratedEntities}
              loading={entitiesHydrating}
              onEntityClick={entityClickHandler}
            />
          </div>
        </div>
      );

    return (
      <EmptyState
        fullHeight
        fullWidth
        type={EmptyState.TYPE.USER_CLEARED}
        illustrationType={EmptyState.ILLUSTRATION_TYPE.ILLUSTRATION_03}
        title="Nothing brewing. Yet."
        description="No Workloads. To get started, click the Workloads button."
        action={{ label: 'Workloads', onClick: openWorkloadsModal }}
      />
    );
  }, [
    gridData,
    entities,
    hydratedEntities,
    entitiesHydrating,
    navigationStack,
    dataLoading,
    issuesLoading,
    docData?.hideUnacknowledged,
    gridClickHandler,
    breadcrumbClickHandler,
    breadcrumbHomeClickHandler,
    entityClickHandler,
    openWorkloadsModal,
    openIssuesModal,
  ]);

  if (docLoading || (dataLoading && !boardMissing))
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
    <>
      {currentView}
      <SettingsModal
        onSave={saveBoardMeta}
        onDelete={deleteBoard}
        onSetDefault={handleSetDefault}
        isSettingsModalOpen={isSettingsModalOpen}
        setIsSettingsModalOpen={setIsSettingsModalOpen}
        savedTitle={docData?.title ?? ''}
        savedDescription={docData?.description ?? ''}
        savedHideUnacknowledged={!!docData?.hideUnacknowledged}
        savedIsDefault={isDefaultBoard}
        otherDefaultBoardTitle={isDefaultBoard ? null : defaultBoardTitle}
      />
      <WorkloadsModal
        onSave={saveWorkloads}
        isWorkloadsModalOpen={isWorkloadsModalOpen}
        setIsWorkloadsModalOpen={setIsWorkloadsModalOpen}
        savedWorkloads={docData?.start ?? []}
      />
      <Modal
        hidden={!issuesWorkload}
        onClose={() => setIssuesWorkload(null)}
        style={{ '--modal-width': '480px', '--modal-padding': '0' }}
      >
        <IssuesList workload={issuesWorkload} />
      </Modal>
      <Modal
        hidden={!issuesEntity}
        onClose={() => setIssuesEntity(null)}
        style={{ '--modal-width': '480px', '--modal-padding': '0' }}
      >
        <IssuesList
          workload={{ ...issuesEntity, status: issuesEntity?.alertSeverity }}
          subjectLabel="Entity"
          onOpenEntity={() => openEntityInNewTab(issuesEntity)}
        />
      </Modal>
    </>
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

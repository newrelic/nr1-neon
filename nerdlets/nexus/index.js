import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  EmptyState,
  Icon,
  navigation,
  nerdlet,
  PlatformStateContext,
  SectionMessage,
  useAccountsQuery,
  useAccountStorageMutation,
  useAccountStorageQuery,
  useEntitiesByGuidsQuery,
  useUserStorageMutation,
  useUserStorageQuery,
} from 'nr1';

import {
  Breadcrumb,
  EntitiesView,
  IssuesList,
  Modal,
  SettingsModal,
  WorkloadGrid,
} from '../../src/components';
import { useAlertingEntitiesIssues, useDataManager } from '../../src/hooks';
import { AppContext } from '../../src/contexts';
import { mergeData } from '../../src/utils';
import {
  DOC_STORE,
  ENTITY_FRAGMENT_EXTENSION,
  USER_PREFS_STORE,
} from '../../src/constants';

const NexusNerdlet = () => {
  const [gridData, setGridData] = useState([]);
  const [entities, setEntities] = useState([]);
  const [navigationStack, setNavigationStack] = useState([]);
  const [app, setApp] = useState({});
  // Refs mirror state so callbacks can read current values without listing them in dep arrays.
  const gridDataRef = useRef([]);
  gridDataRef.current = gridData;
  const navStackRef = useRef([]);
  navStackRef.current = navigationStack;
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [issuesWorkload, setIssuesWorkload] = useState(null);
  const [issuesEntity, setIssuesEntity] = useState(null);
  const { data: userPrefs, loading: userPrefsLoading } =
    useUserStorageQuery(USER_PREFS_STORE);
  const [writeUserPrefs] = useUserStorageMutation({
    actionType: useUserStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
  });
  const [deleteUserPrefs] = useUserStorageMutation({
    actionType: useUserStorageMutation.ACTION_TYPE.DELETE_DOCUMENT,
  });
  const { accountId } = useContext(PlatformStateContext);
  const {
    loading: docLoading,
    error: docError,
    data: docData,
  } = useAccountStorageQuery({
    accountId,
    ...DOC_STORE,
    skip: !accountId,
  });
  const [docWrite] = useAccountStorageMutation({
    actionType: useAccountStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
  });
  const [docDelete] = useAccountStorageMutation({
    actionType: useAccountStorageMutation.ACTION_TYPE.DELETE_DOCUMENT,
  });
  const { data: accts = [], loading: isAcctsLoading } = useAccountsQuery();
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

  useEffect(() => {
    if (!isAcctsLoading) {
      const { account, accounts } = accts.reduce(
        (acc, { id, name }) => {
          if (id === accountId) {
            acc.account = { id, name };
          }
          return {
            ...acc,
            accounts: [...acc.accounts, { id, name }],
          };
        },
        { account: {}, accounts: [] }
      );
      setApp((a) => ({
        ...a,
        account,
        accounts,
      }));
    }
  }, [accountId, accts, isAcctsLoading]);

  const openSettingsModal = useCallback(() => setIsSettingsModalOpen(true), []);

  useEffect(() => {
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
          label: 'Settings',
          hint: 'Edit settings for the board',
          iconType: Icon.TYPE.INTERFACE__OPERATIONS__CONFIGURE,
          onClick: openSettingsModal,
        },
      ],
      timePicker: false,
    });
  }, [openSettingsModal, refreshData]);

  useEffect(() => {
    setGridData(() => mergeData(data, issuesData));
    setNavigationStack([]); // clear drill-down on every data refresh so stale nav state doesn't survive account switches
    setEntities([]);
  }, [data, issuesData]);

  useEffect(() => {
    if (docError) console.log('Error fetching settings', docError);
    if (dataError) console.log('Error fetching statuses', dataError);
    if (issuesError) console.log('Error fetching issues', issuesError);
  }, [docError, dataError, issuesError]);

  useEffect(() => {
    if (!accountId) return;
    // Dev escape-hatch: call window.__neonResetSettings() from the browser console to wipe saved board settings.
    window.__neonResetSettings = async () => {
      const { error } = await docDelete({ accountId, ...DOC_STORE });
      if (error) {
        console.error('[neon] failed to reset settings', error);
        return error;
      }
      console.log('[neon] settings document deleted; reload to take effect');
      return null;
    };
    return () => {
      delete window.__neonResetSettings;
    };
  }, [accountId, docDelete]);

  useEffect(() => {
    // Dev escape-hatch: call window.__neonResetUserPrefs() from the browser console to reset per-user preferences.
    window.__neonResetUserPrefs = async () => {
      const { error } = await deleteUserPrefs(USER_PREFS_STORE);
      if (error) {
        console.error('[neon] failed to reset user prefs', error);
        return error;
      }
      console.log('[neon] user prefs document deleted; reload to take effect');
      return null;
    };
    return () => {
      delete window.__neonResetUserPrefs;
    };
  }, [deleteUserPrefs]);

  const gridClickHandler = useCallback(
    (w) => {
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
      // if (!workloadChilds.length) return;
      setNavigationStack((prev) => [
        ...prev,
        { items: gridDataRef.current, activeId: w.guid },
      ]);
      setGridData(workloadChilds);
      setEntities(entityChilds);
    },
    [issuesData]
  );

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

  const saveSettings = useCallback(
    async ({ workloads, hideUnacknowledged }) => {
      const { error } = await docWrite({
        accountId,
        ...DOC_STORE,
        document: {
          start: workloads?.map(({ accountId, guid, name }) => ({
            accountId,
            guid,
            name,
          })),
          hideUnacknowledged: !!hideUnacknowledged,
        },
      });

      if (error) console.error('Unable to save settings', error);
      return { error };
    },
    [accountId, docWrite]
  );

  const openIssuesModal = useCallback((w) => setIssuesWorkload(w), []);

  const switchToNeon = useCallback(
    () => navigation.openNerdlet({ id: 'neon-nerdlet' }),
    []
  );

  const dismissNexusBanner = useCallback(
    () =>
      writeUserPrefs({
        ...USER_PREFS_STORE,
        document: { ...(userPrefs || {}), nexusBannerDismissed: true },
      }),
    [userPrefs, writeUserPrefs]
  );

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
        description="No Workloads. To get started, click the Settings button."
        action={{ label: 'Settings', onClick: openSettingsModal }}
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
    openSettingsModal,
    openIssuesModal,
  ]);

  const nexusBanner = !userPrefsLoading && !userPrefs?.nexusBannerDismissed && (
    <SectionMessage
      title="Welcome to Nexus."
      description="Prefer the original Neon experience? You can switch back at any time."
      type={SectionMessage.TYPE.INFO}
      actions={[
        { label: 'Switch to Neon', onClick: switchToNeon },
        { label: 'Do not show again', onClick: dismissNexusBanner },
      ]}
    />
  );

  if (isAcctsLoading || docLoading || dataLoading)
    return (
      <>
        {nexusBanner}
        <EmptyState
          fullHeight
          fullWidth
          title="Setting up..."
          type={EmptyState.TYPE.LOADING}
        />
      </>
    );

  return (
    <AppContext.Provider value={app}>
      {nexusBanner}
      {currentView}
      <SettingsModal
        onSave={saveSettings}
        isSettingsModalOpen={isSettingsModalOpen}
        setIsSettingsModalOpen={setIsSettingsModalOpen}
        savedWorkloads={docData?.start ?? []}
        savedHideUnacknowledged={!!docData?.hideUnacknowledged}
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
    </AppContext.Provider>
  );
};

export default NexusNerdlet;

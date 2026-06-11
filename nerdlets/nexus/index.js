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
  useAccountsQuery,
  useAccountStorageMutation,
  useAccountStorageQuery,
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
import { DOC_STORE } from '../../src/constants';

const NexusNerdlet = () => {
  const [gridData, setGridData] = useState([]);
  const [entities, setEntities] = useState([]);
  const [navigationStack, setNavigationStack] = useState([]);
  const [app, setApp] = useState({});
  const gridDataRef = useRef([]);
  gridDataRef.current = gridData;
  const navStackRef = useRef([]);
  navStackRef.current = navigationStack;
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [issuesWorkload, setIssuesWorkload] = useState(null);
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
    setNavigationStack([]);
    setEntities([]);
  }, [data, issuesData]);

  useEffect(() => {
    if (docError) console.log('Error fetching settings', docError);
    if (dataError) console.log('Error fetching statuses', dataError);
    if (issuesError) console.log('Error fetching issues', issuesError);
  }, [docError, dataError, issuesError]);

  useEffect(() => {
    if (!accountId) return;
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
    const items = navStackRef.current[0]?.items ?? [];
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

  const entityClickHandler = useCallback((entity) => {
    navigation.openStackedEntity(entity?.guid);
  }, []);

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

  const openSettingsModal = useCallback(() => setIsSettingsModalOpen(true), []);

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
              entities={entities}
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

  if (isAcctsLoading || docLoading || dataLoading)
    return (
      <EmptyState
        fullHeight
        fullWidth
        title="Setting up..."
        type={EmptyState.TYPE.LOADING}
      />
    );

  return (
    <AppContext.Provider value={app}>
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
    </AppContext.Provider>
  );
};

export default NexusNerdlet;

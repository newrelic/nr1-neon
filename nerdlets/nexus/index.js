import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  EmptyState,
  Icon,
  nerdlet,
  PlatformStateContext,
  useAccountsQuery,
  useAccountStorageMutation,
  useAccountStorageQuery,
} from 'nr1';

import { SettingsModal, WorkloadGrid } from '../../src/components';
import { useAlertingEntitiesIssues, useDataManager } from '../../src/hooks';
import { AppContext } from '../../src/contexts';
import { mergeData } from '../../src/utils';
import { DOC_STORE } from '../../src/constants';

const NexusNerdlet = () => {
  const [gridData, setGridData] = useState([]);
  const [app, setApp] = useState({});
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const { accountId } = useContext(PlatformStateContext);
  const {
    loading: docLoading,
    error: docError,
    data: docData,
  } = useAccountStorageQuery({
    accountId,
    ...DOC_STORE,
  });
  const [docWrite] = useAccountStorageMutation({
    actionType: useAccountStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
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
          label: 'Settings',
          hint: 'Edit settings for the board',
          iconType: Icon.TYPE.INTERFACE__OPERATIONS__CONFIGURE,
          onClick: openSettingsModal,
        },
      ],
    });
  }, [openSettingsModal]);

  useEffect(
    () => setGridData(() => mergeData(data, issuesData)),
    [data, issuesData]
  );

  useEffect(() => {
    if (docError) console.log('Error fetching settings', docError);
    if (dataError) console.log('Error fetching statuses', dataError);
    if (issuesError) console.log('Error fetching issues', issuesError);
  }, [docError, dataError, issuesError]);

  const gridClickHandler = useCallback(
    (w) => {
      const workloadChilds = (w?.children || []).filter(
        (c) => c.domain === 'NR1' && c.type === 'WORKLOAD'
      );
      if (!workloadChilds.length) return;
      setGridData(workloadChilds);
    },
    [issuesData]
  );

  const saveSettings = useCallback(
    async (workloads) => {
      const { error } = await docWrite({
        accountId,
        ...DOC_STORE,
        document: {
          start: workloads?.map(({ accountId, guid, name }) => ({
            accountId,
            guid,
            name,
          })),
        },
      });

      if (error) console.error('Unable to save settings', error);
    },
    [accountId, docWrite]
  );

  const openSettingsModal = useCallback(() => setIsSettingsModalOpen(true), []);

  const currentView = useMemo(() => {
    if (gridData?.length)
      return (
        <div className="container">
          <div className="main">
            <WorkloadGrid
              workloads={gridData}
              issuesLoading={dataLoading || issuesLoading}
              onCardClick={gridClickHandler}
              onIncidentClick={(w) => console.log(`Opening ${w.name}`)}
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
        description="Future home of Nexus"
        action={{ label: 'Settings', onClick: openSettingsModal }}
      />
    );
  }, [
    gridData,
    dataLoading,
    issuesLoading,
    gridClickHandler,
    openSettingsModal,
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
      />
    </AppContext.Provider>
  );
};

export default NexusNerdlet;

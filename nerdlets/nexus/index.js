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

import { SettingsModal } from '../../src/components';
import { useDataManager } from '../../src/hooks';
import { AppContext } from '../../src/contexts';

const DOC_STORE = {
  collection: 'nexus',
  documentId: 'settings',
};

const NexusNerdlet = () => {
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

  useEffect(() => {
    if (docError) console.log('Error fetching settings', docError);
    if (dataError) console.log('Error fetching statuses', dataError);
  }, [docError, dataError]);

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
    // TODO: display data component

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
  }, [data, openSettingsModal]);

  if (isAcctsLoading || docLoading || dataLoading)
    return <EmptyState title="Setting up..." type={EmptyState.TYPE.LOADING} />;

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

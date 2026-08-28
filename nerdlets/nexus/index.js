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
  nerdlet,
  PlatformStateContext,
  SectionMessage,
  useAccountsQuery,
  useAccountStorageMutation,
  useAccountStorageQuery,
  useNerdletState,
  useUserStorageMutation,
  useUserStorageQuery,
  navigation,
} from 'nr1';

import { BoardsList } from '../../src/components';
import { AppContext } from '../../src/contexts';
import { generateId, normalizeBoards } from '../../src/utils';
import { BOARDS_STORE, DOC_STORE, USER_PREFS_STORE } from '../../src/constants';
import Board from './board';

// Top-level router for Nexus. Decides between the boards listing and a single
// board based on `boardId` in urlState, owns cross-view concerns (accounts,
// user prefs/favorites, the Neon banner), and runs the one-time legacy migration.
const NexusNerdlet = () => {
  const [app, setApp] = useState({});
  const [nerdletState, setNerdletState] = useNerdletState();
  const boardId = nerdletState?.boardId || null;

  const { accountId } = useContext(PlatformStateContext);
  const { data: accts = [], loading: isAcctsLoading } = useAccountsQuery();

  const { data: userPrefs, loading: userPrefsLoading } =
    useUserStorageQuery(USER_PREFS_STORE);
  const [writeUserPrefs] = useUserStorageMutation({
    actionType: useUserStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
  });
  const [deleteUserPrefs] = useUserStorageMutation({
    actionType: useUserStorageMutation.ACTION_TYPE.DELETE_DOCUMENT,
  });

  // Legacy single-board doc + the boards collection, used only for migration.
  const { data: legacyDoc, loading: legacyLoading } = useAccountStorageQuery({
    accountId,
    ...DOC_STORE,
    skip: !accountId,
  });
  const { data: boardsData, loading: boardsLoading } = useAccountStorageQuery({
    accountId,
    ...BOARDS_STORE,
    skip: !accountId,
  });
  const [boardsWrite] = useAccountStorageMutation({
    actionType: useAccountStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
  });
  const [boardsDelete] = useAccountStorageMutation({
    actionType: useAccountStorageMutation.ACTION_TYPE.DELETE_DOCUMENT,
  });
  const migratedAccounts = useRef(new Set());

  const favorites = useMemo(() => userPrefs?.favoriteBoards || {}, [userPrefs]);

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

  // Listing shell config (no Settings button — settings are per-board). The Board
  // component overrides this with its own header + action buttons while mounted;
  // setConfig merges, so we explicitly clear the board-specific header fields here
  // to revert the platform title back to the nerdlet default on the way back.
  useEffect(() => {
    if (boardId) return;
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
  }, [boardId]);

  // One-time-per-account legacy migration: convert a populated `settings` doc into
  // a uuid board (when no boards exist yet), then always delete the `settings` doc.
  useEffect(() => {
    if (!accountId || legacyLoading || boardsLoading) return;
    if (migratedAccounts.current.has(accountId)) return;
    if (!legacyDoc) return; // no legacy doc → nothing to migrate or clean up
    migratedAccounts.current.add(accountId);
    (async () => {
      try {
        const existingBoards = normalizeBoards(boardsData);
        const hasWorkloads =
          Array.isArray(legacyDoc.start) && legacyDoc.start.length > 0;
        if (hasWorkloads && existingBoards.length === 0) {
          const id = generateId();
          await boardsWrite({
            accountId,
            ...BOARDS_STORE,
            documentId: id,
            document: {
              id,
              title: 'Migrated board',
              description: '',
              createdBy: null,
              createdAt: new Date().toISOString(),
              start: legacyDoc.start,
              hideUnacknowledged: !!legacyDoc.hideUnacknowledged,
            },
          });
        }
        await boardsDelete({ accountId, ...DOC_STORE });
      } catch (err) {
        console.error('[nexus] legacy board migration failed', err);
        migratedAccounts.current.delete(accountId); // allow a retry next render
      }
    })();
  }, [
    accountId,
    legacyLoading,
    boardsLoading,
    legacyDoc,
    boardsData,
    boardsWrite,
    boardsDelete,
  ]);

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

  const openBoard = useCallback(
    (id) => setNerdletState({ boardId: id }),
    [setNerdletState]
  );

  const backToList = useCallback(
    () => setNerdletState({ boardId: null }),
    [setNerdletState]
  );

  const toggleFavorite = useCallback(
    (id) => {
      const current = userPrefs?.favoriteBoards || {};
      const next = { ...current };
      if (next[id]) delete next[id];
      else next[id] = true;
      writeUserPrefs({
        ...USER_PREFS_STORE,
        document: { ...(userPrefs || {}), favoriteBoards: next },
      });
    },
    [userPrefs, writeUserPrefs]
  );

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

  if (isAcctsLoading)
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
      {boardId ? (
        <Board boardId={boardId} onBack={backToList} />
      ) : (
        <BoardsList
          accountId={accountId}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onOpenBoard={openBoard}
        />
      )}
    </AppContext.Provider>
  );
};

export default NexusNerdlet;

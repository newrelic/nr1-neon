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
  Toast,
  useAccountsQuery,
  useAccountStorageMutation,
  useAccountStorageQuery,
  useNerdletState,
  useUserQuery,
  useUserStorageMutation,
  useUserStorageQuery,
  navigation,
} from 'nr1';

import { BoardsList } from '../../src/components';
import { AppContext } from '../../src/contexts';
import {
  generateId,
  normalizeBoards,
  normalizeDeletedBoards,
} from '../../src/utils';
import {
  BOARDS_STORE,
  DELETED_BOARDS_STORE,
  DELETED_BOARDS_TTL_MS,
  DOC_STORE,
  USER_PREFS_STORE,
} from '../../src/constants';
import Board from './board';

const boardLabel = (board) => `"${board?.title || 'Untitled board'}"`;

// Top-level router for Nexus. Decides between the boards listing and a single
// board based on `boardId` in urlState, owns cross-view concerns (accounts,
// user prefs/favorites, the Neon banner), and runs the one-time legacy migration.
const NexusNerdlet = () => {
  const [app, setApp] = useState({});
  const [nerdletState, setNerdletState] = useNerdletState();
  const boardId = nerdletState?.boardId || null;

  const { accountId } = useContext(PlatformStateContext);
  const { data: accts = [], loading: isAcctsLoading } = useAccountsQuery();
  const { data: user } = useUserQuery();

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
  // Soft-deleted boards live in their own collection; read it so we can purge
  // documents older than the retention window once the app has settled.
  const { data: deletedBoardsData, loading: deletedBoardsLoading } =
    useAccountStorageQuery({
      accountId,
      ...DELETED_BOARDS_STORE,
      skip: !accountId,
    });
  const [boardsWrite] = useAccountStorageMutation({
    actionType: useAccountStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
  });
  const [boardsDelete] = useAccountStorageMutation({
    actionType: useAccountStorageMutation.ACTION_TYPE.DELETE_DOCUMENT,
  });
  const migratedAccounts = useRef(new Set());
  const purgedAccounts = useRef(new Set());

  // Boards optimistically hidden from the listing while their soft-delete is in
  // flight. Keyed by board id; reconciled away once the boards query stops
  // returning them (success) or restored immediately on failure. Keeping this
  // means the board vanishes the instant the user confirms, with no flash of
  // the just-deleted board lingering on the listing.
  const [hiddenBoardIds, setHiddenBoardIds] = useState(() => new Set());

  const unhideBoard = useCallback((id) => {
    setHiddenBoardIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const favorites = useMemo(() => userPrefs?.favoriteBoards || {}, [userPrefs]);
  const defaultBoardId = userPrefs?.defaultBoardId || null;
  const defaultBoardTitle = useMemo(() => {
    if (!defaultBoardId) return null;
    const match = normalizeBoards(boardsData).find(
      (b) => b.id === defaultBoardId
    );
    return match?.title || null;
  }, [defaultBoardId, boardsData]);

  // On first load, if the URL didn't specify a board, jump straight to the
  // user's default board — or, absent a default, into the only board that
  // exists. The default board is a per-user pref, not scoped to an account, so
  // it's only honored when it actually exists among this account's boards;
  // otherwise it'd send the user straight to a "Board not found" page after an
  // account switch. Only applies once per mount so navigating back to the
  // listing (or picking a different board) later doesn't keep re-redirecting.
  const appliedDefaultBoard = useRef(false);
  useEffect(() => {
    if (appliedDefaultBoard.current) return;
    if (!accountId || userPrefsLoading || boardsLoading) return;
    appliedDefaultBoard.current = true;
    if (boardId) return;
    const boards = normalizeBoards(boardsData);
    if (defaultBoardId && boards.some((b) => b.id === defaultBoardId)) {
      setNerdletState({ boardId: defaultBoardId });
      return;
    }
    if (boards.length === 1) {
      setNerdletState({ boardId: boards[0].id });
    }
  }, [
    accountId,
    userPrefsLoading,
    boardsLoading,
    defaultBoardId,
    boardId,
    boardsData,
    setNerdletState,
  ]);

  // Boards are scoped to an account, so a board open under one account almost
  // certainly doesn't exist under another. If the platform account picker
  // switches accounts while a board is open, bail out to that account's
  // listing rather than showing "Board not found". `undefined` on the first
  // run just means accountId hasn't resolved yet — not a real switch.
  const prevAccountId = useRef(undefined);
  useEffect(() => {
    const prev = prevAccountId.current;
    prevAccountId.current = accountId;
    if (prev !== undefined && prev !== accountId && boardId) {
      setNerdletState({ boardId: null });
    }
  }, [accountId, boardId, setNerdletState]);

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

  // Hand off optimistic hiding to real state: once the boards query no longer
  // returns a hidden board (its delete has propagated), stop hiding it. This is
  // what prevents the deleted card from flashing back before the query updates.
  useEffect(() => {
    if (hiddenBoardIds.size === 0) return;
    const present = new Set(normalizeBoards(boardsData).map((b) => b.id));
    let changed = false;
    const next = new Set(hiddenBoardIds);
    hiddenBoardIds.forEach((id) => {
      if (!present.has(id)) {
        next.delete(id);
        changed = true;
      }
    });
    if (changed) setHiddenBoardIds(next);
  }, [boardsData, hiddenBoardIds]);

  // Once-per-account, after the app has fully loaded and settled: purge boards
  // that have been in the deleted collection longer than the retention window.
  useEffect(() => {
    if (!accountId) return;
    if (
      isAcctsLoading ||
      legacyLoading ||
      boardsLoading ||
      deletedBoardsLoading ||
      userPrefsLoading
    )
      return; // wait until everything has settled and the app is idle
    if (purgedAccounts.current.has(accountId)) return;
    purgedAccounts.current.add(accountId);

    const cutoff = Date.now() - DELETED_BOARDS_TTL_MS;
    const stale = normalizeDeletedBoards(deletedBoardsData).filter((entry) => {
      const when = Date.parse(entry.deletedAt);
      return Number.isFinite(when) && when < cutoff;
    });
    if (stale.length === 0) return;

    (async () => {
      for (const entry of stale) {
        const { error } = await boardsDelete({
          accountId,
          ...DELETED_BOARDS_STORE,
          documentId: entry.id,
        });
        if (error) {
          console.error(
            '[nexus] failed to purge deleted board',
            entry.id,
            error
          );
          purgedAccounts.current.delete(accountId); // allow a retry next render
        }
      }
    })();
  }, [
    accountId,
    isAcctsLoading,
    legacyLoading,
    boardsLoading,
    deletedBoardsLoading,
    userPrefsLoading,
    deletedBoardsData,
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

  // Refs let a Toast's Undo/Retry action call the latest handler without
  // creating a dependency cycle between the two useCallbacks below.
  const deleteBoardRef = useRef();
  const undoDeleteRef = useRef();

  // Restore a soft-deleted board: write it back to the boards collection first
  // (so a partial failure can't lose it), then drop the archive copy.
  const undoDelete = useCallback(
    async (board) => {
      if (!board?.id) return;
      const id = board.id;
      const { error: restoreError } = await boardsWrite({
        accountId,
        ...BOARDS_STORE,
        documentId: id,
        document: board,
      });
      if (restoreError) {
        console.error('[nexus] failed to restore board', id, restoreError);
        Toast.showToast({
          title: 'Couldn’t restore board',
          description: restoreError.message || 'Please try again.',
          actions: [
            { label: 'Retry', onClick: () => undoDeleteRef.current?.(board) },
          ],
          type: Toast.TYPE.CRITICAL,
        });
        return;
      }
      // Best-effort cleanup of the archive; the board is already back, and the
      // 30-day purge would remove a leftover anyway.
      await boardsDelete({
        accountId,
        ...DELETED_BOARDS_STORE,
        documentId: id,
      });
      unhideBoard(id);
      Toast.showToast({
        title: 'Board restored',
        description: `${boardLabel(board)} is back.`,
        type: Toast.TYPE.NORMAL,
      });
    },
    [accountId, boardsWrite, boardsDelete, unhideBoard]
  );
  undoDeleteRef.current = undoDelete;

  // Soft-delete: hide the board and return to the listing immediately (no flash
  // of "Board not found", no lingering card), then archive + remove it. On
  // failure, un-hide the board and surface a retryable critical toast.
  const deleteBoard = useCallback(
    async (board) => {
      if (!board?.id) return {};
      const id = board.id;
      setHiddenBoardIds((prev) => new Set(prev).add(id));
      backToList();

      const deletedBy = user
        ? {
            id: user.id ?? null,
            name: user.name ?? null,
            email: user.email ?? null,
          }
        : null;
      const archive = {
        board,
        deletedAt: new Date().toISOString(),
        deletedBy,
      };

      const fail = (error) => {
        console.error('[nexus] failed to delete board', id, error);
        unhideBoard(id);
        Toast.showToast({
          title: 'Couldn’t delete board',
          description: error?.message || 'Please try again.',
          actions: [
            { label: 'Retry', onClick: () => deleteBoardRef.current?.(board) },
          ],
          type: Toast.TYPE.CRITICAL,
        });
        return { error };
      };

      // Archive first so a partial failure never loses the board.
      const { error: writeError } = await boardsWrite({
        accountId,
        ...DELETED_BOARDS_STORE,
        documentId: id,
        document: archive,
      });
      if (writeError) return fail(writeError);

      const { error: deleteError } = await boardsDelete({
        accountId,
        ...BOARDS_STORE,
        documentId: id,
      });
      if (deleteError) {
        // Roll back the archive so the board isn't left in both collections.
        await boardsDelete({
          accountId,
          ...DELETED_BOARDS_STORE,
          documentId: id,
        });
        return fail(deleteError);
      }

      // Success: the reconcile effect drops the id from hiddenBoardIds once the
      // boards query stops returning the board, so there's no flash-back.
      Toast.showToast({
        title: 'Board deleted',
        description: `${boardLabel(board)} was deleted.`,
        actions: [
          { label: 'Undo', onClick: () => undoDeleteRef.current?.(board) },
        ],
        type: Toast.TYPE.NORMAL,
      });
      return {};
    },
    [accountId, user, backToList, boardsWrite, boardsDelete, unhideBoard]
  );
  deleteBoardRef.current = deleteBoard;

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

  const setDefaultBoardId = useCallback(
    async (id) => {
      const { error } = await writeUserPrefs({
        ...USER_PREFS_STORE,
        document: { ...(userPrefs || {}), defaultBoardId: id },
      });
      return { error };
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
        <Board
          boardId={boardId}
          onBack={backToList}
          onDeleteBoard={deleteBoard}
          defaultBoardId={defaultBoardId}
          defaultBoardTitle={defaultBoardTitle}
          onSetDefaultBoard={setDefaultBoardId}
        />
      ) : (
        <BoardsList
          accountId={accountId}
          favorites={favorites}
          hiddenBoardIds={hiddenBoardIds}
          onToggleFavorite={toggleFavorite}
          onOpenBoard={openBoard}
        />
      )}
    </AppContext.Provider>
  );
};

export default NexusNerdlet;

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Board is exercised in its own test; here we only care that the router picks it.
jest.mock('../board', () => {
  const MockReact = require('react');
  const fn = jest.fn(({ boardId }) =>
    MockReact.createElement('div', { 'data-testid': 'mock-board' }, boardId)
  );
  return { __esModule: true, default: fn };
});

import * as nr1 from 'nr1';
import NexusNerdlet from '../index';

const renderWithPlatform = (ui, { accountId = 42 } = {}) =>
  render(
    <nr1.PlatformStateContext.Provider value={{ accountId }}>
      {ui}
    </nr1.PlatformStateContext.Provider>
  );

// Route account-storage queries by their args: the deleted-boards collection,
// the legacy `settings` doc, the boards collection (no documentId), or a single
// board by documentId.
const setStorage = ({
  legacy = null,
  boards = null,
  board = null,
  deleted = null,
} = {}) => {
  nr1.useAccountStorageQuery.mockImplementation((opts) => {
    if (opts?.collection === 'nexus-deleted-boards')
      return { data: deleted, loading: false, error: null };
    if (opts?.documentId === 'settings')
      return { data: legacy, loading: false, error: null };
    if (!opts?.documentId) return { data: boards, loading: false, error: null };
    return { data: board, loading: false, error: null };
  });
};

const setDefaults = ({
  accounts = [{ id: 42, name: 'Acct 42' }],
  accountsLoading = false,
  userPrefs = { nexusBannerDismissed: false },
  userPrefsLoading = false,
  nerdletState = {},
} = {}) => {
  nr1.useAccountsQuery.mockReturnValue({
    data: accounts,
    loading: accountsLoading,
  });
  nr1.useUserStorageQuery.mockReturnValue({
    data: userPrefs,
    loading: userPrefsLoading,
    error: null,
  });
  nr1.useNerdletState.mockReturnValue([nerdletState, nr1.__setNerdletStateFn]);
  setStorage();
};

beforeEach(() => {
  jest.clearAllMocks();
  setDefaults();
});

describe('NexusNerdlet (router)', () => {
  it('shows the loading empty state while accounts load', () => {
    setDefaults({ accounts: [], accountsLoading: true });
    renderWithPlatform(<NexusNerdlet />);
    expect(screen.getByTestId('nr1-EmptyState-title').textContent).toBe(
      'Setting up...'
    );
  });

  it('renders the boards list (empty state) when no board is selected', () => {
    renderWithPlatform(<NexusNerdlet />);
    expect(screen.getByTestId('nr1-EmptyState-title').textContent).toBe(
      'No boards yet.'
    );
    expect(screen.queryByTestId('mock-board')).toBeNull();
  });

  it('renders a board when boardId is present in urlState', () => {
    setDefaults({ nerdletState: { boardId: 'board-123' } });
    setStorage({ board: { id: 'board-123', title: 'My board' } });
    renderWithPlatform(<NexusNerdlet />);
    expect(screen.getByTestId('mock-board').textContent).toBe('board-123');
  });

  it('configures the listing shell without action buttons', () => {
    renderWithPlatform(<NexusNerdlet />);
    const cfg = nr1.nerdlet.setConfig.mock.calls.slice(-1)[0][0];
    expect(cfg.accountPicker).toBe(true);
    expect(cfg.timePicker).toBe(false);
    expect(cfg.actionControlButtons).toEqual([]);
    // Board-specific header fields are cleared so the platform title reverts.
    expect(cfg.headerTitle).toBe('Nexus');
    expect(cfg.headerParentTitle).toBeUndefined();
  });

  it('shows the nexus banner when not dismissed', () => {
    renderWithPlatform(<NexusNerdlet />);
    expect(screen.getByTestId('nr1-SectionMessage-title').textContent).toBe(
      'Welcome to Nexus.'
    );
  });

  it('hides the nexus banner when dismissed', () => {
    setDefaults({ userPrefs: { nexusBannerDismissed: true } });
    renderWithPlatform(<NexusNerdlet />);
    expect(screen.queryByTestId('nr1-SectionMessage')).toBeNull();
  });

  it('banner "Switch to Neon" opens the neon nerdlet', () => {
    renderWithPlatform(<NexusNerdlet />);
    fireEvent.click(screen.getByTestId('nr1-SectionMessage-action-0'));
    expect(nr1.navigation.openNerdlet).toHaveBeenCalledWith({
      id: 'neon-nerdlet',
    });
  });

  it('banner "Do not show again" writes dismissal to the preferences doc', () => {
    renderWithPlatform(<NexusNerdlet />);
    fireEvent.click(screen.getByTestId('nr1-SectionMessage-action-1'));
    expect(nr1.__writePrefsFn).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'nexus',
        documentId: 'preferences',
        document: expect.objectContaining({ nexusBannerDismissed: true }),
      })
    );
  });

  it('exposes __neonResetUserPrefs which deletes the preferences doc', async () => {
    renderWithPlatform(<NexusNerdlet />);
    expect(typeof window.__neonResetUserPrefs).toBe('function');
    await act(async () => {
      await window.__neonResetUserPrefs();
    });
    expect(nr1.__deletePrefsFn).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'nexus',
        documentId: 'preferences',
      })
    );
  });

  it('migrates a populated legacy settings doc into a board, then deletes it', async () => {
    setStorage({
      legacy: {
        start: [{ accountId: 42, guid: 'wl-1', name: 'API' }],
        hideUnacknowledged: true,
      },
      boards: [],
    });
    await act(async () => {
      renderWithPlatform(<NexusNerdlet />);
    });
    expect(nr1.__docWriteFn).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 42,
        collection: 'nexus',
        document: expect.objectContaining({
          title: 'Migrated board',
          start: [{ accountId: 42, guid: 'wl-1', name: 'API' }],
          hideUnacknowledged: true,
        }),
      })
    );
    expect(nr1.__docDeleteFn).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'nexus', documentId: 'settings' })
    );
  });

  it('deletes an empty legacy settings doc without creating a board', async () => {
    setStorage({ legacy: { start: [] }, boards: [] });
    await act(async () => {
      renderWithPlatform(<NexusNerdlet />);
    });
    expect(nr1.__docWriteFn).not.toHaveBeenCalled();
    expect(nr1.__docDeleteFn).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'nexus', documentId: 'settings' })
    );
  });

  it('redirects to the default board when no boardId is in urlState', () => {
    setDefaults({ userPrefs: { defaultBoardId: 'board-42' } });
    setStorage({
      boards: [{ id: 'board-42', document: { title: 'Default' } }],
    });
    renderWithPlatform(<NexusNerdlet />);
    expect(nr1.__setNerdletStateFn).toHaveBeenCalledWith({
      boardId: 'board-42',
    });
  });

  it('does not redirect to the default board when it belongs to a different account (falls back to the listing instead of "Board not found")', () => {
    setDefaults({ userPrefs: { defaultBoardId: 'board-from-other-acct' } });
    setStorage({
      boards: [
        { id: 'board-a', document: { title: 'A' } },
        { id: 'board-b', document: { title: 'B' } },
      ],
    });
    renderWithPlatform(<NexusNerdlet />);
    expect(nr1.__setNerdletStateFn).not.toHaveBeenCalled();
  });

  it('falls back to the only board when the default board belongs to a different account', () => {
    setDefaults({ userPrefs: { defaultBoardId: 'board-from-other-acct' } });
    setStorage({ boards: [{ id: 'only-board', document: { title: 'Only' } }] });
    renderWithPlatform(<NexusNerdlet />);
    expect(nr1.__setNerdletStateFn).toHaveBeenCalledWith({
      boardId: 'only-board',
    });
  });

  it('does not redirect when a boardId is already present in urlState', () => {
    setDefaults({
      userPrefs: { defaultBoardId: 'board-42' },
      nerdletState: { boardId: 'board-123' },
    });
    setStorage({ board: { id: 'board-123', title: 'My board' } });
    renderWithPlatform(<NexusNerdlet />);
    expect(nr1.__setNerdletStateFn).not.toHaveBeenCalled();
  });

  it('does not redirect when there is no default board set', () => {
    renderWithPlatform(<NexusNerdlet />);
    expect(nr1.__setNerdletStateFn).not.toHaveBeenCalled();
  });

  it('redirects into the only board when there is no default and exactly one board exists', () => {
    setStorage({ boards: [{ id: 'only-board', document: { title: 'Only' } }] });
    renderWithPlatform(<NexusNerdlet />);
    expect(nr1.__setNerdletStateFn).toHaveBeenCalledWith({
      boardId: 'only-board',
    });
  });

  it('does not redirect into a board when multiple boards exist and there is no default', () => {
    setStorage({
      boards: [
        { id: 'board-a', document: { title: 'A' } },
        { id: 'board-b', document: { title: 'B' } },
      ],
    });
    renderWithPlatform(<NexusNerdlet />);
    expect(nr1.__setNerdletStateFn).not.toHaveBeenCalled();
  });

  it('prefers the default board over the only-board fallback when both apply', () => {
    setDefaults({ userPrefs: { defaultBoardId: 'board-42' } });
    setStorage({
      boards: [{ id: 'board-42', document: { title: 'Default' } }],
    });
    renderWithPlatform(<NexusNerdlet />);
    expect(nr1.__setNerdletStateFn).toHaveBeenCalledWith({
      boardId: 'board-42',
    });
  });

  it('switches to the listing when the account changes while a board is open', () => {
    setDefaults({ nerdletState: { boardId: 'board-123' } });
    setStorage({ board: { id: 'board-123', title: 'My board' } });
    const { rerender } = renderWithPlatform(<NexusNerdlet />, {
      accountId: 42,
    });
    expect(screen.getByTestId('mock-board')).toBeInTheDocument();
    expect(nr1.__setNerdletStateFn).not.toHaveBeenCalled();

    rerender(
      <nr1.PlatformStateContext.Provider value={{ accountId: 99 }}>
        <NexusNerdlet />
      </nr1.PlatformStateContext.Provider>
    );
    expect(nr1.__setNerdletStateFn).toHaveBeenCalledWith({ boardId: null });
  });

  it('does not touch urlState when the account changes while on the listing', () => {
    const { rerender } = renderWithPlatform(<NexusNerdlet />, {
      accountId: 42,
    });
    rerender(
      <nr1.PlatformStateContext.Provider value={{ accountId: 99 }}>
        <NexusNerdlet />
      </nr1.PlatformStateContext.Provider>
    );
    expect(nr1.__setNerdletStateFn).not.toHaveBeenCalled();
  });

  it('does nothing when there is no legacy settings doc', async () => {
    setStorage({ legacy: null, boards: [] });
    await act(async () => {
      renderWithPlatform(<NexusNerdlet />);
    });
    expect(nr1.__docWriteFn).not.toHaveBeenCalled();
    expect(nr1.__docDeleteFn).not.toHaveBeenCalled();
  });

  // Grab the onDeleteBoard prop the router hands to the (mocked) Board.
  const renderBoardView = ({ board } = {}) => {
    setDefaults({ nerdletState: { boardId: board.id } });
    setStorage({
      board,
      boards: [{ id: board.id, document: board }],
    });
    const boardModule = require('../board');
    renderWithPlatform(<NexusNerdlet />);
    const calls = boardModule.default.mock.calls;
    return calls[calls.length - 1][0].onDeleteBoard;
  };

  it('soft-deletes a board: redirects, archives it first, removes the original, and offers undo', async () => {
    const board = { id: 'b-9', title: 'Doomed' };
    const onDeleteBoard = renderBoardView({ board });
    await act(async () => {
      await onDeleteBoard(board);
    });

    // Redirect to the listing happens immediately.
    expect(nr1.__setNerdletStateFn).toHaveBeenCalledWith({ boardId: null });
    // Archived to the deleted collection with deletion metadata...
    expect(nr1.__docWriteFn).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'nexus-deleted-boards',
        documentId: 'b-9',
        document: expect.objectContaining({
          board: expect.objectContaining({ id: 'b-9', title: 'Doomed' }),
          deletedBy: expect.objectContaining({ email: 'test@example.com' }),
          deletedAt: expect.any(String),
        }),
      })
    );
    // ...then the original is deleted from the boards collection.
    expect(nr1.__docDeleteFn).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'nexus', documentId: 'b-9' })
    );
    // Undoable toast.
    const toast = nr1.Toast.showToast.mock.calls.slice(-1)[0][0];
    expect(toast.title).toBe('Board deleted');
    expect(toast.type).toBe('NORMAL');
    expect(toast.actions[0].label).toBe('Undo');
  });

  it('undo restores the board and removes the archive', async () => {
    const board = { id: 'b-9', title: 'Doomed' };
    const onDeleteBoard = renderBoardView({ board });
    await act(async () => {
      await onDeleteBoard(board);
    });
    const toast = nr1.Toast.showToast.mock.calls.slice(-1)[0][0];

    nr1.__docWriteFn.mockClear();
    nr1.__docDeleteFn.mockClear();
    await act(async () => {
      await toast.actions[0].onClick();
    });

    // Written back to the boards collection...
    expect(nr1.__docWriteFn).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'nexus',
        documentId: 'b-9',
        document: expect.objectContaining({ id: 'b-9', title: 'Doomed' }),
      })
    );
    // ...and the archive copy removed.
    expect(nr1.__docDeleteFn).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'nexus-deleted-boards',
        documentId: 'b-9',
      })
    );
  });

  it('shows a retryable critical toast and keeps the board when the archive write fails', async () => {
    const board = { id: 'b-9', title: 'Doomed' };
    const onDeleteBoard = renderBoardView({ board });
    nr1.__docWriteFn.mockResolvedValueOnce({ error: { message: 'nope' } });
    await act(async () => {
      await onDeleteBoard(board);
    });

    const toast = nr1.Toast.showToast.mock.calls.slice(-1)[0][0];
    expect(toast.type).toBe('CRITICAL');
    expect(toast.actions[0].label).toBe('Retry');
    // The original board is never deleted when archiving failed.
    expect(nr1.__docDeleteFn).not.toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'nexus', documentId: 'b-9' })
    );
  });

  it('purges deleted boards older than the retention window on load', async () => {
    const dayMs = 24 * 60 * 60 * 1000;
    const stale = new Date(Date.now() - 31 * dayMs).toISOString();
    const recent = new Date(Date.now() - dayMs).toISOString();
    setStorage({
      boards: [],
      deleted: [
        { id: 'old-1', document: { board: { id: 'old-1' }, deletedAt: stale } },
        {
          id: 'fresh-1',
          document: { board: { id: 'fresh-1' }, deletedAt: recent },
        },
      ],
    });
    await act(async () => {
      renderWithPlatform(<NexusNerdlet />);
    });
    expect(nr1.__docDeleteFn).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'nexus-deleted-boards',
        documentId: 'old-1',
      })
    );
    expect(nr1.__docDeleteFn).not.toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'nexus-deleted-boards',
        documentId: 'fresh-1',
      })
    );
  });
});

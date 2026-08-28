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

// Route account-storage queries by their args: the legacy `settings` doc, the
// boards collection (no documentId), or a single board by documentId.
const setStorage = ({ legacy = null, boards = null, board = null } = {}) => {
  nr1.useAccountStorageQuery.mockImplementation((opts) => {
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

  it('does nothing when there is no legacy settings doc', async () => {
    setStorage({ legacy: null, boards: [] });
    await act(async () => {
      renderWithPlatform(<NexusNerdlet />);
    });
    expect(nr1.__docWriteFn).not.toHaveBeenCalled();
    expect(nr1.__docDeleteFn).not.toHaveBeenCalled();
  });
});

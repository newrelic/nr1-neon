import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Mock the internal hooks module — we don't want to test the data manager
// or issues fetching from nexus tests.
jest.mock('../../../src/hooks', () => ({
  useDataManager: jest.fn(),
  useAlertingEntitiesIssues: jest.fn(),
}));

import * as hooksModule from '../../../src/hooks';
import * as nr1 from 'nr1';
import NexusNerdlet from '../index';

// Stable refs so consumers don't see new identities each render.
const stableRefresh = jest.fn();
const stableDataManagerReturn = {
  data: [],
  loading: false,
  error: null,
  refresh: stableRefresh,
};
const stableIssuesReturn = { data: [], loading: false, error: null };

const setHookDefaults = (overrides = {}) => {
  hooksModule.useDataManager.mockReturnValue({
    ...stableDataManagerReturn,
    ...(overrides.useDataManager || {}),
  });
  hooksModule.useAlertingEntitiesIssues.mockReturnValue({
    ...stableIssuesReturn,
    ...(overrides.useAlertingEntitiesIssues || {}),
  });
};

const stableAccountsData = [{ id: 42, name: 'Acct 42' }];
const stableDocData = { start: [], hideUnacknowledged: false };
const stableUserPrefs = { nexusBannerDismissed: false };

const setNr1Defaults = ({
  accounts = stableAccountsData,
  accountsLoading = false,
  docData = stableDocData,
  docLoading = false,
  userPrefs = stableUserPrefs,
  userPrefsLoading = false,
} = {}) => {
  nr1.useAccountsQuery.mockReturnValue({
    data: accounts,
    loading: accountsLoading,
  });
  nr1.useAccountStorageQuery.mockReturnValue({
    data: docData,
    loading: docLoading,
    error: null,
  });
  nr1.useUserStorageQuery.mockReturnValue({
    data: userPrefs,
    loading: userPrefsLoading,
    error: null,
  });
};

const renderWithPlatform = (ui, { accountId = 42 } = {}) =>
  render(
    <nr1.PlatformStateContext.Provider value={{ accountId }}>
      {ui}
    </nr1.PlatformStateContext.Provider>
  );

beforeEach(() => {
  jest.clearAllMocks();
  nr1.__resetMutationCounters?.();
  setHookDefaults();
  setNr1Defaults();
});

describe('NexusNerdlet', () => {
  it('shows the loading empty state when accounts are loading', () => {
    setNr1Defaults({ accounts: [], accountsLoading: true });
    renderWithPlatform(<NexusNerdlet />);
    const title = screen.getByTestId('nr1-EmptyState-title');
    expect(title.textContent).toBe('Setting up...');
  });

  it('shows the loading empty state when doc storage is loading', () => {
    setNr1Defaults({ docData: null, docLoading: true });
    renderWithPlatform(<NexusNerdlet />);
    expect(screen.getByTestId('nr1-EmptyState-title').textContent).toBe(
      'Setting up...'
    );
  });

  it('shows the loading empty state when workload data is loading', () => {
    setHookDefaults({ useDataManager: { loading: true } });
    renderWithPlatform(<NexusNerdlet />);
    expect(screen.getByTestId('nr1-EmptyState-title').textContent).toBe(
      'Setting up...'
    );
  });

  it('shows the "nothing brewing" empty state when there are no workloads', () => {
    renderWithPlatform(<NexusNerdlet />);
    expect(screen.getByTestId('nr1-EmptyState-title').textContent).toBe(
      'Nothing brewing. Yet.'
    );
  });

  it('renders a workload grid with cards for each workload when data is present', () => {
    const workloads = [
      { guid: 'wl-1', name: 'API', status: 'OPERATIONAL', children: [] },
      { guid: 'wl-2', name: 'Web', status: 'DEGRADED', children: [] },
    ];
    setHookDefaults({ useDataManager: { data: workloads } });
    renderWithPlatform(<NexusNerdlet />);
    expect(screen.getByText('API')).toBeInTheDocument();
    expect(screen.getByText('Web')).toBeInTheDocument();
  });

  it('configures the nerdlet with account picker and action buttons on mount', () => {
    renderWithPlatform(<NexusNerdlet />);
    expect(nr1.nerdlet.setConfig).toHaveBeenCalled();
    const cfg = nr1.nerdlet.setConfig.mock.calls.slice(-1)[0][0];
    expect(cfg.accountPicker).toBe(true);
    expect(cfg.actionControls).toBe(true);
    expect(cfg.timePicker).toBe(false);
    expect(cfg.actionControlButtons).toHaveLength(2);
    expect(cfg.actionControlButtons[0].label).toBe('Refresh');
    expect(cfg.actionControlButtons[1].label).toBe('Settings');
  });

  it('wires the Refresh action button to the data manager refresh function', () => {
    renderWithPlatform(<NexusNerdlet />);
    const cfg = nr1.nerdlet.setConfig.mock.calls.slice(-1)[0][0];
    cfg.actionControlButtons[0].onClick();
    expect(stableRefresh).toHaveBeenCalled();
  });

  it('shows the nexus banner when user has not dismissed it', () => {
    renderWithPlatform(<NexusNerdlet />);
    expect(screen.getByTestId('nr1-SectionMessage')).toBeInTheDocument();
    expect(screen.getByTestId('nr1-SectionMessage-title').textContent).toBe(
      'Welcome to Nexus.'
    );
  });

  it('hides the nexus banner when user has dismissed it', () => {
    setNr1Defaults({ userPrefs: { nexusBannerDismissed: true } });
    renderWithPlatform(<NexusNerdlet />);
    expect(screen.queryByTestId('nr1-SectionMessage')).toBeNull();
  });

  it('nexus banner "Switch to Neon" action opens the neon-nerdlet', () => {
    renderWithPlatform(<NexusNerdlet />);
    fireEvent.click(screen.getByTestId('nr1-SectionMessage-action-0'));
    expect(nr1.navigation.openNerdlet).toHaveBeenCalledWith({
      id: 'neon-nerdlet',
    });
  });

  it('nexus banner "Do not show again" writes the dismissal to user storage', () => {
    renderWithPlatform(<NexusNerdlet />);
    fireEvent.click(screen.getByTestId('nr1-SectionMessage-action-1'));
    expect(nr1.__writePrefsFn).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'nexus',
        documentId: 'userPrefs',
        document: expect.objectContaining({ nexusBannerDismissed: true }),
      })
    );
  });

  it('exposes __neonResetSettings on window and calls docDelete for the current account', async () => {
    renderWithPlatform(<NexusNerdlet />);
    expect(typeof window.__neonResetSettings).toBe('function');
    await act(async () => {
      await window.__neonResetSettings();
    });
    expect(nr1.__docDeleteFn).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 42,
        collection: 'nexus',
        documentId: 'settings',
      })
    );
  });

  it('exposes __neonResetUserPrefs on window and calls deletePrefs', async () => {
    renderWithPlatform(<NexusNerdlet />);
    expect(typeof window.__neonResetUserPrefs).toBe('function');
    await act(async () => {
      await window.__neonResetUserPrefs();
    });
    expect(nr1.__deletePrefsFn).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'nexus', documentId: 'userPrefs' })
    );
  });

  it('clicking an entity row opens an issues modal instead of a new tab, and "Open Entity" opens the entity', () => {
    jest.useFakeTimers();
    try {
      const issue = {
        issueId: 'i-1',
        issueLink: 'https://example.com/i-1',
        priority: 'CRITICAL',
        title: ['Something broke'],
        activatedAt: Date.now(),
      };
      const workloads = [
        {
          guid: 'root',
          name: 'Root WL',
          status: 'OPERATIONAL',
          children: [
            {
              guid: 'ent-1',
              name: 'My Entity',
              domain: 'APM',
              type: 'APPLICATION',
              accountId: 1,
              alertSeverity: 'CRITICAL',
            },
          ],
        },
      ];
      const issuesTree = [{ issues: [], children: [{ issues: [issue] }] }];
      setHookDefaults({
        useDataManager: { data: workloads },
        useAlertingEntitiesIssues: { data: issuesTree },
      });
      nr1.useEntitiesByGuidsQuery.mockReturnValue({
        loading: false,
        data: {
          entities: [
            {
              guid: 'ent-1',
              name: 'My Entity',
              domain: 'APM',
              type: 'APPLICATION',
              accountId: 1,
              alertSeverity: 'CRITICAL',
              tags: [],
              goldenMetrics: { metrics: [] },
              goldenTags: { tags: [] },
            },
          ],
        },
      });
      renderWithPlatform(<NexusNerdlet />);

      const rootCard = screen.getByText('Root WL').closest('.workload-card');
      act(() => {
        fireEvent.click(rootCard);
      });
      act(() => {
        jest.advanceTimersByTime(200);
      });

      const entityRow = screen.getByText('My Entity').closest('.entity-row');
      expect(entityRow).toBeTruthy();
      fireEvent.click(entityRow);

      // Opens the issues modal for the entity rather than a new tab.
      expect(nr1.navigation.getOpenEntityLocation).not.toHaveBeenCalled();
      expect(screen.getByText('Entity issues')).toBeInTheDocument();
      expect(screen.getByText('Something broke')).toBeInTheDocument();

      const openEntityButton = screen.getByText('Open Entity');
      const openSpy = jest.spyOn(window, 'open').mockImplementation(() => {});
      // jsdom's Location doesn't implement ancestorOrigins; define it so the nerdlet's iframe-origin lookup works.
      Object.defineProperty(window.location, 'ancestorOrigins', {
        value: ['https://one.newrelic.com'],
        configurable: true,
      });
      fireEvent.click(openEntityButton);
      expect(nr1.navigation.getOpenEntityLocation).toHaveBeenCalledWith(
        'ent-1',
        { platformState: { accountId: 1 } }
      );
      expect(openSpy).toHaveBeenCalled();
      openSpy.mockRestore();
      delete window.location.ancestorOrigins;
    } finally {
      jest.useRealTimers();
    }
  });

  it('clicking a workload card with children navigates in and shows the child', () => {
    jest.useFakeTimers();
    try {
      const workloads = [
        {
          guid: 'root',
          name: 'Root WL',
          status: 'OPERATIONAL',
          children: [
            {
              guid: 'child-wl',
              name: 'Child WL',
              domain: 'NR1',
              type: 'WORKLOAD',
              status: 'OPERATIONAL',
              children: [],
            },
          ],
        },
      ];
      setHookDefaults({ useDataManager: { data: workloads } });
      renderWithPlatform(<NexusNerdlet />);
      const rootCard = screen.getByText('Root WL').closest('.workload-card');
      expect(rootCard).toBeTruthy();
      act(() => {
        fireEvent.click(rootCard);
      });
      // WorkloadGrid fades out for 160ms before swapping to the new children.
      act(() => {
        jest.advanceTimersByTime(200);
      });
      expect(screen.getByText('Child WL')).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });
});

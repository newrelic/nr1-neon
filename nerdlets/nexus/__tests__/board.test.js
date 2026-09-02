import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';

// Mock only the leaf data hooks — the board-level hooks (useBoardData,
// useBoardNavigation, useBoardChrome) run for real so we exercise navigation
// and URL sync end-to-end.
jest.mock('../../../src/hooks/use-data-manager');
jest.mock('../../../src/hooks/use-alerting-entities-issues');

import useDataManager from '../../../src/hooks/use-data-manager';
import useAlertingEntitiesIssues from '../../../src/hooks/use-alerting-entities-issues';
import * as nr1 from 'nr1';
import Board from '../board';
import { AppContext } from '../../../src/contexts';

const hooksModule = { useDataManager, useAlertingEntitiesIssues };

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

const setBoardDoc = (doc, { loading = false, error = null } = {}) => {
  nr1.useAccountStorageQuery.mockReturnValue({ data: doc, loading, error });
};

const renderBoard = (props = {}) =>
  render(
    <nr1.PlatformStateContext.Provider value={{ accountId: 42 }}>
      <AppContext.Provider value={{ account: {}, accounts: [] }}>
        <Board boardId="b-1" onBack={jest.fn()} {...props} />
      </AppContext.Provider>
    </nr1.PlatformStateContext.Provider>
  );

beforeEach(() => {
  jest.clearAllMocks();
  nr1.__resetMutationCounters?.();
  setHookDefaults();
  // clearAllMocks() only clears call records, not return-value overrides, so
  // restore the URL-state and entity-hydration mocks to their defaults here to
  // keep per-test overrides from leaking into later tests.
  nr1.useNerdletState.mockReturnValue([{}, nr1.__setNerdletStateFn]);
  nr1.useEntitiesByGuidsQuery.mockReturnValue({
    loading: false,
    data: { entities: [] },
  });
  setBoardDoc({
    id: 'b-1',
    title: 'My Board',
    start: [],
    hideUnacknowledged: false,
  });
});

describe('Board', () => {
  it('shows the loading empty state while the board doc loads', () => {
    setBoardDoc(null, { loading: true });
    renderBoard();
    expect(screen.getByTestId('nr1-EmptyState-title').textContent).toBe(
      'Setting up...'
    );
  });

  it('shows "Board not found" when the doc resolves empty', () => {
    setBoardDoc(null);
    renderBoard();
    expect(screen.getByTestId('nr1-EmptyState-title').textContent).toBe(
      'Board not found'
    );
  });

  it('shows the "nothing brewing" empty state when the board has no workloads', () => {
    renderBoard();
    expect(screen.getByTestId('nr1-EmptyState-title').textContent).toBe(
      'Nothing brewing. Yet.'
    );
  });

  it('renders a workload grid with cards for each workload', () => {
    setHookDefaults({
      useDataManager: {
        data: [
          { guid: 'wl-1', name: 'API', status: 'OPERATIONAL', children: [] },
          { guid: 'wl-2', name: 'Web', status: 'DEGRADED', children: [] },
        ],
      },
    });
    renderBoard();
    expect(screen.getByText('API')).toBeInTheDocument();
    expect(screen.getByText('Web')).toBeInTheDocument();
  });

  it('configures the header title, Nexus parent and Refresh/Workloads/Settings buttons', () => {
    renderBoard();
    const cfg = nr1.nerdlet.setConfig.mock.calls.slice(-1)[0][0];
    expect(cfg.headerTitle).toBe('My Board');
    expect(cfg.headerParentTitle).toBe('Nexus');
    expect(cfg.actionControlButtons.map((b) => b.label)).toEqual([
      'Refresh',
      'Workloads',
      'Settings',
    ]);
    // Must use the non-navigating location helper — openNerdlet() would navigate
    // away (clearing boardId) the instant the board mounts.
    expect(nr1.navigation.openNerdlet).not.toHaveBeenCalled();
    expect(nr1.navigation.getOpenNerdletLocation).toHaveBeenCalledWith({
      id: 'nexus',
      urlState: { boardId: null },
    });
  });

  it('clears the header (no board name) when the board is not found', () => {
    setBoardDoc(null);
    renderBoard();
    const cfg = nr1.nerdlet.setConfig.mock.calls.slice(-1)[0][0];
    expect(cfg.headerTitle).toBe('Nexus');
    expect(cfg.actionControlButtons).toEqual([]);
  });

  it('wires the Refresh action button to the data manager refresh', () => {
    renderBoard();
    const cfg = nr1.nerdlet.setConfig.mock.calls.slice(-1)[0][0];
    cfg.actionControlButtons[0].onClick();
    expect(stableRefresh).toHaveBeenCalled();
  });

  const openViaButton = (label) => {
    const cfg = nr1.nerdlet.setConfig.mock.calls.slice(-1)[0][0];
    const btn = cfg.actionControlButtons.find((b) => b.label === label);
    act(() => btn.onClick());
  };

  it('saving settings writes title/description/hideUnacknowledged to the board doc', async () => {
    setBoardDoc({
      id: 'b-1',
      title: 'My Board',
      description: 'desc',
      start: [],
      hideUnacknowledged: false,
    });
    renderBoard();
    openViaButton('Settings');
    await act(async () => {
      fireEvent.click(
        within(document.querySelector('.board-settings')).getByText('Save')
      );
    });
    expect(nr1.__docWriteFn).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 42,
        collection: 'nexus',
        documentId: 'b-1',
        document: expect.objectContaining({
          id: 'b-1',
          title: 'My Board',
          description: 'desc',
          hideUnacknowledged: false,
        }),
      })
    );
  });

  it('marks the board as default via onSetDefaultBoard', async () => {
    const onSetDefaultBoard = jest.fn(async () => ({}));
    renderBoard({ onSetDefaultBoard, defaultBoardId: null });
    openViaButton('Settings');
    fireEvent.click(
      within(document.querySelector('.settings-panel')).getByLabelText(
        'Set as default board'
      )
    );
    await act(async () => {
      fireEvent.click(
        within(document.querySelector('.settings-panel')).getByText('Save')
      );
    });
    expect(onSetDefaultBoard).toHaveBeenCalledWith('b-1');
  });

  it('shows the current default board name when a different board is default', () => {
    renderBoard({
      defaultBoardId: 'other-board',
      defaultBoardTitle: 'Payments',
    });
    openViaButton('Settings');
    const description = within(document.querySelector('.settings-panel'))
      .getByLabelText('Set as default board')
      .closest('label')
      .querySelector('[data-testid="nr1-Switch-description"]');
    expect(description.textContent).toMatch(/Current default board: Payments/);
  });

  it('saving workloads writes the selected workloads to the board doc', async () => {
    renderBoard();
    openViaButton('Workloads');
    await act(async () => {
      fireEvent.click(
        within(document.querySelector('.workloads-modal')).getByText('Save')
      );
    });
    expect(nr1.__docWriteFn).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: 'b-1',
        document: expect.objectContaining({ id: 'b-1', start: [] }),
      })
    );
  });

  it('confirming delete delegates to onDeleteBoard with the current board doc', async () => {
    const onDeleteBoard = jest.fn(async () => ({}));
    setBoardDoc({
      id: 'b-1',
      title: 'My Board',
      description: 'desc',
      start: [],
      hideUnacknowledged: false,
    });
    renderBoard({ onDeleteBoard });
    openViaButton('Settings');
    // Two "Delete board" buttons (settings trigger + confirm); click trigger then confirm.
    fireEvent.click(
      within(document.querySelector('.settings-panel')).getByText(
        'Delete board'
      )
    );
    await act(async () => {
      fireEvent.click(
        within(document.querySelector('.confirm-panel')).getByText(
          'Delete board'
        )
      );
    });
    // Board no longer deletes directly; the parent owns redirect + soft-delete.
    expect(onDeleteBoard).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'b-1',
        title: 'My Board',
        description: 'desc',
      })
    );
    expect(nr1.__docDeleteFn).not.toHaveBeenCalled();
  });

  it('clicking an entity row opens the issues modal and "Open Entity" opens the entity', () => {
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
      renderBoard();

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

      expect(nr1.navigation.getOpenEntityLocation).not.toHaveBeenCalled();
      expect(screen.getByText('Entity issues')).toBeInTheDocument();
      expect(screen.getByText('Something broke')).toBeInTheDocument();

      const openEntityButton = screen.getByText('Open Entity');
      const openSpy = jest.spyOn(window, 'open').mockImplementation(() => {});
      Object.defineProperty(window.location, 'ancestorOrigins', {
        value: ['https://one.newrelic.com'],
        configurable: true,
      });
      fireEvent.click(openEntityButton);
      expect(nr1.navigation.getOpenEntityLocation).toHaveBeenCalledWith(
        'ent-1',
        {
          platformState: { accountId: 1 },
        }
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
      renderBoard();
      const rootCard = screen.getByText('Root WL').closest('.workload-card');
      act(() => {
        fireEvent.click(rootCard);
      });
      act(() => {
        jest.advanceTimersByTime(200);
      });
      expect(screen.getByText('Child WL')).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  describe('URL state sync (back/forward)', () => {
    const workloadsWithChild = [
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

    it('records the drill-down path in urlState, preserving boardId', () => {
      jest.useFakeTimers();
      try {
        const setUrl = jest.fn();
        nr1.useNerdletState.mockReturnValue([{ boardId: 'b-1' }, setUrl]);
        setHookDefaults({ useDataManager: { data: workloadsWithChild } });
        renderBoard();
        const rootCard = screen.getByText('Root WL').closest('.workload-card');
        act(() => fireEvent.click(rootCard));

        // patchUrlState uses the functional updater form; invoke each with a prior
        // state to assert one patch keeps boardId and records the drill-down path.
        const patches = setUrl.mock.calls.map(([u]) => u({ boardId: 'b-1' }));
        expect(patches).toContainEqual({
          boardId: 'b-1',
          path: ['root'],
          tab: null,
        });
      } finally {
        jest.useRealTimers();
      }
    });

    it('records the selected entity in urlState when an entity row is clicked', () => {
      jest.useFakeTimers();
      try {
        const setUrl = jest.fn();
        nr1.useNerdletState.mockReturnValue([{ boardId: 'b-1' }, setUrl]);
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
        setHookDefaults({ useDataManager: { data: workloads } });
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
        renderBoard();
        act(() =>
          fireEvent.click(screen.getByText('Root WL').closest('.workload-card'))
        );
        act(() => jest.advanceTimersByTime(200));
        fireEvent.click(screen.getByText('My Entity').closest('.entity-row'));

        const patches = setUrl.mock.calls.map(([u]) =>
          u({ boardId: 'b-1', path: ['root'] })
        );
        expect(patches).toContainEqual(
          expect.objectContaining({ issuesEntityGuid: 'ent-1' })
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it('deep-links straight to a drilled level from urlState.path', () => {
      jest.useFakeTimers();
      try {
        nr1.useNerdletState.mockReturnValue([
          { boardId: 'b-1', path: ['root'] },
          jest.fn(),
        ]);
        setHookDefaults({ useDataManager: { data: workloadsWithChild } });
        renderBoard();
        act(() => jest.advanceTimersByTime(200));
        // The child level is shown without any click.
        expect(screen.getByText('Child WL')).toBeInTheDocument();
      } finally {
        jest.useRealTimers();
      }
    });

    it('opens the entity issues modal from urlState.issuesEntityGuid', () => {
      jest.useFakeTimers();
      try {
        nr1.useNerdletState.mockReturnValue([
          { boardId: 'b-1', path: ['root'], issuesEntityGuid: 'ent-1' },
          jest.fn(),
        ]);
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
        const issuesTree = [
          {
            issues: [],
            children: [
              {
                issues: [
                  {
                    issueId: 'i-1',
                    issueLink: 'https://example.com/i-1',
                    priority: 'CRITICAL',
                    title: ['Something broke'],
                    activatedAt: 1,
                  },
                ],
              },
            ],
          },
        ];
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
        renderBoard();
        act(() => jest.advanceTimersByTime(200));
        expect(screen.getByText('Entity issues')).toBeInTheDocument();
        expect(screen.getByText('Something broke')).toBeInTheDocument();
      } finally {
        jest.useRealTimers();
      }
    });
  });
});

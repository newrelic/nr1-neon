import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

import * as nr1 from 'nr1';
import SettingsModal from '../index';
import { AppContext } from '../../../contexts';

const wrap = (ui, appCtx = { account: {}, accounts: [] }) =>
  render(<AppContext.Provider value={appCtx}>{ui}</AppContext.Provider>);

const entity = (guid, name, extras = {}) => ({
  guid,
  name,
  accountId: 1,
  alertSeverity: 'NOT_ALERTING',
  ...extras,
});

const setEntitySearchResult = ({ count, entities }) => {
  nr1.useEntitySearchQuery.mockReturnValue({
    data: { count, entities },
    fetchMore: jest.fn(),
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  setEntitySearchResult({ count: 0, entities: [] });
});

describe('SettingsModal', () => {
  it('is hidden when isSettingsModalOpen is false', () => {
    wrap(<SettingsModal isSettingsModalOpen={false} />);
    // Modal renders its content inside a <dialog>. The frame animation state
    // should not include slide-in when hidden.
    const frame = document.querySelector('.modal-frame');
    expect(frame.className).not.toMatch(/slide-in/);
  });

  it('renders the Settings heading and Save/Cancel buttons when open', () => {
    wrap(<SettingsModal isSettingsModalOpen={true} />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('shows the empty state when no workloads are selected', () => {
    wrap(<SettingsModal isSettingsModalOpen={true} />);
    expect(screen.getByText('No workloads selected')).toBeInTheDocument();
  });

  it('shows saved workloads on the selected panel when opened', () => {
    setEntitySearchResult({ count: 0, entities: [] });
    wrap(
      <SettingsModal
        isSettingsModalOpen={true}
        savedWorkloads={[
          { guid: 'g-1', name: 'saved-one', accountId: 1 },
          { guid: 'g-2', name: 'saved-two', accountId: 1 },
        ]}
      />
    );
    expect(screen.getByText('saved-one')).toBeInTheDocument();
    expect(screen.getByText('saved-two')).toBeInTheDocument();
    // Selected count badge.
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('removes a workload from the selection when its remove button is clicked', () => {
    wrap(
      <SettingsModal
        isSettingsModalOpen={true}
        savedWorkloads={[{ guid: 'g-1', name: 'one', accountId: 1 }]}
      />
    );
    fireEvent.click(screen.getByLabelText('Remove one'));
    expect(screen.queryByText('one')).toBeNull();
    expect(screen.getByText('No workloads selected')).toBeInTheDocument();
  });

  it('calls onSave with selected workloads and hideUnacknowledged when Save is clicked', async () => {
    setEntitySearchResult({
      count: 2,
      entities: [entity('g-a', 'a'), entity('g-b', 'b')],
    });
    const onSave = jest.fn(async () => ({}));
    const setIsSettingsModalOpen = jest.fn();
    wrap(
      <SettingsModal
        isSettingsModalOpen={true}
        savedWorkloads={[{ guid: 'g-a', name: 'a', accountId: 1 }]}
        savedHideUnacknowledged={false}
        onSave={onSave}
        setIsSettingsModalOpen={setIsSettingsModalOpen}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        workloads: [
          expect.objectContaining({ guid: 'g-a', name: 'a', accountId: 1 }),
        ],
        hideUnacknowledged: false,
      })
    );
    expect(setIsSettingsModalOpen).toHaveBeenCalledWith(false);
  });

  it('does not close the modal when onSave returns an error, and surfaces the message', async () => {
    const onSave = jest.fn(async () => ({ error: new Error('boom') }));
    const setIsSettingsModalOpen = jest.fn();
    wrap(
      <SettingsModal
        isSettingsModalOpen={true}
        savedWorkloads={[{ guid: 'g-a', name: 'a', accountId: 1 }]}
        onSave={onSave}
        setIsSettingsModalOpen={setIsSettingsModalOpen}
      />
    );
    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });
    expect(onSave).toHaveBeenCalled();
    expect(setIsSettingsModalOpen).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole('alert').textContent).toMatch(
      /Couldn.?t save settings/
    );
    expect(screen.getByRole('alert').textContent).toMatch(/boom/);
  });

  it('closes the modal when Cancel is clicked', () => {
    const setIsSettingsModalOpen = jest.fn();
    wrap(
      <SettingsModal
        isSettingsModalOpen={true}
        setIsSettingsModalOpen={setIsSettingsModalOpen}
      />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(setIsSettingsModalOpen).toHaveBeenCalledWith(false);
  });

  it('resets its selection to savedWorkloads each time it reopens', () => {
    const { rerender } = wrap(
      <SettingsModal
        isSettingsModalOpen={true}
        savedWorkloads={[{ guid: 'g-1', name: 'one', accountId: 1 }]}
      />
    );
    // Remove the workload from the selection.
    fireEvent.click(screen.getByLabelText('Remove one'));
    expect(screen.queryByText('one')).toBeNull();

    // Close then reopen the modal.
    rerender(
      <AppContext.Provider value={{ account: {}, accounts: [] }}>
        <SettingsModal
          isSettingsModalOpen={false}
          savedWorkloads={[{ guid: 'g-1', name: 'one', accountId: 1 }]}
        />
      </AppContext.Provider>
    );
    rerender(
      <AppContext.Provider value={{ account: {}, accounts: [] }}>
        <SettingsModal
          isSettingsModalOpen={true}
          savedWorkloads={[{ guid: 'g-1', name: 'one', accountId: 1 }]}
        />
      </AppContext.Provider>
    );
    expect(screen.getByText('one')).toBeInTheDocument();
  });

  it('toggles the hideUnacknowledged switch and passes the value to onSave', async () => {
    const onSave = jest.fn(async () => ({}));
    wrap(
      <SettingsModal
        isSettingsModalOpen={true}
        savedWorkloads={[{ guid: 'g-a', name: 'a', accountId: 1 }]}
        savedHideUnacknowledged={false}
        onSave={onSave}
        setIsSettingsModalOpen={jest.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText('Hide unacknowledged count'));
    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ hideUnacknowledged: true })
    );
  });
});

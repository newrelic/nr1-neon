import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

import * as nr1 from 'nr1';
import WorkloadsModal from '../index';
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

describe('WorkloadsModal', () => {
  it('renders the Workloads heading and Save/Cancel buttons when open', () => {
    wrap(<WorkloadsModal isWorkloadsModalOpen={true} />);
    expect(screen.getByText('Workloads')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('shows the empty state when no workloads are selected', () => {
    wrap(<WorkloadsModal isWorkloadsModalOpen={true} />);
    expect(screen.getByText('No workloads selected')).toBeInTheDocument();
  });

  it('shows saved workloads on the selected panel when opened', () => {
    wrap(
      <WorkloadsModal
        isWorkloadsModalOpen={true}
        savedWorkloads={[
          { guid: 'g-1', name: 'saved-one', accountId: 1 },
          { guid: 'g-2', name: 'saved-two', accountId: 1 },
        ]}
      />
    );
    expect(screen.getByText('saved-one')).toBeInTheDocument();
    expect(screen.getByText('saved-two')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('removes a workload from the selection when its remove button is clicked', () => {
    wrap(
      <WorkloadsModal
        isWorkloadsModalOpen={true}
        savedWorkloads={[{ guid: 'g-1', name: 'one', accountId: 1 }]}
      />
    );
    fireEvent.click(screen.getByLabelText('Remove one'));
    expect(screen.queryByText('one')).toBeNull();
    expect(screen.getByText('No workloads selected')).toBeInTheDocument();
  });

  it('calls onSave with the selected workloads when Save is clicked', async () => {
    setEntitySearchResult({
      count: 2,
      entities: [entity('g-a', 'a'), entity('g-b', 'b')],
    });
    const onSave = jest.fn(async () => ({}));
    const setIsWorkloadsModalOpen = jest.fn();
    wrap(
      <WorkloadsModal
        isWorkloadsModalOpen={true}
        savedWorkloads={[{ guid: 'g-a', name: 'a', accountId: 1 }]}
        onSave={onSave}
        setIsWorkloadsModalOpen={setIsWorkloadsModalOpen}
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
      })
    );
    expect(setIsWorkloadsModalOpen).toHaveBeenCalledWith(false);
  });

  it('does not close when onSave returns an error, and surfaces the message', async () => {
    const onSave = jest.fn(async () => ({ error: new Error('boom') }));
    const setIsWorkloadsModalOpen = jest.fn();
    wrap(
      <WorkloadsModal
        isWorkloadsModalOpen={true}
        savedWorkloads={[{ guid: 'g-a', name: 'a', accountId: 1 }]}
        onSave={onSave}
        setIsWorkloadsModalOpen={setIsWorkloadsModalOpen}
      />
    );
    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });
    expect(setIsWorkloadsModalOpen).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole('alert').textContent).toMatch(
      /Couldn.?t save workloads/
    );
    expect(screen.getByRole('alert').textContent).toMatch(/boom/);
  });

  it('closes the modal when Cancel is clicked', () => {
    const setIsWorkloadsModalOpen = jest.fn();
    wrap(
      <WorkloadsModal
        isWorkloadsModalOpen={true}
        setIsWorkloadsModalOpen={setIsWorkloadsModalOpen}
      />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(setIsWorkloadsModalOpen).toHaveBeenCalledWith(false);
  });

  it('resets its selection to savedWorkloads each time it reopens', () => {
    const rerenderWith = (open) => (
      <AppContext.Provider value={{ account: {}, accounts: [] }}>
        <WorkloadsModal
          isWorkloadsModalOpen={open}
          savedWorkloads={[{ guid: 'g-1', name: 'one', accountId: 1 }]}
        />
      </AppContext.Provider>
    );
    const { rerender } = wrap(
      <WorkloadsModal
        isWorkloadsModalOpen={true}
        savedWorkloads={[{ guid: 'g-1', name: 'one', accountId: 1 }]}
      />
    );
    fireEvent.click(screen.getByLabelText('Remove one'));
    expect(screen.queryByText('one')).toBeNull();

    rerender(rerenderWith(false));
    rerender(rerenderWith(true));
    expect(screen.getByText('one')).toBeInTheDocument();
  });
});

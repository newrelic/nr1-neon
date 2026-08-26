import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

import WorkloadGrid from '../index';

const workload = (over = {}) => ({
  guid: 'wl-1',
  name: 'API',
  status: 'OPERATIONAL',
  children: [],
  issues: [],
  ...over,
});

describe('WorkloadGrid', () => {
  it('renders nothing when workloads is empty', () => {
    const { container } = render(<WorkloadGrid workloads={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders one card per workload', () => {
    render(
      <WorkloadGrid
        workloads={[
          workload({ guid: 'a', name: 'Alpha' }),
          workload({ guid: 'b', name: 'Beta' }),
        ]}
      />
    );
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('calls onCardClick with the clicked workload when it has children', () => {
    const onCardClick = jest.fn();
    const w = workload({
      guid: 'root',
      name: 'Root',
      children: [{ guid: 'c', name: 'C' }],
    });
    render(<WorkloadGrid workloads={[w]} onCardClick={onCardClick} />);
    fireEvent.click(screen.getByText('Root').closest('.workload-card'));
    expect(onCardClick).toHaveBeenCalledWith(w);
  });

  it('does not call onCardClick for a workload without children', () => {
    const onCardClick = jest.fn();
    const w = workload({ name: 'NoKids', children: [] });
    render(<WorkloadGrid workloads={[w]} onCardClick={onCardClick} />);
    fireEvent.click(screen.getByText('NoKids').closest('.workload-card'));
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it('marks a childless card with the "no-data" chrome', () => {
    render(<WorkloadGrid workloads={[workload({ name: 'Orphan' })]} />);
    const card = screen.getByText('Orphan').closest('.workload-card');
    expect(card.className).toMatch(/no-data/);
  });

  it('does not mark cards as no-data while issues are still loading', () => {
    render(
      <WorkloadGrid
        workloads={[workload({ name: 'Alpha' })]}
        issuesLoading={true}
      />
    );
    const card = screen.getByText('Alpha').closest('.workload-card');
    expect(card.className).not.toMatch(/no-data/);
  });

  it('animates a workload swap via the fade timer before displaying new items', () => {
    jest.useFakeTimers();
    try {
      const { rerender } = render(
        <WorkloadGrid workloads={[workload({ guid: 'a', name: 'Old' })]} />
      );
      expect(screen.getByText('Old')).toBeInTheDocument();

      rerender(
        <WorkloadGrid workloads={[workload({ guid: 'b', name: 'New' })]} />
      );
      // During the fade-out window, the previous item is still shown.
      expect(screen.getByText('Old')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(200);
      });
      expect(screen.getByText('New')).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it('renders an owning-team badge when tagsByGuid has a "team" tag for the card', () => {
    render(
      <WorkloadGrid
        workloads={[workload({ guid: 'a', name: 'Alpha' })]}
        tagsByGuid={{ a: [{ key: 'team', values: ['payments'] }] }}
      />
    );
    expect(screen.getByText('payments')).toBeInTheDocument();
  });

  it('does not render an owning-team badge when tagsByGuid has no "team" tag', () => {
    render(
      <WorkloadGrid
        workloads={[workload({ guid: 'a', name: 'Alpha' })]}
        tagsByGuid={{ a: [{ key: 'env', values: ['prod'] }] }}
      />
    );
    expect(
      screen
        .getByText('Alpha')
        .closest('.workload-card')
        .querySelector('.badge.team')
    ).toBeNull();
  });

  it('does not animate when the id set is unchanged (only object identity changes)', () => {
    const first = [workload({ guid: 'a', name: 'A', status: 'OPERATIONAL' })];
    const second = [workload({ guid: 'a', name: 'A', status: 'DEGRADED' })];
    const { rerender } = render(<WorkloadGrid workloads={first} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    rerender(<WorkloadGrid workloads={second} />);
    // Rerender should reflect immediately (no fade).
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(
      screen.getByText('A').closest('.grid-wrapper').className
    ).not.toMatch(/leaving/);
  });
});

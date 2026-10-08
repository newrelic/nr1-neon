import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';

import WorkloadTriage, { PAGE_SIZE } from '..';

const wl = (guid, status, extra = {}) => ({
  guid,
  name: guid,
  status,
  children: [{ guid: `${guid}-app`, type: 'APPLICATION' }],
  issues: [],
  ...extra,
});

const cards = (container) =>
  [...container.querySelectorAll('.workload-card')].map((c) => ({
    name: c.querySelector('.name').textContent,
    minimized: c.classList.contains('minimized'),
  }));
const names = (container) => cards(container).map((c) => c.name);
const toggle = (label) => screen.getByText(label).closest('button');
const minimizeSwitch = () => screen.getByLabelText('Minimize healthy');

describe('WorkloadTriage', () => {
  it('sorts attention-needing workloads first and minimizes the rest by default', () => {
    const { container } = render(
      <WorkloadTriage
        workloads={[
          wl('ok-1', 'OPERATIONAL'),
          wl('deg-1', 'DEGRADED'),
          wl('unk-1', 'UNKNOWN', { issues: [{ issueId: 'i' }] }),
          wl('dis-1', 'DISRUPTED'),
          wl('unk-2', 'UNKNOWN'),
        ]}
      />
    );

    expect(cards(container)).toEqual([
      { name: 'dis-1', minimized: false },
      { name: 'deg-1', minimized: false },
      { name: 'unk-1', minimized: false },
      { name: 'ok-1', minimized: true },
      { name: 'unk-2', minimized: true },
    ]);
    // Minimized cards are name-only: no status badge or issues row.
    const minimizedCard = container.querySelector('.workload-card.minimized');
    expect(minimizedCard.querySelector('.meta')).toBeNull();
    expect(minimizedCard.querySelector('.issues')).toBeNull();
  });

  it('shows every card in full when "Minimize healthy" is switched off', () => {
    const { container } = render(
      <WorkloadTriage
        workloads={[wl('ok-1', 'OPERATIONAL'), wl('deg-1', 'DEGRADED')]}
      />
    );
    expect(minimizeSwitch()).toBeChecked();

    fireEvent.click(minimizeSwitch());

    expect(cards(container).every((c) => !c.minimized)).toBe(true);
  });

  it('counts workloads per status on the toggles and filters by the selected one', () => {
    const { container } = render(
      <WorkloadTriage
        workloads={[
          wl('a', 'OPERATIONAL'),
          wl('b', 'OPERATIONAL'),
          wl('c', 'DEGRADED'),
        ]}
      />
    );

    expect(within(toggle('Operational')).getByText('2')).toBeInTheDocument();
    expect(within(toggle('Degraded')).getByText('1')).toBeInTheDocument();
    expect(toggle('Disrupted')).toBeDisabled();

    fireEvent.click(toggle('Operational'));
    expect(toggle('Operational')).toHaveAttribute('aria-pressed', 'true');
    expect(names(container)).toEqual(['a', 'b']);

    // Clicking the active toggle again clears the filter.
    fireEvent.click(toggle('Operational'));
    expect(names(container)).toEqual(['c', 'a', 'b']);
  });

  it('narrows the grid and the toggle counts by the name filter', () => {
    const { container } = render(
      <WorkloadTriage
        workloads={[
          wl('payments-api', 'DEGRADED'),
          wl('payments-web', 'OPERATIONAL'),
          wl('search', 'DISRUPTED'),
        ]}
      />
    );

    fireEvent.change(screen.getByTestId('nr1-TextField'), {
      target: { value: 'PAY' },
    });

    expect(names(container)).toEqual(['payments-api', 'payments-web']);
    expect(toggle('Disrupted')).toBeDisabled();
  });

  it('explains that the filters matched nothing, and offers to clear them', () => {
    const { container } = render(
      <WorkloadTriage workloads={[wl('a', 'DEGRADED')]} />
    );
    fireEvent.change(screen.getByTestId('nr1-TextField'), {
      target: { value: 'zzz' },
    });

    expect(screen.getByText('No workloads match')).toBeInTheDocument();
    expect(
      screen.getByText(
        'None of the 1 workloads here match the selected filters.'
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('Clear filters'));
    expect(names(container)).toEqual(['a']);
  });

  it('pages the grid with "Show more"', () => {
    const many = Array.from({ length: PAGE_SIZE + 5 }, (_, i) =>
      wl(`ok-${String(i).padStart(3, '0')}`, 'OPERATIONAL')
    );
    const { container } = render(<WorkloadTriage workloads={many} />);

    expect(names(container)).toHaveLength(PAGE_SIZE);
    fireEvent.click(screen.getByText('Show 5 more (5 remaining)'));
    expect(names(container)).toHaveLength(PAGE_SIZE + 5);
  });

  it('drills into a minimized card when it has children', () => {
    const onCardClick = jest.fn();
    const plain = wl('ok', 'OPERATIONAL');
    const leaf = wl('leaf', 'OPERATIONAL', { children: [] });
    render(
      <WorkloadTriage workloads={[plain, leaf]} onCardClick={onCardClick} />
    );

    fireEvent.click(screen.getByText('ok').closest('.workload-card'));
    expect(onCardClick).toHaveBeenCalledWith(plain);

    fireEvent.click(screen.getByText('leaf').closest('.workload-card'));
    expect(onCardClick).toHaveBeenCalledTimes(1);
  });
});

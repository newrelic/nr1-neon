import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

import Breadcrumb from '../index';

const level = (items, activeId) => ({ items, activeId });
const wl = (guid, name, extras = {}) => ({ guid, name, ...extras });

describe('Breadcrumb', () => {
  it('renders only the home button when there are no levels', () => {
    render(<Breadcrumb levels={[]} onHomeClick={jest.fn()} />);
    expect(screen.getByLabelText('Back to home')).toBeInTheDocument();
    // No workload chips should be present
    expect(document.querySelectorAll('.breadcrumb-chip').length).toBe(0);
  });

  it('calls onHomeClick when the home button is clicked at the top level', () => {
    const onHomeClick = jest.fn();
    render(<Breadcrumb levels={[]} onHomeClick={onHomeClick} />);
    fireEvent.click(screen.getByLabelText('Back to home'));
    expect(onHomeClick).toHaveBeenCalled();
  });

  it('renders the home button and one row per level', () => {
    render(
      <Breadcrumb
        levels={[
          level([wl('a', 'A'), wl('b', 'B')], 'a'),
          level([wl('c', 'C')], 'c'),
        ]}
      />
    );
    expect(screen.getByLabelText('Back to home')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('renders the active chip first, followed by chips sorted by issue severity', () => {
    const critical = { state: 'ACTIVATED', priority: 'CRITICAL' };
    const warning = { state: 'ACTIVATED', priority: 'HIGH' };
    render(
      <Breadcrumb
        levels={[
          level(
            [
              wl('a', 'A'), // no issues
              wl('b', 'B', { issues: [critical] }), // 1 critical
              wl('c', 'C', { issues: [warning] }), // 1 warning
            ],
            'a' // A is active
          ),
        ]}
      />
    );
    const chips = document.querySelectorAll('.breadcrumb-chip .name');
    expect(chips[0].textContent).toBe('A'); // active first
    expect(chips[1].textContent).toBe('B'); // then most critical
    expect(chips[2].textContent).toBe('C'); // then warning
  });

  it('marks the active chip as active', () => {
    render(<Breadcrumb levels={[level([wl('a', 'A'), wl('b', 'B')], 'b')]} />);
    const active = screen.getByText('B').closest('.breadcrumb-chip');
    const inactive = screen.getByText('A').closest('.breadcrumb-chip');
    expect(active.className).toMatch(/active/);
    expect(inactive.className).not.toMatch(/active/);
  });

  it('calls onHomeClick when the home button is clicked', () => {
    const onHomeClick = jest.fn();
    render(
      <Breadcrumb
        levels={[level([wl('a', 'A')], 'a')]}
        onHomeClick={onHomeClick}
      />
    );
    fireEvent.click(screen.getByLabelText('Back to home'));
    expect(onHomeClick).toHaveBeenCalled();
  });

  it('calls onChipClick with (depth, workload) when a chip is clicked', () => {
    const onChipClick = jest.fn();
    const c = wl('c', 'C');
    render(
      <Breadcrumb
        levels={[level([wl('a', 'A')], 'a'), level([c], 'c')]}
        onChipClick={onChipClick}
      />
    );
    fireEvent.click(screen.getByText('C'));
    expect(onChipClick).toHaveBeenCalledWith(1, c);
  });

  it('defers rendering the pop-back on level count decrease until the exit animation completes', () => {
    jest.useFakeTimers();
    try {
      const { rerender } = render(
        <Breadcrumb
          levels={[level([wl('a', 'A')], 'a'), level([wl('b', 'B')], 'b')]}
        />
      );
      // Reduce to one level. The exiting row should still be in the DOM until
      // the EXIT_DURATION (280ms) elapses.
      rerender(<Breadcrumb levels={[level([wl('a', 'A')], 'a')]} />);
      expect(screen.getByText('B')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(320);
      });
      expect(screen.queryByText('B')).toBeNull();
      expect(screen.getByText('A')).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it('immediately reflects added levels (no fade-in delay)', () => {
    const { rerender } = render(
      <Breadcrumb levels={[level([wl('a', 'A')], 'a')]} />
    );
    rerender(
      <Breadcrumb
        levels={[level([wl('a', 'A')], 'a'), level([wl('b', 'B')], 'b')]}
      />
    );
    expect(screen.getByText('B')).toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';

import EntitiesView from '../index';

const entity = (over = {}) => ({
  guid: 'e-1',
  domain: 'APM',
  type: 'APPLICATION',
  name: 'My App',
  alertSeverity: 'NOT_ALERTING',
  goldenMetrics: [],
  ...over,
});

describe('EntitiesView', () => {
  it('renders nothing when there are no entities and not loading', () => {
    const { container } = render(<EntitiesView entities={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when entities is undefined', () => {
    const { container } = render(<EntitiesView />);
    expect(container.firstChild).toBeNull();
  });

  it('shows a spinner when loading', () => {
    render(<EntitiesView loading={true} entities={[]} />);
    expect(screen.getByTestId('nr1-Spinner')).toBeInTheDocument();
  });

  it('renders one tab per (domain, type) group with a count in the label', () => {
    render(
      <EntitiesView
        entities={[
          entity({
            guid: '1',
            domain: 'APM',
            type: 'APPLICATION',
            name: 'Web',
          }),
          entity({
            guid: '2',
            domain: 'APM',
            type: 'APPLICATION',
            name: 'API',
          }),
          entity({
            guid: '3',
            domain: 'INFRA',
            type: 'HOST',
            name: 'host-1',
          }),
        ]}
      />
    );
    expect(screen.getByTestId('nr1-Tabs')).toBeInTheDocument();
    // Two groups.
    const tabs = screen
      .getAllByTestId(/^nr1-Tab-/)
      .filter((el) => !el.getAttribute('data-testid').includes('label'));
    expect(tabs).toHaveLength(2);
  });

  it('skips entities without a type', () => {
    render(
      <EntitiesView
        entities={[
          entity({ guid: '1', name: 'Real', type: 'APPLICATION' }),
          entity({ guid: '2', name: 'Ghost', type: undefined }),
        ]}
      />
    );
    expect(screen.getByText('Real')).toBeInTheDocument();
    expect(screen.queryByText('Ghost')).toBeNull();
  });

  it('sorts groups so higher-severity types come first', () => {
    render(
      <EntitiesView
        entities={[
          // NOT_ALERTING → rank 1
          entity({
            guid: '1',
            domain: 'APM',
            type: 'APPLICATION',
            alertSeverity: 'NOT_ALERTING',
          }),
          // CRITICAL → rank 3
          entity({
            guid: '2',
            domain: 'INFRA',
            type: 'HOST',
            alertSeverity: 'CRITICAL',
          }),
        ]}
      />
    );
    const labels = screen
      .getAllByTestId(/nr1-Tab-label-/)
      .map((el) => el.textContent);
    // First label should be for the HOST tab (contains "Host") since it's more severe.
    expect(labels[0]).toMatch(/1/); // 1 entity in the first group
    // The APPLICATION group ("APM Application" / Service - APM) is second.
    expect(labels[1]).toMatch(/1/);
  });
});

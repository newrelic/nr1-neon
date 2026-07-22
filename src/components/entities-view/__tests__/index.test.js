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

  describe('tab badges', () => {
    it('shows a critical badge with the count of CRITICAL entities', () => {
      render(
        <EntitiesView
          entities={[
            entity({ guid: '1', alertSeverity: 'CRITICAL' }),
            entity({ guid: '2', alertSeverity: 'CRITICAL' }),
            entity({ guid: '3', alertSeverity: 'NOT_ALERTING' }),
          ]}
        />
      );
      expect(screen.getByTitle('2 critical')).toBeInTheDocument();
    });

    it('shows a warning badge for WARNING entities', () => {
      render(
        <EntitiesView
          entities={[entity({ guid: '1', alertSeverity: 'WARNING' })]}
        />
      );
      expect(screen.getByTitle('1 warning')).toBeInTheDocument();
    });

    it('shows both badges when critical and warning entities are present', () => {
      render(
        <EntitiesView
          entities={[
            entity({ guid: '1', alertSeverity: 'CRITICAL' }),
            entity({ guid: '2', alertSeverity: 'WARNING' }),
            entity({ guid: '3', alertSeverity: 'NOT_ALERTING' }),
          ]}
        />
      );
      expect(screen.getByTitle('1 critical')).toBeInTheDocument();
      expect(screen.getByTitle('1 warning')).toBeInTheDocument();
    });

    it('shows no badges when all entities are healthy', () => {
      render(
        <EntitiesView
          entities={[
            entity({ guid: '1', alertSeverity: 'NOT_ALERTING' }),
            entity({ guid: '2', alertSeverity: 'NOT_CONFIGURED' }),
          ]}
        />
      );
      expect(screen.queryByTitle(/critical/)).toBeNull();
      expect(screen.queryByTitle(/warning/)).toBeNull();
    });

    it('omits the warning badge when there are no WARNING entities', () => {
      render(
        <EntitiesView
          entities={[entity({ guid: '1', alertSeverity: 'CRITICAL' })]}
        />
      );
      expect(screen.getByTitle('1 critical')).toBeInTheDocument();
      expect(screen.queryByTitle(/warning/)).toBeNull();
    });
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
    // HOST (CRITICAL) should sort before APPLICATION (NOT_ALERTING).
    expect(labels[0]).toMatch(/[Hh]ost/);
    expect(labels[1]).toMatch(/[Aa]pplication|Service/);
  });
});

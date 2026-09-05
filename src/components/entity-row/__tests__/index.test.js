import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import EntityRow from '../index';

const entity = (over = {}) => ({
  guid: 'e-1',
  name: 'checkout-service',
  accountId: 42,
  alertSeverity: 'NOT_ALERTING',
  goldenMetrics: [],
  goldenTags: [],
  tags: [],
  ...over,
});

const renderRow = (props = {}) =>
  render(
    <EntityRow
      entity={entity()}
      gridTemplate="1fr"
      metricCount={0}
      {...props}
    />
  );

describe('EntityRow team + golden tags', () => {
  it('resolves a clickable team pill from nr.teamGuid and opens the team (not the row) on click', () => {
    const onClick = jest.fn();
    const onTeamClick = jest.fn();
    renderRow({
      entity: entity({
        tags: [{ key: 'nr.teamGuid', values: ['team-guid-1'] }],
      }),
      teamEntitiesByGuid: {
        'team-guid-1': { guid: 'team-guid-1', name: 'Payments', accountId: 7 },
      },
      onClick,
      onTeamClick,
    });

    const pill = screen.getByText('Payments').closest('.team-pill');
    expect(pill.tagName).toBe('BUTTON');
    fireEvent.click(pill);
    expect(onTeamClick).toHaveBeenCalledWith({
      guid: 'team-guid-1',
      accountId: 7,
    });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('falls back to a non-clickable name pill from the plain team tag', () => {
    const { container } = renderRow({
      entity: entity({ tags: [{ key: 'team', values: ['platform'] }] }),
      teamEntitiesByGuid: {},
    });
    expect(screen.getByText('platform')).toBeInTheDocument();
    expect(container.querySelector('button.team-pill')).toBeNull();
    expect(container.querySelector('span.team-pill')).not.toBeNull();
  });

  it('renders a golden-tags trigger listing all golden tags in its popover', () => {
    const { container } = renderRow({
      entity: entity({
        goldenTags: ['env', 'region'],
        tags: [
          { key: 'env', values: ['prod'] },
          { key: 'region', values: ['us-east-1'] },
          { key: 'ignored', values: ['x'] },
        ],
      }),
    });
    const trigger = container.querySelector('.golden-tags-trigger');
    expect(trigger).not.toBeNull();
    expect(trigger.getAttribute('aria-label')).toBe('Show 2 golden tags');
    // All golden tags are present in the (initially hidden) popover list.
    expect(screen.getByText('prod')).toBeInTheDocument();
    expect(screen.getByText('us-east-1')).toBeInTheDocument();
    // Non-golden tags are excluded.
    expect(screen.queryByText('ignored')).toBeNull();
  });

  it('renders no tag line when the entity has neither team nor golden tags', () => {
    const { container } = renderRow();
    expect(container.querySelector('.entity-tags')).toBeNull();
  });
});

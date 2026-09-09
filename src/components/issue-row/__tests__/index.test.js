import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import IssueRow from '../index';

const issue = (over = {}) => ({
  issueId: 'i-1',
  title: 'CPU high',
  priority: 'HIGH',
  activatedAt: Date.now(),
  entityGuids: ['ent-1'],
  incidentIds: ['inc-1'],
  ...over,
});

describe('IssueRow owning-team pill', () => {
  it('resolves a clickable team pill from an issue entity nr.teamGuid', () => {
    const onTeamClick = jest.fn();
    render(
      <IssueRow
        issue={issue({ entityGuids: ['ent-1'] })}
        entityTagsByGuid={{
          'ent-1': [{ key: 'nr.teamGuid', values: ['team-guid-1'] }],
        }}
        teamEntitiesByGuid={{
          'team-guid-1': {
            guid: 'team-guid-1',
            name: 'Payments',
            accountId: 7,
          },
        }}
        onTeamClick={onTeamClick}
      />
    );
    const pill = screen.getByText('Payments').closest('.team-pill');
    expect(pill.tagName).toBe('BUTTON');
    fireEvent.click(pill);
    expect(onTeamClick).toHaveBeenCalledWith({
      guid: 'team-guid-1',
      accountId: 7,
    });
  });

  it('shows one pill per distinct team across the issue entities', () => {
    render(
      <IssueRow
        issue={issue({ entityGuids: ['ent-1', 'ent-2', 'ent-3'] })}
        entityTagsByGuid={{
          'ent-1': [{ key: 'nr.teamGuid', values: ['team-guid-1'] }],
          'ent-2': [{ key: 'nr.teamGuid', values: ['team-guid-1'] }], // dup
          'ent-3': [{ key: 'nr.teamGuid', values: ['team-guid-2'] }],
        }}
        teamEntitiesByGuid={{
          'team-guid-1': {
            guid: 'team-guid-1',
            name: 'Payments',
            accountId: 7,
          },
          'team-guid-2': {
            guid: 'team-guid-2',
            name: 'Platform',
            accountId: 7,
          },
        }}
      />
    );
    expect(screen.getAllByText('Payments')).toHaveLength(1);
    expect(screen.getByText('Platform')).toBeInTheDocument();
  });

  it('renders no team pill when the issue entities have no team tags', () => {
    const { container } = render(
      <IssueRow issue={issue()} entityTagsByGuid={{ 'ent-1': [] }} />
    );
    expect(container.querySelector('.team-pill')).toBeNull();
  });
});

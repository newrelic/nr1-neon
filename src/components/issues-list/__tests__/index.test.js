import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import IssuesList from '../index';

const issue = (over = {}) => ({
  issueId: 'i-1',
  issueLink: 'https://example.com/i-1',
  priority: 'HIGH',
  title: ['Something broke'],
  activatedAt: Date.now() - 60_000,
  ...over,
});

describe('IssuesList', () => {
  it('renders the workload name and status pill', () => {
    render(
      <IssuesList
        workload={{ name: 'API', status: 'CRITICAL', issues: [issue()] }}
      />
    );
    expect(screen.getByText('API')).toBeInTheDocument();
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
  });

  it('shows "No active issues" and no toolbar when there are no issues', () => {
    render(<IssuesList workload={{ name: 'API', status: 'OPERATIONAL' }} />);
    expect(screen.getByText('No active issues')).toBeInTheDocument();
    expect(screen.queryByLabelText('Unacknowledged only')).toBeNull();
  });

  it('shows a success InlineMessage when the entity is not alerting', () => {
    render(
      <IssuesList
        workload={{ name: 'API', status: 'NOT_ALERTING' }}
        subjectLabel="Entity"
      />
    );
    const message = screen.getByTestId('nr1-InlineMessage');
    expect(message).toHaveAttribute('data-type', 'InlineMessage.TYPE.SUCCESS');
    expect(
      screen.getByText('This entity has no active issues.')
    ).toBeInTheDocument();
  });

  it('shows a plain (typeless) InlineMessage when the entity is not configured for alerting', () => {
    render(
      <IssuesList
        workload={{ name: 'API', status: 'NOT_CONFIGURED' }}
        subjectLabel="Entity"
      />
    );
    const message = screen.getByTestId('nr1-InlineMessage');
    expect(message).not.toHaveAttribute('data-type');
    expect(
      screen.getByText('This entity is not configured for alerting.')
    ).toBeInTheDocument();
  });

  it('shows an issue count and an unacknowledged suffix in the subtitle', () => {
    render(
      <IssuesList
        workload={{
          name: 'API',
          status: 'DEGRADED',
          issues: [
            issue({ issueId: 'a' }),
            issue({ issueId: 'b', acknowledgedAt: 1 }),
          ],
        }}
      />
    );
    expect(screen.getByText(/2 issues/)).toBeInTheDocument();
    expect(screen.getByText(/1 unacknowledged/)).toBeInTheDocument();
  });

  it('renders a single-issue subtitle in the singular form', () => {
    render(
      <IssuesList
        workload={{ name: 'X', status: 'CRITICAL', issues: [issue()] }}
      />
    );
    expect(screen.getByText(/^1 issue/)).toBeInTheDocument();
  });

  it('filters to unacknowledged when the switch is toggled on', () => {
    render(
      <IssuesList
        workload={{
          name: 'API',
          status: 'CRITICAL',
          issues: [
            issue({ issueId: 'unacked', title: ['un-acked'] }),
            issue({ issueId: 'acked', title: ['acked'], acknowledgedAt: 1 }),
          ],
        }}
      />
    );
    // Both visible initially.
    expect(screen.getByText('un-acked')).toBeInTheDocument();
    expect(screen.getByText('acked')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Unacknowledged only'));
    expect(screen.getByText('un-acked')).toBeInTheDocument();
    expect(screen.queryByText('acked')).toBeNull();
  });

  it('shows the "nothing matches this filter" empty state when unack-only filter has no matches', () => {
    render(
      <IssuesList
        workload={{
          name: 'API',
          status: 'CRITICAL',
          issues: [issue({ acknowledgedAt: 1 })],
        }}
      />
    );
    fireEvent.click(screen.getByLabelText('Unacknowledged only'));
    expect(screen.getByText('Nothing matches this filter')).toBeInTheDocument();
  });

  it('sorts issues by priority (CRITICAL first) then by activatedAt (newest first)', () => {
    const now = Date.now();
    render(
      <IssuesList
        workload={{
          name: 'API',
          status: 'CRITICAL',
          issues: [
            issue({
              issueId: 'l1',
              priority: 'LOW',
              title: ['low-old'],
              activatedAt: now - 100_000,
            }),
            issue({
              issueId: 'c1',
              priority: 'CRITICAL',
              title: ['crit-old'],
              activatedAt: now - 50_000,
            }),
            issue({
              issueId: 'c2',
              priority: 'CRITICAL',
              title: ['crit-new'],
              activatedAt: now - 10_000,
            }),
          ],
        }}
      />
    );
    const titles = Array.from(
      document.querySelectorAll('.issue-row .title')
    ).map((n) => n.textContent);
    expect(titles).toEqual(['crit-new', 'crit-old', 'low-old']);
  });

  it('wraps each issue row in a link that opens the issueLink in a new tab', () => {
    render(
      <IssuesList
        workload={{
          name: 'API',
          status: 'CRITICAL',
          issues: [issue({ issueLink: 'https://example.com/incident/1' })],
        }}
      />
    );
    const link = document.querySelector('a.issue-row-link');
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('https://example.com/incident/1');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('maps DISRUPTED to critical status class and OPERATIONAL to success', () => {
    const { rerender, container } = render(
      <IssuesList workload={{ name: 'X', status: 'DISRUPTED', issues: [] }} />
    );
    expect(container.querySelector('.issues-list').className).toMatch(
      /critical/
    );

    rerender(
      <IssuesList workload={{ name: 'X', status: 'OPERATIONAL', issues: [] }} />
    );
    expect(container.querySelector('.issues-list').className).toMatch(
      /success/
    );
  });

  it('renders UNKNOWN status label for missing workload status', () => {
    render(<IssuesList workload={undefined} />);
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
    expect(screen.getByText('Workload')).toBeInTheDocument(); // default title
  });

  it('uses subjectLabel for the eyebrow, default title, and empty-state hint', () => {
    render(
      <IssuesList
        workload={{ status: 'NOT_ALERTING', issues: [] }}
        subjectLabel="Entity"
      />
    );
    expect(screen.getByText('Entity issues')).toBeInTheDocument();
    expect(screen.getByText('NOT ALERTING')).toBeInTheDocument();
    expect(screen.getByText('Entity')).toBeInTheDocument(); // default title
    expect(
      screen.getByText('This entity has no active issues.')
    ).toBeInTheDocument();
  });

  it('renders an "Open Entity" button only when onOpenEntity is provided, and calls it on click', () => {
    const onOpenEntity = jest.fn();
    const { rerender } = render(
      <IssuesList workload={{ name: 'API', status: 'CRITICAL' }} />
    );
    expect(screen.queryByText('Open Entity')).toBeNull();

    rerender(
      <IssuesList
        workload={{ name: 'API', status: 'CRITICAL' }}
        onOpenEntity={onOpenEntity}
      />
    );
    fireEvent.click(screen.getByText('Open Entity'));
    expect(onOpenEntity).toHaveBeenCalledTimes(1);
  });
});

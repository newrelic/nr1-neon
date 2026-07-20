import React, { useState } from 'react';
import PropTypes from 'prop-types';

import { Switch } from 'nr1';

import IssueRow from '../issue-row';

// Workload status comes in two forms: the generic alert form (CRITICAL/WARNING) and the operational
// form (DISRUPTED/DEGRADED/OPERATIONAL). Both need to be mapped to CSS classes.
const mapStatus = (status) => {
  const s = (status ?? '').toUpperCase();
  if (s === 'CRITICAL' || s === 'DISRUPTED') return 'critical';
  if (s === 'WARNING' || s === 'DEGRADED') return 'warning';
  if (s === 'OPERATIONAL' || s === 'SUCCESS') return 'success';
  return 'unknown';
};

const workloadStatusLabel = (status) => {
  const s = (status ?? '').toUpperCase();
  if (s === 'CRITICAL') return 'CRITICAL';
  if (s === 'DISRUPTED') return 'DISRUPTED';
  if (s === 'DEGRADED' || s === 'WARNING') return 'DEGRADED';
  if (s === 'OPERATIONAL') return 'OPERATIONAL';
  return 'UNKNOWN';
};

const priorityRank = (priority) => {
  return { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[priority] ?? 0;
};

const IssuesList = ({ workload }) => {
  const [unackOnly, setUnackOnly] = useState(false);

  const status = mapStatus(workload?.status);
  const allIssues = workload?.issues ?? [];
  const unackCount = allIssues.filter((i) => !i.acknowledgedAt).length;

  const visibleIssues = allIssues
    .filter((issue) => (unackOnly ? !issue.acknowledgedAt : true))
    .slice()
    .sort((a, b) => {
      const pDiff = priorityRank(b.priority) - priorityRank(a.priority);
      if (pDiff !== 0) return pDiff;
      return (b.activatedAt ?? 0) - (a.activatedAt ?? 0);
    });

  return (
    <div className={`issues-list ${status}`}>
      <header className="header">
        <div className="eyebrow">
          <span className={`status-pill ${status}`}>
            {workloadStatusLabel(workload?.status)}
          </span>
          <span>Workload issues</span>
        </div>
        <h2 className="title">{workload?.name ?? 'Workload'}</h2>
        <div className="subtitle">
          {allIssues.length === 0
            ? 'No active issues'
            : `${allIssues.length} ${
                allIssues.length === 1 ? 'issue' : 'issues'
              }` + (unackCount > 0 ? ` · ${unackCount} unacknowledged` : '')}
        </div>
      </header>

      {allIssues.length > 0 && (
        <div className="toolbar">
          <Switch
            label="Unacknowledged only"
            checked={unackOnly}
            onChange={(e) => setUnackOnly(e.target.checked)}
          />
        </div>
      )}

      <div className="issues">
        {visibleIssues.length === 0 ? (
          <EmptyState hasAnyIssues={allIssues.length > 0} />
        ) : (
          visibleIssues.map((issue) => (
            <a
              key={issue.issueId}
              href={issue.issueLink}
              target="_blank"
              rel="noopener noreferrer"
              className="u-unstyledLink issue-row-link"
            >
              <IssueRow issue={issue} />
            </a>
          ))
        )}
      </div>
    </div>
  );
};

IssuesList.propTypes = {
  workload: PropTypes.object,
};

const EmptyState = ({ hasAnyIssues }) => {
  return (
    <div className="nx-issues-list__empty">
      <div className="nx-issues-list__empty-icon">✓</div>
      <div className="nx-issues-list__empty-title">
        {hasAnyIssues ? 'Nothing matches this filter' : 'All clear'}
      </div>
      <div className="nx-issues-list__empty-hint">
        {hasAnyIssues
          ? 'Turn off "Unacknowledged only" to see all issues.'
          : 'This workload has no active issues.'}
      </div>
    </div>
  );
};

EmptyState.propTypes = {
  hasAnyIssues: PropTypes.bool,
};

export default IssuesList;

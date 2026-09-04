import React, { useState } from 'react';
import PropTypes from 'prop-types';

import { Button, InlineMessage, Switch } from 'nr1';

import IssueRow from '../issue-row';

// Status comes in a few forms depending on the subject: the generic alert form (CRITICAL/WARNING),
// the workload operational form (DISRUPTED/DEGRADED/OPERATIONAL), and the entity alerting form
// (NOT_ALERTING/NOT_CONFIGURED). All need to be mapped to the same set of CSS classes.
const mapStatus = (status) => {
  const s = (status ?? '').toUpperCase();
  if (s === 'CRITICAL' || s === 'DISRUPTED') return 'critical';
  if (s === 'WARNING' || s === 'DEGRADED') return 'warning';
  if (s === 'OPERATIONAL' || s === 'SUCCESS' || s === 'NOT_ALERTING')
    return 'success';
  return 'unknown';
};

const statusLabel = (status) => {
  const s = (status ?? '').toUpperCase();
  if (s === 'CRITICAL') return 'CRITICAL';
  if (s === 'DISRUPTED') return 'DISRUPTED';
  if (s === 'DEGRADED' || s === 'WARNING') return 'DEGRADED';
  if (s === 'OPERATIONAL') return 'OPERATIONAL';
  if (s === 'NOT_ALERTING') return 'NOT ALERTING';
  if (s === 'NOT_CONFIGURED') return 'NOT CONFIGURED';
  return 'UNKNOWN';
};

const priorityRank = (priority) => {
  return { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[priority] ?? 0;
};

const IssuesList = ({
  workload,
  subjectLabel = 'Workload',
  onOpenEntity,
  entityNameByGuid,
  ancestorNames,
}) => {
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
            {statusLabel(workload?.status)}
          </span>
          <span>{subjectLabel} issues</span>
        </div>
        {ancestorNames?.length > 0 && (
          <div className="hierarchy-breadcrumb">
            {ancestorNames.map((name, i) => (
              <React.Fragment key={i}>
                <span className="crumb">{name}</span>
                <span className="crumb-sep">›</span>
              </React.Fragment>
            ))}
          </div>
        )}
        <h2 className="title">{workload?.name ?? subjectLabel}</h2>
        <div className="subtitle">
          {allIssues.length === 0
            ? 'No active issues'
            : `${allIssues.length} ${
                allIssues.length === 1 ? 'issue' : 'issues'
              }` + (unackCount > 0 ? ` · ${unackCount} unacknowledged` : '')}
        </div>
        {onOpenEntity && (
          <div className="header-actions">
            <Button
              sizeType={Button.SIZE_TYPE.SMALL}
              iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__EXTERNAL_LINK}
              onClick={onOpenEntity}
            >
              Open Entity
            </Button>
          </div>
        )}
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
          <EmptyState
            hasAnyIssues={allIssues.length > 0}
            subjectLabel={subjectLabel}
            status={workload?.status}
          />
        ) : (
          visibleIssues.map((issue) => (
            <a
              key={issue.issueId}
              href={issue.issueLink}
              target="_blank"
              rel="noopener noreferrer"
              className="u-unstyledLink issue-row-link"
            >
              <IssueRow issue={issue} entityNameByGuid={entityNameByGuid} />
            </a>
          ))
        )}
      </div>
    </div>
  );
};

IssuesList.propTypes = {
  workload: PropTypes.object,
  subjectLabel: PropTypes.string,
  onOpenEntity: PropTypes.func,
  entityNameByGuid: PropTypes.instanceOf(Map),
  ancestorNames: PropTypes.array,
};

const EmptyState = ({ hasAnyIssues, subjectLabel, status }) => {
  if (!hasAnyIssues) {
    // This empty state is only ever reached for entities (workloads only open the modal once they
    // have issues), so status here is an alertSeverity value: NOT_ALERTING or NOT_CONFIGURED.
    const isNotConfigured = (status ?? '').toUpperCase() === 'NOT_CONFIGURED';
    return (
      <div className="empty-message">
        <InlineMessage
          type={isNotConfigured ? undefined : InlineMessage.TYPE.SUCCESS}
          label={
            isNotConfigured
              ? `This ${subjectLabel.toLowerCase()} is not configured for alerting.`
              : `This ${subjectLabel.toLowerCase()} has no active issues.`
          }
        />
      </div>
    );
  }

  return (
    <div className="nx-issues-list__empty">
      <div className="nx-issues-list__empty-title">
        Nothing matches this filter
      </div>
      <div className="nx-issues-list__empty-hint">
        Turn off &quot;Unacknowledged only&quot; to see all issues.
      </div>
    </div>
  );
};

EmptyState.propTypes = {
  hasAnyIssues: PropTypes.bool,
  subjectLabel: PropTypes.string,
  status: PropTypes.string,
};

export default IssuesList;

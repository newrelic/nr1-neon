import React from 'react';
import PropTypes from 'prop-types';

import { Icon } from 'nr1';

const formatDuration = (activatedAt) => {
  if (!activatedAt) return '—';
  const elapsed = Date.now() - activatedAt;
  const sec = Math.floor(elapsed / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (day >= 1) return `${day}d ago`;
  if (hr >= 1) return `${hr}h ago`;
  if (min >= 1) return `${min}m ago`;
  return 'just now';
};

const IssueRow = ({ issue, onClick }) => {
  const priority = (issue.priority ?? 'low').toLowerCase();
  const isAcked = !!issue.acknowledgedAt;
  const title = Array.isArray(issue.title)
    ? issue.title.join(' · ')
    : issue.title;
  const entityCount = issue.entityGuids?.length ?? 0;
  const incidentCount = issue.incidentIds?.length ?? 0;
  const duration = formatDuration(issue.activatedAt);

  return (
    <button
      type="button"
      className={`u-unstyledButton issue-row ${priority}`}
      onClick={onClick}
    >
      <div className="details">
        <div className="title">{title}</div>
        <div className="meta">
          <span className={`priority ${priority}`}>
            {issue.priority ?? '-'}
          </span>
          {isAcked ? (
            <span className="ack-label ack">Acknowledged</span>
          ) : (
            <span className="ack-label unack">Unacknowledged</span>
          )}
          <span className="sep" />
          <span
            className="duration"
            title={`Activated ${new Date(issue.activatedAt).toLocaleString()}`}
          >
            {duration}
          </span>
          {incidentCount > 1 && (
            <>
              <span className="sep" />
              <span>{incidentCount} incidents</span>
            </>
          )}
          {entityCount > 1 && (
            <>
              <span className="sep" />
              <span>{entityCount} entities</span>
            </>
          )}
          {issue.isCorrelated && (
            <>
              <span className="sep" />
              <span className="flag">Correlated</span>
            </>
          )}
          {issue.isIdle && (
            <>
              <span className="sep" />
              <span className="flag idle">Idle</span>
            </>
          )}
        </div>
      </div>
      <span className="chevron">
        <Icon type={Icon.TYPE.INTERFACE__CHEVRON__CHEVRON_RIGHT} />
      </span>
    </button>
  );
};

IssueRow.propTypes = {
  issue: PropTypes.object,
  onClick: PropTypes.func,
};

export default IssueRow;

import React from 'react';
import PropTypes from 'prop-types';

import { Icon } from 'nr1';

const ENTITY_ICON_TYPE =
  Icon.TYPE.HARDWARE_AND_SOFTWARE__SOFTWARE__ENTITY__WEIGHT_BOLD__SIZE_8;

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

const IssueRow = ({ issue, entityNameByGuid }) => {
  const priority = (issue.priority ?? 'low').toLowerCase();
  const isAcked = !!issue.acknowledgedAt;
  // The NR1 issues API returns title as an array when multiple conditions contributed to the issue.
  const title = Array.isArray(issue.title)
    ? issue.title.join(' · ')
    : issue.title;
  const entityCount = issue.entityGuids?.length ?? 0;
  const incidentCount = issue.incidentIds?.length ?? 0;
  const duration = formatDuration(issue.activatedAt);
  // Only resolvable when opened from a WorkloadCard, which has the full
  // entity subtree in scope; the EntityRow path falls back to the count.
  const entityNames = entityNameByGuid
    ? (issue.entityGuids || [])
        .map((guid) => entityNameByGuid.get(guid))
        .filter(Boolean)
    : [];

  return (
    <div className={`issue-row ${priority}`}>
      <div className="details">
        <div className="title">{title}</div>
        {entityNames.length > 0 && (
          <div className="entities-pills" title={entityNames.join(', ')}>
            {entityNames.map((name) => (
              <span className="entity-pill" key={name}>
                <Icon className="entities-icon" type={ENTITY_ICON_TYPE} />
                {name}
              </span>
            ))}
          </div>
        )}
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
          {entityNames.length === 0 && entityCount > 1 && (
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
    </div>
  );
};

IssueRow.propTypes = {
  issue: PropTypes.object,
  entityNameByGuid: PropTypes.instanceOf(Map),
};

export default IssueRow;

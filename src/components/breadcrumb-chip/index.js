import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import { workloadStatusClass } from '../../utils';

const titleText = (count, type) =>
  `${count} ${type} ${count === 1 ? 'issue' : 'issues'}`;

const summarizeIssueSeverity = (issues = []) => {
  let criticalCount = 0;
  let warningCount = 0;
  for (const issue of issues) {
    if (issue.state !== 'ACTIVATED') continue; // only count open issues; resolved/closed still appear in the array
    if (issue.priority === 'CRITICAL') criticalCount += 1;
    else if (issue.priority === 'HIGH' || issue.priority === 'MEDIUM')
      // HIGH/MEDIUM both map to the warning bucket
      warningCount += 1;
  }
  return { criticalCount, warningCount };
};

const BreadcrumbChip = ({
  workload,
  isActive,
  height,
  fontSize,
  isCurrentSelection,
  onClick,
}) => {
  const [status, setStatus] = useState('');
  const [criticalCount, setCriticalCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);

  useEffect(() => {
    const issuesCountBySeverity = summarizeIssueSeverity(workload.issues);
    setCriticalCount(issuesCountBySeverity.criticalCount);
    setWarningCount(issuesCountBySeverity.warningCount);
    setStatus(workloadStatusClass(workload));
  }, [workload]);

  const hasBadges = useMemo(
    () => criticalCount > 0 || warningCount > 0,
    [criticalCount, warningCount]
  );

  return (
    <button
      type="button"
      className={`u-unstyledButton breadcrumb-chip ${status}${
        isActive ? ' active' : ''
      }${isCurrentSelection ? ' current-selection' : ''}`}
      style={{ height, fontSize }}
      onClick={() => onClick && onClick(workload)}
      title={workload.name}
    >
      <span className="name">{workload.name}</span>
      {hasBadges && (
        <span className="badges">
          {criticalCount > 0 && (
            <span
              className="badge critical"
              title={titleText(criticalCount, 'critical')}
            >
              {criticalCount}
            </span>
          )}
          {warningCount > 0 && (
            <span
              className="badge warning"
              title={titleText(warningCount, 'warning')}
            >
              {warningCount}
            </span>
          )}
        </span>
      )}
    </button>
  );
};

BreadcrumbChip.propTypes = {
  workload: PropTypes.object,
  isActive: PropTypes.bool,
  height: PropTypes.number,
  fontSize: PropTypes.number,
  isCurrentSelection: PropTypes.bool,
  onClick: PropTypes.func,
};

export default BreadcrumbChip;

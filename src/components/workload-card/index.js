import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import { Icon, Spinner } from 'nr1';

import IssuesButton from '../issues-button';
import KpiRow from '../kpi-row';
import { WORKLOAD_STATUSES } from '../../constants';

const WorkloadCard = ({
  name,
  status = WORKLOAD_STATUSES.UNKNOWN,
  entityCount,
  issuesCount = 0,
  unacknowledgedCount = 0,
  hideUnacknowledged = false,
  issuesLoading,
  kpis,
  kpisDefaultExpanded = true,
  onClick,
  onIssuesClick,
}) => {
  const [kpisExpanded, setKpisExpanded] = useState(kpisDefaultExpanded);
  const hasKpis = useMemo(() => Array.isArray(kpis) && kpis.length > 0, [kpis]);

  const statusClass = useMemo(() => {
    if (status === WORKLOAD_STATUSES.OPERATIONAL) return 'success';
    if (status === WORKLOAD_STATUSES.DEGRADED) return 'warning';
    if (status === WORKLOAD_STATUSES.DISRUPTED) return 'critical';
    if (status === WORKLOAD_STATUSES.UNKNOWN) return 'unknown';
    return 'unknown';
  }, [status]);

  const issuesBlock = useMemo(() => {
    if (issuesLoading) return <Spinner inline type={Spinner.TYPE.DOT} />;
    if (issuesCount)
      return (
        <IssuesButton
          issuesCount={issuesCount}
          unacknowledgedCount={unacknowledgedCount}
          hideUnacknowledged={hideUnacknowledged}
          onClick={(e) => {
            e.stopPropagation();
            if (onIssuesClick) onIssuesClick();
          }}
        />
      );
    return <span className="no-issues">No active issues</span>;
  }, [
    issuesLoading,
    issuesCount,
    unacknowledgedCount,
    hideUnacknowledged,
    onIssuesClick,
  ]);

  const handleKpiToggleClick = (e) => {
    e.stopPropagation();
    setKpisExpanded((prev) => !prev);
  };

  return (
    <div
      className={`workload-card ${onClick ? 'clickable' : ''} ${statusClass}`}
      onClick={onClick}
    >
      <div className="header">
        <h3 className="name" title={name}>
          {name}
        </h3>
      </div>

      <div className="meta">
        <span className={`badge status ${statusClass}`}>
          {status ?? 'UNKNOWN'}
        </span>
        {typeof entityCount === 'number' && (
          <span className="entity-count">
            {entityCount} {entityCount === 1 ? 'entity' : 'entities'}
          </span>
        )}
      </div>

      <div className="issues">{issuesBlock}</div>

      {hasKpis && (
        <div className={`kpis ${kpisExpanded ? 'expanded' : ''}`}>
          <button
            type="button"
            className="u-unstyledButton toggle-btn"
            aria-expanded={kpisExpanded}
            onClick={handleKpiToggleClick}
          >
            <span className="label">
              Metrics
              <span className="count">· {kpis.length}</span>
            </span>
            <span className="chevron">
              <Icon type={Icon.TYPE.INTERFACE__CHEVRON__CHEVRON_BOTTOM} />
            </span>
          </button>
          <div className="content">
            <div className="kpi-list">
              {kpis.map((kpi, i) => (
                <KpiRow key={kpi.label ?? i} kpi={kpi} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

WorkloadCard.propTypes = {
  name: PropTypes.string,
  status: PropTypes.oneOf(Object.values(WORKLOAD_STATUSES)),
  entityCount: PropTypes.number,
  issuesCount: PropTypes.number,
  unacknowledgedCount: PropTypes.number,
  hideUnacknowledged: PropTypes.bool,
  issuesLoading: PropTypes.bool,
  kpis: PropTypes.array,
  kpisDefaultExpanded: PropTypes.bool,
  onClick: PropTypes.func,
  onIssuesClick: PropTypes.func,
};

export default WorkloadCard;

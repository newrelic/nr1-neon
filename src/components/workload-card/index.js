import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import { Icon, Spinner } from 'nr1';

import IssuesButton from '../issues-button';
import KpiRow from '../kpi-row';
import TeamBadges from '../team-badges';
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
  tags,
  teamEntitiesByGuid = {},
  isUnclickable = false,
  onClick,
  onIssuesClick,
  onTeamClick,
}) => {
  const isStatusKnown = !!status && status !== WORKLOAD_STATUSES.UNKNOWN;
  // Card is "no data" if it can't be drilled into AND we don't have a status
  // for it either. With known status, we still mute the card but keep the
  // real status badge so users see useful info.
  const showNoDataBadge = isUnclickable && !isStatusKnown;
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
          onClick={onIssuesClick}
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
      className={`workload-card ${onClick ? 'clickable' : ''} ${statusClass}${
        isUnclickable ? ' no-data' : ''
      }`}
      onClick={onClick}
      title={
        isUnclickable
          ? showNoDataBadge
            ? 'No data returned for this workload from NerdGraph. Try clicking Refresh; if it persists, the workload may have no constituents or be in a stale state.'
            : 'This workload returned no children from NerdGraph, so it can’t be drilled into. Status is shown above. Try clicking Refresh.'
          : undefined
      }
    >
      <div className="header">
        <h3 className="name" title={name}>
          {name}
        </h3>
      </div>

      <div className="meta">
        {showNoDataBadge ? (
          <span className="badge status no-data">NO DATA</span>
        ) : (
          <span className={`badge status ${statusClass}`}>
            {status ?? 'UNKNOWN'}
          </span>
        )}
        {typeof entityCount === 'number' && (
          <span className="entity-count">
            {entityCount} {entityCount === 1 ? 'entity' : 'entities'}
          </span>
        )}
        <TeamBadges
          tags={tags}
          teamEntitiesByGuid={teamEntitiesByGuid}
          onTeamClick={onTeamClick}
        />
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
  tags: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      values: PropTypes.arrayOf(PropTypes.string),
    })
  ),
  teamEntitiesByGuid: PropTypes.object,
  isUnclickable: PropTypes.bool,
  onClick: PropTypes.func,
  onIssuesClick: PropTypes.func,
  onTeamClick: PropTypes.func,
};

export default WorkloadCard;

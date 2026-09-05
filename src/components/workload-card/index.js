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
  tags,
  isUnclickable = false,
  onClick,
  onIssuesClick,
}) => {
  const isStatusKnown = !!status && status !== WORKLOAD_STATUSES.UNKNOWN;
  // Card is "no data" if it can't be drilled into AND we don't have a status
  // for it either. With known status, we still mute the card but keep the
  // real status badge so users see useful info.
  const showNoDataBadge = isUnclickable && !isStatusKnown;
  const [kpisExpanded, setKpisExpanded] = useState(kpisDefaultExpanded);
  const hasKpis = useMemo(() => Array.isArray(kpis) && kpis.length > 0, [kpis]);
  const owningTeams = useMemo(() => {
    const teamTag = (tags || []).find((t) => t?.key === 'team');
    return teamTag?.values?.filter(Boolean) ?? [];
  }, [tags]);

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
        {owningTeams.length > 0 && (
          <span
            className="badge team"
            title={`Owning team: ${owningTeams.join(', ')}`}
          >
            <TeamIcon />
            {owningTeams.join(', ')}
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
  tags: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      values: PropTypes.arrayOf(PropTypes.string),
    })
  ),
  isUnclickable: PropTypes.bool,
  onClick: PropTypes.func,
  onIssuesClick: PropTypes.func,
};

export default WorkloadCard;

// Same icon used by New Relic's Teams nerdlet, so a workload's owning-team
// badge is visually consistent with the Teams UI elsewhere in New Relic.
function TeamIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="currentColor"
      focusable="false"
    >
      <path d="M6.499 10c2.21 0 3.61.708 4.45 1.672.826.947 1.051 2.075 1.051 2.828a.5.5 0 01-1 0c0-.58-.178-1.453-.805-2.172C9.583 11.625 8.482 11 6.5 11c-1.982 0-3.082.625-3.694 1.328C2.179 13.048 2 13.92 2 14.5a.5.5 0 01-1 0c0-.752.225-1.88 1.05-2.828C2.89 10.708 4.29 10 6.499 10zM12.626 9.255c1.433.373 2.295 1.12 2.788 1.958.483.823.586 1.69.586 2.287a.5.5 0 01-1 0c0-.495-.086-1.167-.447-1.781-.352-.599-.99-1.188-2.179-1.497a.5.5 0 01.252-.967z" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.5 1C8.433 1 10 2.679 10 4.75 10 6.821 8.433 8.5 6.5 8.5S3 6.821 3 4.75C3 2.679 4.567 1 6.5 1zm0 1C5.183 2 4 3.165 4 4.75S5.183 7.5 6.5 7.5 9 6.335 9 4.75 7.817 2 6.5 2z"
      />
      <path d="M11.05 2.512a.5.5 0 01.667-.234c1.067.513 1.783 1.665 1.783 2.972s-.716 2.459-1.783 2.972a.5.5 0 01-.434-.902c.699-.335 1.217-1.122 1.217-2.07 0-.948-.518-1.736-1.217-2.071a.5.5 0 01-.233-.667z" />
    </svg>
  );
}

import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import { Button, Switch, TextField } from 'nr1';

import WorkloadGrid from '../workload-grid';
import { WORKLOAD_STATUSES } from '../../constants';
import { workloadStatusClass } from '../../utils';

export const PAGE_SIZE = 60;

const STATUS_ORDER = [
  WORKLOAD_STATUSES.DISRUPTED,
  WORKLOAD_STATUSES.DEGRADED,
  WORKLOAD_STATUSES.OPERATIONAL,
  WORKLOAD_STATUSES.UNKNOWN,
];
const STATUS_LABELS = {
  [WORKLOAD_STATUSES.DISRUPTED]: 'Disrupted',
  [WORKLOAD_STATUSES.DEGRADED]: 'Degraded',
  [WORKLOAD_STATUSES.OPERATIONAL]: 'Operational',
  [WORKLOAD_STATUSES.UNKNOWN]: 'Unknown',
};
const STATUS_RANK = {
  [WORKLOAD_STATUSES.DISRUPTED]: 3,
  [WORKLOAD_STATUSES.DEGRADED]: 2,
  [WORKLOAD_STATUSES.OPERATIONAL]: 1,
  [WORKLOAD_STATUSES.UNKNOWN]: 0,
};

const statusOf = (w) =>
  STATUS_RANK[w?.status] !== undefined ? w.status : WORKLOAD_STATUSES.UNKNOWN;

// A workload needs attention when it's unhealthy or has open issues.
export const needsAttention = (w) =>
  statusOf(w) === WORKLOAD_STATUSES.DISRUPTED ||
  statusOf(w) === WORKLOAD_STATUSES.DEGRADED ||
  (w?.issues?.length ?? 0) > 0;

// Workloads needing attention first, then worst status, most issues, name.
const worstFirst = (a, b) =>
  needsAttention(b) - needsAttention(a) ||
  STATUS_RANK[statusOf(b)] - STATUS_RANK[statusOf(a)] ||
  (b?.issues?.length ?? 0) - (a?.issues?.length ?? 0) ||
  (a?.name || '').localeCompare(b?.name || '');

const formatCount = (n) => n.toLocaleString();

// Triage layout for a grid level with too many workloads for a plain grid: a
// filter bar (name filter and status toggles with counts), an options row
// (a switch to minimize workloads that don't need attention), and a single
// worst-first, paged card grid.
const WorkloadTriage = ({
  workloads,
  tagsByGuid = {},
  teamEntitiesByGuid = {},
  issuesLoading = false,
  hideUnacknowledged,
  issuesVariant,
  onCardClick,
  onIssuesClick,
  onTeamClick,
}) => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [minimizeHealthy, setMinimizeHealthy] = useState(true);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const nameMatched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return workloads || [];
    return (workloads || []).filter((w) =>
      (w?.name || '').toLowerCase().includes(q)
    );
  }, [workloads, query]);

  // Toggle counts reflect the name filter, so they always describe what's
  // matched.
  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0]));
    nameMatched.forEach((w) => (counts[statusOf(w)] += 1));
    return counts;
  }, [nameMatched]);

  const matches = useMemo(
    () =>
      (statusFilter
        ? nameMatched.filter((w) => statusOf(w) === statusFilter)
        : [...nameMatched]
      ).sort(worstFirst),
    [nameMatched, statusFilter]
  );
  const visible = useMemo(() => matches.slice(0, limit), [matches, limit]);

  const isMinimized = useMemo(
    () => (minimizeHealthy ? (w) => !needsAttention(w) : undefined),
    [minimizeHealthy]
  );

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    setLimit(PAGE_SIZE);
  };

  const toggleStatus = (status) => {
    setStatusFilter((prev) => (prev === status ? null : status));
    setLimit(PAGE_SIZE);
  };

  const clearFilters = () => {
    setQuery('');
    setStatusFilter(null);
    setLimit(PAGE_SIZE);
  };

  const remaining = matches.length - limit;

  return (
    <div className="workload-triage">
      <div className="triage-filterbar">
        <div className="name-filter">
          <TextField
            type={TextField.TYPE.SEARCH}
            label={`Filter ${formatCount(workloads?.length ?? 0)} workloads`}
            labelInline
            placeholder="Name contains…"
            value={query}
            onChange={handleQueryChange}
          />
        </div>
        <div className="filters">
          <div
            className="status-toggles"
            role="group"
            aria-label="Filter by status"
          >
            {STATUS_ORDER.map((status) => {
              const active = statusFilter === status;
              return (
                <button
                  key={status}
                  type="button"
                  className={`u-unstyledButton status-toggle ${workloadStatusClass(
                    { status }
                  )}${active ? ' active' : ''}`}
                  aria-pressed={active}
                  disabled={!statusCounts[status] && !active}
                  onClick={() => toggleStatus(status)}
                >
                  <span className="label">{STATUS_LABELS[status]}</span>
                  <span className="count">
                    {formatCount(statusCounts[status])}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="triage-options">
        <div
          className="minimize-switch"
          title="Show workloads that aren't degraded, disrupted or carrying open issues as name-only cards"
        >
          <Switch
            label="Minimize healthy"
            checked={minimizeHealthy}
            onChange={(e) => setMinimizeHealthy(e.target.checked)}
          />
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="triage-empty">
          <div className="title">No workloads match</div>
          <div className="description">
            None of the {formatCount(workloads?.length ?? 0)} workloads here
            match the selected filters.
          </div>
          <Button
            variant={Button.VARIANT.SECONDARY}
            sizeType={Button.SIZE_TYPE.SMALL}
            onClick={clearFilters}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <>
          <WorkloadGrid
            workloads={visible}
            tagsByGuid={tagsByGuid}
            teamEntitiesByGuid={teamEntitiesByGuid}
            issuesLoading={issuesLoading}
            hideUnacknowledged={hideUnacknowledged}
            issuesVariant={issuesVariant}
            onCardClick={onCardClick}
            onIssuesClick={onIssuesClick}
            onTeamClick={onTeamClick}
            animate={false}
            isMinimized={isMinimized}
          />
          {remaining > 0 && (
            <button
              type="button"
              className="u-unstyledButton show-more"
              onClick={() => setLimit((n) => n + PAGE_SIZE)}
            >
              {`Show ${formatCount(
                Math.min(PAGE_SIZE, remaining)
              )} more (${formatCount(remaining)} remaining)`}
            </button>
          )}
        </>
      )}
    </div>
  );
};

WorkloadTriage.propTypes = {
  workloads: PropTypes.array,
  tagsByGuid: PropTypes.object,
  teamEntitiesByGuid: PropTypes.object,
  issuesLoading: PropTypes.bool,
  hideUnacknowledged: PropTypes.bool,
  issuesVariant: PropTypes.oneOf(['solid']),
  onCardClick: PropTypes.func,
  onIssuesClick: PropTypes.func,
  onTeamClick: PropTypes.func,
};

export default WorkloadTriage;

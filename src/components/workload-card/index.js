import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import {
  Button,
  Icon,
  Popover,
  PopoverBody,
  PopoverTrigger,
  Spinner,
} from 'nr1';

import IssuesButton from '../issues-button';
import LiveKpiRow from '../live-kpi-row';
import KpiChart from '../kpi-chart';
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
  heroKpiId,
  pinnedKpiIds,
  allExpanded = false,
  expandToken = 0,
  tags,
  teamEntitiesByGuid = {},
  isUnclickable = false,
  onClick,
  onIssuesClick,
  onTeamClick,
  onEdit,
}) => {
  const isStatusKnown = !!status && status !== WORKLOAD_STATUSES.UNKNOWN;
  // Card is "no data" if it can't be drilled into AND we don't have a status
  // for it either. With known status, we still mute the card but keep the
  // real status badge so users see useful info.
  const showNoDataBadge = isUnclickable && !isStatusKnown;
  // Collapsed hides every non-pinned KPI row; the hero and pinned KPIs always
  // show. Cards start collapsed and are toggled from the floating bottom bar.
  const [collapsed, setCollapsed] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const hasKpis = useMemo(() => Array.isArray(kpis) && kpis.length > 0, [kpis]);

  // Board-level "Expand all" / "Collapse all" broadcasts via a bumped token; the
  // guard keeps the initial mount on the collapsed default.
  useEffect(() => {
    if (expandToken > 0) setCollapsed(!allExpanded);
  }, [expandToken, allExpanded]);

  // A KPI shows when expanded, or when collapsed only if it's pinned. The hero
  // is featured as a big-number chart on top and excluded from the rows, but it
  // follows the same collapse/pin rule.
  const pinnedSet = useMemo(() => new Set(pinnedKpiIds || []), [pinnedKpiIds]);
  const isVisible = (k) => !collapsed || pinnedSet.has(k.id);
  const heroKpi = useMemo(
    () => (heroKpiId ? (kpis || []).find((k) => k.id === heroKpiId) : null),
    [kpis, heroKpiId]
  );
  const rowKpis = useMemo(
    () =>
      heroKpi ? (kpis || []).filter((k) => k.id !== heroKpi.id) : kpis || [],
    [kpis, heroKpi]
  );
  const showHero = !!heroKpi && isVisible(heroKpi);
  const visibleRows = rowKpis.filter(isVisible);
  // Collapse is meaningful only when something isn't pinned (so it can hide).
  const hasCollapsible = useMemo(
    () => (kpis || []).some((k) => !pinnedSet.has(k.id)),
    [kpis, pinnedSet]
  );

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

  // Clicks on the header actions menu or the KPI bar shouldn't drill into the
  // card. We can't stopPropagation on the menu wrapper — that would also swallow
  // the click before Popover's own listeners see it — so guard the drill-in
  // here instead.
  const handleCardClick = (e) => {
    if (e.target.closest?.('.card-actions, .kpi-bar')) return;
    onClick?.(e);
  };

  return (
    <div
      className={`workload-card ${onClick ? 'clickable' : ''} ${statusClass}${
        isUnclickable ? ' no-data' : ''
      }`}
      onClick={onClick ? handleCardClick : undefined}
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
        {onEdit && (
          <div className="card-actions">
            <Popover
              opened={menuOpen}
              onChange={(_evt, opened) => setMenuOpen(opened)}
            >
              <PopoverTrigger>
                <Button
                  type={Button.TYPE.PLAIN}
                  sizeType={Button.SIZE_TYPE.SMALL}
                  iconType={Icon.TYPE.INTERFACE__OPERATIONS__MORE}
                  ariaLabel="Card actions"
                  ariaHasPopup="menu"
                />
              </PopoverTrigger>
              <PopoverBody>
                <div className="card-menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="u-unstyledButton card-menu-item"
                    onClick={(e) => {
                      // PopoverBody is portaled, but React events still bubble
                      // through the component tree to the card's drill-in
                      // handler — stop that here.
                      e.stopPropagation();
                      setMenuOpen(false);
                      onEdit();
                    }}
                  >
                    Edit
                  </button>
                </div>
              </PopoverBody>
            </Popover>
          </div>
        )}
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

      {hasKpis && (showHero || visibleRows.length > 0) && (
        <div className="kpis">
          {showHero && <KpiChart def={heroKpi} />}
          {visibleRows.length > 0 && (
            <div className="kpi-list">
              {visibleRows.map((kpi, i) => (
                <LiveKpiRow key={kpi.id ?? kpi.label ?? i} def={kpi} />
              ))}
            </div>
          )}
        </div>
      )}

      {hasKpis && hasCollapsible && (
        // While collapsed the "Expand" link stays visible (a hint that more
        // KPIs exist); while expanded "Collapse" is revealed on hover.
        <div className={`kpi-bar${collapsed ? ' persistent' : ''}`}>
          <button
            type="button"
            className="u-unstyledButton kpi-bar-btn"
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed((prev) => !prev);
            }}
          >
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
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
  // KPI definitions ({ id, label, accountId, query }); each is run live by LiveKpiRow.
  kpis: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      label: PropTypes.string,
      accountId: PropTypes.number,
      query: PropTypes.string,
    })
  ),
  // Id of the KPI to feature as the big-number hero (KpiChart).
  heroKpiId: PropTypes.string,
  // Ids of KPIs that stay visible even when the card is collapsed.
  pinnedKpiIds: PropTypes.arrayOf(PropTypes.string),
  // Board-level expand/collapse broadcast: target state + a bumped token.
  allExpanded: PropTypes.bool,
  expandToken: PropTypes.number,
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
  // When provided, the header shows an actions (⋯) menu with an Edit item.
  onEdit: PropTypes.func,
};

export default WorkloadCard;

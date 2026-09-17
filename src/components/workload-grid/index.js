import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

import WorkloadCard from '../workload-card';
import { FADE_PHASES, FADE_TIME_MS } from '../../constants';

const getWorkloadId = (workload, index = 0) => {
  return workload?.guid ?? `idx-${index}`;
};

const summarizeIssues = (issues = []) => {
  const issuesCount = issues?.length || 0;
  let unacknowledgedCount = 0;
  for (const issue of issues) {
    if (!issue.acknowledgedAt) unacknowledgedCount += 1;
  }
  return { issuesCount, unacknowledgedCount };
};

const WorkloadGrid = ({
  workloads,
  issuesLoading = false,
  hideUnacknowledged = false,
  tagsByGuid = {},
  teamEntitiesByGuid = {},
  kpisByGuid = {},
  kpiHeroByGuid = {},
  kpiPinnedByGuid = {},
  allExpanded = false,
  expandToken = 0,
  onCardClick,
  onIssuesClick,
  onTeamClick,
  onEditCard,
}) => {
  const [displayedWorkloads, setDisplayedWorkloads] = useState(workloads);
  const [fadePhase, setFadePhase] = useState(FADE_PHASES.IDLE);
  const displayedWorkloadsRef = useRef(displayedWorkloads);
  const itemRefs = useRef(new Map());
  displayedWorkloadsRef.current = displayedWorkloads;

  useEffect(() => {
    const currentDisplayed = displayedWorkloadsRef.current;

    if (workloads === currentDisplayed) {
      return;
    }

    const prevIds = new Set(currentDisplayed.map(getWorkloadId));
    const nextIds = new Set(workloads.map(getWorkloadId));
    const sameSet =
      prevIds.size === nextIds.size &&
      [...prevIds].every((id) => nextIds.has(id));

    // Same workload IDs means a status/issues update only — swap data in-place with no fade animation.
    if (sameSet) {
      setDisplayedWorkloads(workloads);
      return;
    }

    setFadePhase(FADE_PHASES.LEAVING);
    const timer = setTimeout(() => {
      setDisplayedWorkloads(workloads);
      setFadePhase(FADE_PHASES.ENTERING);

      // Two rAFs are needed: the first lets the browser paint ENTERING, the second lets CSS transitions pick up the class change.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setFadePhase(FADE_PHASES.IDLE));
      });
    }, FADE_TIME_MS);

    return () => clearTimeout(timer);
  }, [workloads]);

  if (displayedWorkloads.length === 0) return null;

  return (
    <div
      className={`grid-wrapper ${
        fadePhase !== FADE_PHASES.IDLE ? fadePhase : ''
      }`}
    >
      <div className="workload-grid">
        {displayedWorkloads.map((workload, index) => {
          const issues = workload.issues ?? [];
          const { issuesCount, unacknowledgedCount } = summarizeIssues(issues);
          const hasChildren = (workload?.children?.length ?? 0) > 0;
          // Any workload with no children can't be drilled into — flag it so
          // the card visually indicates that. The badge inside WorkloadCard
          // still shows the real status when known; only the card chrome and
          // tooltip change.
          const isUnclickable = !issuesLoading && !hasChildren;
          const clickable = onCardClick && hasChildren;
          // KPIs and the edit toolbar are keyed by workload guid; a card
          // without a guid can't be targeted, so it gets neither.
          const canEdit = !!onEditCard && !!workload.guid;

          return (
            <div
              key={getWorkloadId(workload, index)}
              className="grid-item"
              ref={(el) => {
                const id = getWorkloadId(workload, index);
                if (el) itemRefs.current.set(id, el);
                else itemRefs.current.delete(id);
              }}
            >
              <WorkloadCard
                name={workload.name}
                status={workload.status}
                issuesCount={issuesCount}
                unacknowledgedCount={unacknowledgedCount}
                hideUnacknowledged={hideUnacknowledged}
                issues={issues}
                issuesLoading={issuesLoading}
                kpis={kpisByGuid?.[workload.guid] ?? []}
                heroKpiId={kpiHeroByGuid?.[workload.guid]}
                pinnedKpiIds={kpiPinnedByGuid?.[workload.guid]}
                allExpanded={allExpanded}
                expandToken={expandToken}
                tags={tagsByGuid?.[workload.guid]}
                teamEntitiesByGuid={teamEntitiesByGuid}
                isUnclickable={isUnclickable}
                onClick={clickable ? () => onCardClick(workload) : undefined}
                onIssuesClick={() => onIssuesClick?.(workload)}
                onTeamClick={onTeamClick}
                onEdit={canEdit ? () => onEditCard(workload) : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

WorkloadGrid.propTypes = {
  workloads: PropTypes.array,
  issuesLoading: PropTypes.bool,
  hideUnacknowledged: PropTypes.bool,
  tagsByGuid: PropTypes.object,
  teamEntitiesByGuid: PropTypes.object,
  // Map of workload guid -> array of KPI definitions to render on that card.
  kpisByGuid: PropTypes.object,
  // Map of workload guid -> hero KPI id (featured as a big-number chart).
  kpiHeroByGuid: PropTypes.object,
  // Map of workload guid -> pinned KPI ids (always shown, even when collapsed).
  kpiPinnedByGuid: PropTypes.object,
  // Board-level expand/collapse broadcast: target state + a bumped token.
  allExpanded: PropTypes.bool,
  expandToken: PropTypes.number,
  onCardClick: PropTypes.func,
  onIssuesClick: PropTypes.func,
  onTeamClick: PropTypes.func,
  // When provided, each card with a guid shows a hover toolbar whose Edit
  // action calls onEditCard(workload).
  onEditCard: PropTypes.func,
};

export default WorkloadGrid;

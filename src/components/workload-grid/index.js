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
  onCardClick,
  onIssuesClick,
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
                kpis={[]}
                isUnclickable={isUnclickable}
                onClick={clickable ? () => onCardClick(workload) : undefined}
                onIssuesClick={() => onIssuesClick?.(workload)}
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
  onCardClick: PropTypes.func,
  onIssuesClick: PropTypes.func,
};

export default WorkloadGrid;

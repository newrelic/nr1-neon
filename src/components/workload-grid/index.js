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

    if (sameSet) {
      setDisplayedWorkloads(workloads);
      return;
    }

    setFadePhase(FADE_PHASES.LEAVING);
    const timer = setTimeout(() => {
      setDisplayedWorkloads(workloads);
      setFadePhase(FADE_PHASES.ENTERING);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => setFadePhase(FADE_PHASES.IDLE));
      });
    }, FADE_TIME_MS);

    return () => clearTimeout(timer);
  }, [workloads]);

  return (
    <div
      className={`grid-wrapper ${
        fadePhase !== FADE_PHASES.IDLE ? fadePhase : ''
      }`}
    >
      {displayedWorkloads.length === 0 ? (
        <div className="workload-grid-empty">
          <div className="title">No workloads</div>
        </div>
      ) : (
        <div className="workload-grid">
          {displayedWorkloads.map((workload, index) => {
            const issues = workload.issues ?? [];
            const { issuesCount, unacknowledgedCount } =
              summarizeIssues(issues);
            const clickable = onCardClick && workload?.children?.length;

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
                  onClick={clickable ? () => onCardClick(workload) : undefined}
                  onIssuesClick={() => onIssuesClick?.(workload)}
                />
              </div>
            );
          })}
        </div>
      )}
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

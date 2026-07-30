import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

import BreadcrumbRow, { LEADING_W, ARROW_STEM_OFFSET } from '../breadcrumb-row';

const EXIT_DURATION = 280;
const CHIP_HEIGHT = 40;
const CHIP_FONT_SIZE = 12.5;

const summarizeIssueSeverity = (issues = []) => {
  let criticalCount = 0;
  let warningCount = 0;
  for (const issue of issues) {
    if (issue.state !== 'ACTIVATED') continue;
    if (issue.priority === 'CRITICAL') criticalCount += 1;
    else if (issue.priority === 'HIGH' || issue.priority === 'MEDIUM')
      warningCount += 1;
  }
  return { criticalCount, warningCount };
};

// Active item first, then descending by critical count, then warning count.
const sortItems = (items, activeId) =>
  [...items].sort((a, b) => {
    if (a.guid === activeId) return -1;
    if (b.guid === activeId) return 1;
    const { criticalCount: ac, warningCount: aw } = summarizeIssueSeverity(
      a.issues
    );
    const { criticalCount: bc, warningCount: bw } = summarizeIssueSeverity(
      b.issues
    );
    if (bc !== ac) return bc - ac;
    return bw - aw;
  });

const Breadcrumb = ({ levels, onChipClick, onHomeClick }) => {
  const [displayedLevels, setDisplayedLevels] = useState(levels);
  const [leavingDepths, setLeavingDepths] = useState(new Set());
  const prevLevelCountRef = useRef(levels.length);

  useEffect(() => {
    const prevCount = prevLevelCountRef.current;
    const nextCount = levels.length;

    if (nextCount >= prevCount) {
      setDisplayedLevels(levels);
      setLeavingDepths(new Set());
      prevLevelCountRef.current = nextCount;
      return;
    }

    const departing = new Set();
    for (let i = nextCount; i < prevCount; i++) departing.add(i);
    setLeavingDepths(departing);

    const timer = setTimeout(() => {
      setDisplayedLevels(levels);
      setLeavingDepths(new Set());
      prevLevelCountRef.current = nextCount;
    }, EXIT_DURATION);

    return () => clearTimeout(timer);
  }, [levels]);

  // Top-level state: workloads exist but none selected yet. Show only the home
  // button and the connector so the UI is consistent from the first interaction.
  if (displayedLevels.length === 0) {
    return (
      <div className="breadcrumb">
        <BreadcrumbRow
          items={[]}
          activeId={null}
          height={CHIP_HEIGHT}
          fontSize={CHIP_FONT_SIZE}
          isLeaving={false}
          depth={0}
          onChipClick={() => {}}
          onHomeClick={onHomeClick}
        />
        <BreadcrumbConnector stemX={ARROW_STEM_OFFSET} isLeaving={false} />
      </div>
    );
  }

  const leafDepth = displayedLevels.length - 1;
  const leafIsLeaving = leavingDepths.has(leafDepth);
  // Stalk aligns with where a hypothetical next-level L-arrow stem would be:
  // one full LEADING_W slot past the last row, then ARROW_STEM_OFFSET in.
  const connectorStemX = (leafDepth + 1) * LEADING_W + ARROW_STEM_OFFSET;

  return (
    <div className="breadcrumb">
      {displayedLevels.map((level, depth) => {
        const isLeaving = leavingDepths.has(depth);
        const sortedItems = sortItems(level.items, level.activeId);

        return (
          <BreadcrumbRow
            key={depth}
            items={sortedItems}
            activeId={level.activeId}
            height={isLeaving ? 0 : CHIP_HEIGHT}
            fontSize={CHIP_FONT_SIZE}
            isLeaving={isLeaving}
            depth={depth}
            isLastRow={depth === leafDepth}
            onChipClick={(workload) => onChipClick(depth, workload)}
            onHomeClick={depth === 0 ? onHomeClick : undefined}
          />
        );
      })}

      <BreadcrumbConnector stemX={connectorStemX} isLeaving={leafIsLeaving} />
    </div>
  );
};

Breadcrumb.propTypes = {
  levels: PropTypes.array,
  onChipClick: PropTypes.func,
  onHomeClick: PropTypes.func,
};

export default Breadcrumb;

// Draws: a stalk from the last chip down to a full-width baseline, with
// short downward ticks at both ends of that baseline.
const BreadcrumbConnector = ({ stemX, isLeaving }) => (
  <div
    className="breadcrumb-connector"
    style={{ '--stem-x': `${stemX}px`, opacity: isLeaving ? 0 : 1 }}
    aria-hidden="true"
  >
    <span className="bc-tick bc-tick--left" />
    <span className="bc-tick bc-tick--right" />
  </div>
);

BreadcrumbConnector.propTypes = {
  stemX: PropTypes.number,
  isLeaving: PropTypes.bool,
};

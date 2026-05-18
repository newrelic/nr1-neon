import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

import BreadcrumbRow from '../breadcrumb-row';

const EXIT_DURATION = 280;

const Breadcrumb = ({ levels, onChipClick }) => {
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

  if (displayedLevels.length === 0) return null;

  const visibleDepth = displayedLevels.length - leavingDepths.size;

  return (
    <div className="breadcrumb">
      {displayedLevels.map((level, depth) => {
        const isLeaving = leavingDepths.has(depth);
        const { height, fontSize } = rowDimensions(depth, visibleDepth);

        return (
          <BreadcrumbRow
            key={depth}
            items={level.items}
            activeId={level.activeId}
            height={isLeaving ? 0 : height}
            fontSize={fontSize}
            isLeaving={isLeaving}
            onChipClick={(workload) => onChipClick(depth, workload)}
          />
        );
      })}
    </div>
  );
};

Breadcrumb.propTypes = {
  levels: PropTypes.array,
  onChipClick: PropTypes.func,
};

export default Breadcrumb;

function rowDimensions(depth, totalDepth) {
  const MIN_HEIGHT = 26;
  const MAX_HEIGHT = 48;
  if (totalDepth <= 1) return { height: MAX_HEIGHT, fontSize: 12.5 };

  const t = depth / (totalDepth - 1);
  const height = Math.round(MIN_HEIGHT + (MAX_HEIGHT - MIN_HEIGHT) * t);
  const fontSize = 10.5 + 2 * t; // 10.5 → 12.5
  return { height, fontSize };
}

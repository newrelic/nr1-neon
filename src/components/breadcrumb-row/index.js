import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';

import BreadcrumbChip from '../breadcrumb-chip';

// Width of the leading slot (home button or L-arrow) shared across all rows so
// chips at every depth align correctly. Exported so the parent can compute the
// connector line's x-position without duplicating the constant.
export const LEADING_W = 36;

// Horizontal offset of the L-arrow's vertical stem within a LEADING_W slot.
// Exported so the connector can align its stalk with a hypothetical next-level
// arrow, keeping the visual rhythm consistent.
export const ARROW_STEM_OFFSET = Math.round(LEADING_W * 0.38);

const BreadcrumbRow = ({
  items,
  activeId,
  height,
  fontSize,
  isLeaving,
  onChipClick,
  depth,
  isLastRow,
  onHomeClick,
  homeDisabled,
}) => {
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // The first item is rendered as a fixed chip outside the scrollable track so
  // it can never scroll out of view.
  const firstItem = items[0];
  const scrollableItems = items.slice(1);

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [items, updateScrollState]);

  const scrollByDir = (direction) => {
    const el = trackRef.current;
    if (!el) return;
    const delta = el.clientWidth * 0.8 * direction;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  // Chips in every row start at (depth + 1) * LEADING_W from the left edge:
  // depth-0 home occupies 1 slot, depth-1 L-arrow sits under the first chip
  // of depth-0 (slot 2), depth-2 shifts one more slot further in, and so on.
  const leaderWidth = (depth + 1) * LEADING_W;
  const chipHeight = height - 12;
  const arrowHeight = Math.max(20, height - 12);

  return (
    <div
      className="breadcrumb-row"
      style={{ height, opacity: isLeaving ? 0 : 1 }}
    >
      {/* Leading slot: home button (depth 0) or L-shaped hierarchy arrow */}
      <div className="row-leader" style={{ width: leaderWidth }}>
        {depth === 0 ? (
          <button
            type="button"
            className={`row-home${homeDisabled ? ' row-home--disabled' : ''}`}
            onClick={homeDisabled ? undefined : onHomeClick}
            disabled={homeDisabled}
            aria-label="Back to home"
          >
            <HomeIcon />
          </button>
        ) : (
          <svg
            width={leaderWidth}
            height={height}
            viewBox={`0 0 ${leaderWidth} ${height}`}
            fill="none"
            aria-hidden="true"
          >
            <path
              d={lArrowPath(leaderWidth, LEADING_W, height)}
              stroke="#C5CBD0"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {/* Fixed first chip — never scrolls, always shows the current selection */}
      {firstItem && (
        <BreadcrumbChip
          workload={firstItem}
          isActive={firstItem.guid === activeId}
          height={chipHeight}
          fontSize={fontSize}
          isCurrentSelection={isLastRow}
          onClick={onChipClick}
        />
      )}

      {/* Scrollable sibling chips (index 1+) */}
      {scrollableItems.length > 0 && (
        <div className="row-track-area">
          <button
            type="button"
            className={`arrow left ${canScrollLeft ? 'visible' : ''}`}
            style={{ height: arrowHeight }}
            onClick={() => scrollByDir(-1)}
            tabIndex={canScrollLeft ? 0 : -1}
          >
            <ChevronLeftIcon />
          </button>

          <div
            ref={trackRef}
            className="track"
            data-can-scroll-left={canScrollLeft}
            data-can-scroll-right={canScrollRight}
            style={{
              paddingLeft: canScrollLeft ? 28 : 2,
              paddingRight: canScrollRight ? 28 : 2,
            }}
          >
            {scrollableItems.map((item) => (
              <BreadcrumbChip
                key={item.guid}
                workload={item}
                isActive={item.guid === activeId}
                height={chipHeight}
                fontSize={fontSize}
                onClick={onChipClick}
              />
            ))}
          </div>

          <button
            type="button"
            className={`arrow right ${canScrollRight ? 'visible' : ''}`}
            style={{ height: arrowHeight }}
            onClick={() => scrollByDir(1)}
            tabIndex={canScrollRight ? 0 : -1}
          >
            <ChevronRightIcon />
          </button>
        </div>
      )}
    </div>
  );
};

BreadcrumbRow.propTypes = {
  items: PropTypes.array,
  activeId: PropTypes.string,
  height: PropTypes.number,
  fontSize: PropTypes.number,
  isLeaving: PropTypes.bool,
  onChipClick: PropTypes.func,
  depth: PropTypes.number,
  isLastRow: PropTypes.bool,
  onHomeClick: PropTypes.func,
  homeDisabled: PropTypes.bool,
};

export default BreadcrumbRow;

// SVG path for the L-shaped hierarchy arrow.
// The vertical stem sits at ~38% of the rightmost LEADING_W slot; the
// horizontal bar runs from there to the right edge (where chips begin).
function lArrowPath(totalW, unitW, h) {
  const x = totalW - unitW + Math.round(unitW * 0.38);
  const y = Math.round(h * 0.52);
  return `M ${x} 0 L ${x} ${y} L ${totalW} ${y}`;
}

function HomeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M2 6.5L8 2L14 6.5V14H10V10H6V14H2V6.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path
        d="M10 4L6 8L10 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path
        d="M6 4L10 8L6 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

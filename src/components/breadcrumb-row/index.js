import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';

import { Icon } from 'nr1';

import BreadcrumbChip from '../breadcrumb-chip';

const BreadcrumbRow = ({
  items,
  activeId,
  height,
  fontSize,
  isLeaving,
  onChipClick,
}) => {
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

  const arrowHeight = Math.max(20, height - 8);

  return (
    <div
      className="breadcrumb-row"
      style={{ height, opacity: isLeaving ? 0 : 1 }}
    >
      <button
        type="button"
        className={`arrow left ${canScrollLeft ? 'visible' : ''}`}
        style={{ height: arrowHeight }}
        onClick={() => scrollByDir(-1)}
        tabIndex={canScrollLeft ? 0 : -1}
      >
        <Icon type={Icon.TYPE.INTERFACE__CHEVRON__CHEVRON_LEFT} />
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
        {items.map((item) => (
          <BreadcrumbChip
            key={item.guid}
            workload={item}
            isActive={item.guid === activeId}
            height={height - 6}
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
        <Icon type={Icon.TYPE.INTERFACE__CHEVRON__CHEVRON_RIGHT} />
      </button>
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
};

export default BreadcrumbRow;

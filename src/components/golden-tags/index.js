import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

import { Icon } from 'nr1';

// Module-level counter generates stable unique IDs; lazy init via useRef avoids reassigning on re-render.
let goldenTagsIdCounter = 0;

// Small delay so moving the pointer from the trigger across the gap into the
// popover (or vice versa) doesn't flicker it shut.
const HIDE_DELAY_MS = 150;

// Renders a single tag icon that, on hover (or focus/click for keyboard and
// touch), reveals all of the entity's golden tags in a popover. The popover
// uses the native popover API + CSS anchor positioning so it renders in the top
// layer and escapes the row's `overflow: hidden` clipping.
const GoldenTags = ({ tags }) => {
  const idRef = useRef(null);
  if (idRef.current === null) {
    idRef.current = `gt-${++goldenTagsIdCounter}`;
  }
  const popoverRef = useRef(null);
  const hideTimer = useRef(null);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  if (!tags || tags.length === 0) return null;

  // CSS anchor positioning requires the anchor-name value to start with `--`.
  const anchorName = `--${idRef.current}`;
  const popoverId = `${idRef.current}-popover`;

  const isOpen = () => {
    try {
      return !!popoverRef.current?.matches(':popover-open');
    } catch {
      // jsdom / older engines may not know the :popover-open pseudo-class.
      return false;
    }
  };
  const show = () => {
    clearTimeout(hideTimer.current);
    if (popoverRef.current && !isOpen()) {
      try {
        popoverRef.current.showPopover();
      } catch {
        /* not connected / unsupported — ignore */
      }
    }
  };
  const hideNow = () => {
    if (popoverRef.current && isOpen()) {
      try {
        popoverRef.current.hidePopover();
      } catch {
        /* already hidden — ignore */
      }
    }
  };
  const scheduleHide = () => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(hideNow, HIDE_DELAY_MS);
  };

  // stop prevents clicks from bubbling up to the entity row's open handler.
  const stop = (e) => e.stopPropagation();
  const toggle = (e) => {
    stop(e);
    if (isOpen()) hideNow();
    else show();
  };

  return (
    <>
      <button
        type="button"
        className="u-unstyledButton golden-tags-trigger"
        popoverTarget={popoverId}
        style={{ anchorName }}
        aria-label={`Show ${tags.length} golden tags`}
        onClick={toggle}
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        onFocus={show}
        onBlur={scheduleHide}
      >
        <Icon type={Icon.TYPE.INTERFACE__OPERATIONS__TAG} />
      </button>

      <div
        ref={popoverRef}
        id={popoverId}
        popover="auto"
        className="tags-popover"
        style={{ positionAnchor: anchorName }}
        onClick={stop}
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
      >
        <div className="title">Golden tags ({tags.length})</div>
        <ul className="list">
          {tags.map((tag, i) => (
            <li key={`${tag.key}-${i}`} className="item">
              <span className="key">{tag.key}</span>
              <span className="value" title={tag.values?.join(', ')}>
                {tag.values?.join(', ')}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};

GoldenTags.propTypes = {
  tags: PropTypes.array,
};

export default GoldenTags;

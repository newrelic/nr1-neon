import React, { useRef } from 'react';
import PropTypes from 'prop-types';

// Module-level counter generates stable unique IDs; lazy init via useRef avoids reassigning on re-render.
let goldenTagsIdCounter = 0;

const GoldenTags = ({ tags, inlineCount = 1 }) => {
  const idRef = useRef(null);
  if (idRef.current === null) {
    idRef.current = `gt-${++goldenTagsIdCounter}`;
  }
  // CSS anchor positioning requires the anchor-name value to start with `--`.
  const anchorName = `--${idRef.current}`;
  const popoverId = `${idRef.current}-popover`;

  if (!tags || tags.length === 0) return null;

  const visible = tags.slice(0, inlineCount);
  const overflow = tags.slice(inlineCount);
  const hasOverflow = overflow.length > 0;

  // stop prevents clicks inside the popover from bubbling up to the entity row's click handler.
  const stop = (e) => e.stopPropagation();

  return (
    <>
      <div className="golden-tags">
        {visible.map((tag, i) => (
          <span
            key={`${tag.key}-${i}`}
            className="tag"
            title={`${tag.key}: ${tag.values?.join(', ')}`}
          >
            <span className="key">{tag.key}</span>
            <span className="value">{tag.values?.join(', ')}</span>
          </span>
        ))}
        {hasOverflow && (
          <button
            type="button"
            className="u-unstyledButton overflow"
            popoverTarget={popoverId}
            onClick={stop}
            style={{ anchorName }}
            aria-label={`Show all ${tags.length} tags`}
          >
            +{overflow.length} more
          </button>
        )}
      </div>

      {hasOverflow && (
        <div
          id={popoverId}
          popover="auto"
          className="tags-popover"
          style={{ positionAnchor: anchorName }}
          onClick={stop}
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
      )}
    </>
  );
};

GoldenTags.propTypes = {
  tags: PropTypes.array,
  inlineCount: PropTypes.number,
};

export default GoldenTags;

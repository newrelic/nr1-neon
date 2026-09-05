import React from 'react';
import PropTypes from 'prop-types';

import { Button } from 'nr1';

const IssuesButton = ({
  issuesCount,
  unacknowledgedCount,
  hideUnacknowledged,
  onClick,
}) => {
  const showUnack = !hideUnacknowledged && unacknowledgedCount > 0;
  const issuesLabel = issuesCount === 1 ? 'issue' : 'issues';

  return (
    // The whole row is the click target (bigger than just the "View" button)
    // — stopPropagation keeps it from also triggering the card's own onClick.
    // The nested Button has no onClick of its own: its native click bubbles
    // up to this handler, so there's a single source of truth for the action
    // and only one focusable control (the button) for keyboard users.
    <div
      className="issues-row"
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(e);
      }}
    >
      <div className="summary">
        <span className="issues-count">
          {issuesCount} {issuesLabel}
        </span>
        {showUnack && (
          <>
            <span className="sep" />
            <span className="unack">{unacknowledgedCount} unacknowledged</span>
          </>
        )}
      </div>
      <Button
        className="view-button"
        sizeType={Button.SIZE_TYPE.SMALL}
        variant={Button.VARIANT.TERTIARY}
        iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__SHOW}
        ariaLabel={`View ${issuesCount} ${issuesLabel}`}
      >
        View
      </Button>
    </div>
  );
};

IssuesButton.propTypes = {
  issuesCount: PropTypes.number,
  unacknowledgedCount: PropTypes.number,
  hideUnacknowledged: PropTypes.bool,
  onClick: PropTypes.func,
};

export default IssuesButton;

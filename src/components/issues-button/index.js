import React from 'react';
import PropTypes from 'prop-types';

const IssuesButton = ({
  issuesCount,
  unacknowledgedCount,
  hideUnacknowledged,
  statusClass = 'unknown',
  onClick,
}) => {
  const showUnack = !hideUnacknowledged && unacknowledgedCount > 0;
  const issuesLabel = issuesCount === 1 ? 'issue' : 'issues';

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      if (onClick) onClick(e);
    }
  };

  return (
    // The whole row is the click target — stopPropagation keeps it from also
    // triggering the card's own onClick. role/tabIndex/onKeyDown make the row
    // itself the single focusable control for keyboard users.
    <div
      className={`issues-row ${statusClass}`}
      role="button"
      tabIndex={0}
      aria-label={`View ${issuesCount} ${issuesLabel}`}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(e);
      }}
      onKeyDown={handleKeyDown}
    >
      <span className="summary">
        <svg
          className="issues-icon"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          focusable="false"
          role="img"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 7V4.5C12 2 10 0 7.5 0C5 0 3 2 3 4.5V7L1 9V12H14V9L12 7ZM6 13H6.1H7.5H8.9H9H10C9.8 14.1 8.7 15 7.5 15C6.3 15 5.2 14.1 5 13H6Z"
          />
        </svg>
        <span className="issues-count">
          {issuesCount} {issuesLabel}
        </span>
        {showUnack && (
          <>
            <span className="sep" />
            <span className="unack">{unacknowledgedCount} unacknowledged</span>
          </>
        )}
      </span>
    </div>
  );
};

IssuesButton.propTypes = {
  issuesCount: PropTypes.number,
  unacknowledgedCount: PropTypes.number,
  hideUnacknowledged: PropTypes.bool,
  statusClass: PropTypes.string,
  onClick: PropTypes.func,
};

export default IssuesButton;

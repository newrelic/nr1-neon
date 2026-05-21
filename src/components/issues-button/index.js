import React from 'react';
import PropTypes from 'prop-types';

const IssuesButton = ({ issuesCount, unacknowledgedCount, onClick }) => {
  const hasUnack = unacknowledgedCount > 0;

  return (
    <button
      type="button"
      className="u-unstyledButton issues-button"
      onClick={onClick}
    >
      <span className="issues-count">
        <span className="count">{issuesCount}</span>
        <span className="label">{issuesCount === 1 ? 'issue' : 'issues'}</span>
      </span>
      {hasUnack && (
        <span className="unack">{unacknowledgedCount} unacknowledged</span>
      )}
    </button>
  );
};

IssuesButton.propTypes = {
  issuesCount: PropTypes.number,
  unacknowledgedCount: PropTypes.number,
  onClick: PropTypes.func,
};

export default IssuesButton;

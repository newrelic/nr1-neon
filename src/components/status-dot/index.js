import React from 'react';
import PropTypes from 'prop-types';

const StatusDot = ({ status, isPulsing = false }) => {
  return (
    <span className={`status-dot ${status}`}>
      {isPulsing && <span className="pulse" />}
      <span className="core" />
    </span>
  );
};

StatusDot.propTypes = {
  status: PropTypes.string,
  isPulsing: PropTypes.bool,
};

export default StatusDot;

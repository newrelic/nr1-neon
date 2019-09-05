import React from 'react';

export default class BoxSpinner extends React.Component {
  render() {
    return (
      <div className="spinner">
        <div className="side left"></div>
        <div className="side top"></div>
        <div className="side right"></div>
        <div className="side bottom"></div>
      </div>
    );
  }
}

import React from 'react';
import PropTypes from 'prop-types';

import GoldenTags from '../golden-tags';
import Sparkline from '../sparkline';

function mapStatus(entity) {
  const sev = entity?.alertSeverity;
  if (sev === 'CRITICAL') return 'critical';
  if (sev === 'WARNING') return 'warning';
  if (sev === 'NOT_ALERTING') return 'success';
  return 'unknown';
}

const EntityRow = ({ entity, gridTemplate, metricCount, onClick }) => {
  const status = mapStatus(entity);
  const metrics = (entity.goldenMetrics ?? []).slice(0, 3);
  const goldenTagKeys = new Set(entity.goldenTags ?? []);
  const goldenTags = goldenTagKeys.size
    ? (entity.tags ?? []).filter(({ key }) => goldenTagKeys.has(key))
    : [];

  const handleClick = () => onClick && onClick(entity);
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className={`entity-row ${status}`}
      style={{ '--grid-template': gridTemplate }}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="col">
        <div className="name" title={entity.name}>
          {entity.name}
        </div>
        {goldenTags.length > 0 && <GoldenTags tags={goldenTags} />}
      </div>

      {Array.from({ length: metricCount }).map((_, i) => {
        const metric = metrics[i];
        if (!metric) {
          return (
            <div key={i} className="metric">
              <span className="empty">—</span>
            </div>
          );
        }
        return (
          <div
            key={metric.name}
            className="metric"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <Sparkline accountId={entity.accountId} query={metric.query} />
          </div>
        );
      })}
    </div>
  );
};

EntityRow.propTypes = {
  entity: PropTypes.object,
  gridTemplate: PropTypes.string,
  metricCount: PropTypes.number,
  onClick: PropTypes.func,
};

export default EntityRow;

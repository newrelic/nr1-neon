import React from 'react';
import PropTypes from 'prop-types';

import GoldenTags from '../golden-tags';
import TeamBadges from '../team-badges';
import Sparkline from '../sparkline';

function mapStatus(entity) {
  const sev = entity?.alertSeverity;
  if (sev === 'CRITICAL') return 'critical';
  if (sev === 'WARNING') return 'warning';
  if (sev === 'NOT_ALERTING') return 'success';
  return 'unknown';
}

const EntityRow = ({
  entity,
  gridTemplate,
  metricCount,
  teamEntitiesByGuid,
  onClick,
  onTeamClick,
}) => {
  const status = mapStatus(entity);
  const metrics = (entity.goldenMetrics ?? []).slice(0, 3);
  // goldenTags on the entity is an array of key strings; filter the full tags array down to only those keys.
  const goldenTagKeys = new Set(entity.goldenTags ?? []);
  const goldenTags = goldenTagKeys.size
    ? (entity.tags ?? []).filter(({ key }) => goldenTagKeys.has(key))
    : [];
  // Owning-team tags drive the team pill (same as workload cards).
  const hasTeamTag = (entity.tags ?? []).some(
    ({ key }) => key === 'nr.teamGuid' || key === 'team'
  );

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
        {(hasTeamTag || goldenTags.length > 0) && (
          <div className="entity-tags">
            <TeamBadges
              tags={entity.tags}
              teamEntitiesByGuid={teamEntitiesByGuid}
              onTeamClick={onTeamClick}
            />
            {goldenTags.length > 0 && <GoldenTags tags={goldenTags} />}
          </div>
        )}
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
              e.stopPropagation(); // prevent sparkline clicks from bubbling up to the row's entity-open handler
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
  teamEntitiesByGuid: PropTypes.object,
  onClick: PropTypes.func,
  onTeamClick: PropTypes.func,
};

export default EntityRow;

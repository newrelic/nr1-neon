import React from 'react';
import PropTypes from 'prop-types';

import { Icon } from 'nr1';

import EntityRow from '../entity-row';

const iconType = (icon) => Icon.TYPE[icon?.replace(/-/g, '_').toUpperCase()];

const EntitiesTable = ({
  entityType,
  entities,
  teamEntitiesByGuid,
  onEntityClick,
  onTeamClick,
}) => {
  if (!entities || entities.length === 0) {
    return (
      <section className="entities-table">
        <header className="header">
          <h3 className="title">
            <Icon className="icon" type={iconType(entityType?.icon)} />
            {entityType?.displayName}
          </h3>
        </header>
        <div className="empty">
          No {entityType?.displayName} in this workload
        </div>
      </section>
    );
  }

  // NR1 guarantees all entities of the same type share the same golden metrics schema, so the first entity is representative.
  const sampleMetrics = entities[0]?.goldenMetrics ?? [];
  const metricCount = Math.min(sampleMetrics.length, 3);

  // gridTemplate is passed to both the header row and each EntityRow so columns align without a real CSS grid parent.
  const gridTemplate =
    metricCount > 0 ? `220px ${'1fr '.repeat(metricCount).trim()}` : '1fr';

  return (
    <section className="entities-table">
      <header className="header">
        <h3 className="title">
          <Icon className="icon" type={iconType(entityType?.icon)} />
          {entityType?.displayName}
        </h3>
      </header>

      <div className="columns" style={{ '--grid-template': gridTemplate }}>
        <div>Entity</div>
        {sampleMetrics.slice(0, 3).map((m) => (
          <div
            key={m.name}
            className="golden-metric-title"
            title={m.title ?? m.name}
          >
            {m.title ?? m.name}
          </div>
        ))}
      </div>

      <div className="rows">
        {entities.map((entity) => (
          <EntityRow
            key={entity.guid}
            entity={entity}
            gridTemplate={gridTemplate}
            metricCount={metricCount}
            teamEntitiesByGuid={teamEntitiesByGuid}
            onClick={onEntityClick}
            onTeamClick={onTeamClick}
          />
        ))}
      </div>
    </section>
  );
};

EntitiesTable.propTypes = {
  entityType: PropTypes.object,
  entities: PropTypes.array,
  teamEntitiesByGuid: PropTypes.object,
  onEntityClick: PropTypes.func,
  onTeamClick: PropTypes.func,
};

export default EntitiesTable;

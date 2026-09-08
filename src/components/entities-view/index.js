import React, { useMemo } from 'react';
import PropTypes from 'prop-types';

import { Spinner, Tabs, TabsItem } from 'nr1';

import EntitiesTable from '../entities-table';
import { ENTITIES_TYPES_ARRAY } from '../../constants';

const groupByType = (entities) => {
  const out = new Map();
  for (const e of entities) {
    if (!e?.type) continue;
    const key = `${e.domain}:${e.type}`;
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(e);
  }
  return out;
};

const sortTypes = (groups) => {
  const types = [...groups.keys()];
  return types.sort((a, b) => {
    const sa = worstSeverityRank(groups.get(a));
    const sb = worstSeverityRank(groups.get(b));
    if (sa !== sb) return sb - sa; // higher rank first
    return entityTypeLabel(a).localeCompare(entityTypeLabel(b));
  });
};

const worstSeverityRank = (entities) => {
  let worst = 0;
  for (const e of entities) {
    const rank = SEVERITY_RANK[e?.alertSeverity] ?? 0;
    if (rank > worst) worst = rank;
  }
  return worst;
};

const entityTypeLabel = (domainType) => {
  const [domain, type] = domainType.split(':');
  return (
    ENTITIES_TYPES_ARRAY.find((e) => e.domain === domain && e.type === type)
      ?.displayName ?? type
  );
};

const SEVERITY_RANK = {
  CRITICAL: 3,
  WARNING: 2,
  NOT_ALERTING: 1,
  NOT_CONFIGURED: 0,
};

const summarizeSeverity = (entities) => {
  let critical = 0;
  let warning = 0;
  for (const e of entities) {
    if (e?.alertSeverity === 'CRITICAL') critical++;
    else if (e?.alertSeverity === 'WARNING') warning++;
  }
  return { critical, warning };
};

const TabLabel = ({ text, entities }) => {
  const { critical, warning } = summarizeSeverity(entities);
  const hasBadges = critical > 0 || warning > 0;
  return (
    <span className="tab-label">
      <span className="tab-label-name">{text}</span>
      {hasBadges && (
        <span className="badges">
          {critical > 0 && (
            <span className="badge critical" title={`${critical} critical`}>
              {critical}
            </span>
          )}
          {warning > 0 && (
            <span className="badge warning" title={`${warning} warning`}>
              {warning}
            </span>
          )}
        </span>
      )}
    </span>
  );
};

TabLabel.propTypes = {
  text: PropTypes.string.isRequired,
  entities: PropTypes.array.isRequired,
};

const EntitiesView = ({
  entities,
  loading,
  teamEntitiesByGuid,
  onEntityClick,
  onTeamClick,
  activeType,
  onTabChange,
}) => {
  const groups = useMemo(() => groupByType(entities ?? []), [entities]);
  const types = useMemo(() => sortTypes(groups), [groups]);

  if (loading) {
    return (
      <div className="entities-view loading">
        <Spinner />
      </div>
    );
  }

  if (types.length === 0) {
    return null;
  }

  // Controlled tab: `activeType` comes from the URL so browser Back/Forward can
  // move it. Fall back to the highest-severity type when the URL has no (or a
  // no-longer-present) selection.
  const selected = activeType && groups.has(activeType) ? activeType : types[0];

  return (
    <div className="entities-view">
      <Tabs
        ariaLabel="Entities by type"
        value={selected}
        onChange={onTabChange}
      >
        {types.map((type) => (
          <TabsItem
            key={type}
            value={type}
            label={
              <TabLabel
                text={entityTypeLabel(type)}
                entities={groups.get(type)}
              />
            }
          >
            <div className="panel">
              <EntitiesTable
                entityType={ENTITIES_TYPES_ARRAY.find(
                  (e) => `${e.domain}:${e.type}` === type
                )}
                entities={groups.get(type)}
                teamEntitiesByGuid={teamEntitiesByGuid}
                onEntityClick={onEntityClick}
                onTeamClick={onTeamClick}
              />
            </div>
          </TabsItem>
        ))}
      </Tabs>
    </div>
  );
};

EntitiesView.propTypes = {
  entities: PropTypes.array,
  loading: PropTypes.bool,
  teamEntitiesByGuid: PropTypes.object,
  onEntityClick: PropTypes.func,
  onTeamClick: PropTypes.func,
  activeType: PropTypes.string,
  onTabChange: PropTypes.func,
};

export default EntitiesView;

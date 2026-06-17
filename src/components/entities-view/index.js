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

const EntitiesView = ({
  entities,
  loading,
  onEntityClick,
  defaultType,
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

  const initialType =
    defaultType && groups.has(defaultType) ? defaultType : types[0];

  return (
    <div className="entities-view">
      <Tabs
        ariaLabel="Entities by type"
        defaultValue={initialType}
        onChange={onTabChange}
      >
        {types.map((type) => (
          <TabsItem
            key={type}
            value={type}
            label={`${entityTypeLabel(type)} (${groups.get(type).length})`}
          >
            <div className="panel">
              <EntitiesTable
                entityType={ENTITIES_TYPES_ARRAY.find(
                  (e) => `${e.domain}:${e.type}` === type
                )}
                entities={groups.get(type)}
                onEntityClick={onEntityClick}
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
  onEntityClick: PropTypes.func,
  defaultType: PropTypes.string,
  onTabChange: PropTypes.func,
};

export default EntitiesView;

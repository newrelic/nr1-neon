import {
  ALERTING_SEVERITIES,
  DEFAULT_ENTITY_SORT,
  ENTITY_SORTS,
  SEVERITY_RANK,
} from '../constants';

const DEFAULT_COLLATOR = new Intl.Collator();

export const keyValuesFromEntities = (entities, existingkeyValues) => {
  const optsMaps = existingkeyValues.reduce((acc, { option, values = [] }) => {
    acc[option] = new Map(values.map((vObj) => [vObj.value, vObj]));
    return acc;
  }, {});

  entities.forEach(({ name: entityName, tags }) => {
    if (typeof entityName === 'string') {
      if (!optsMaps.name.has(entityName)) {
        optsMaps.name.set(entityName, { value: entityName });
      }
    }

    if (Array.isArray(tags)) {
      tags.forEach(({ key, values: tagVals } = {}) => {
        if (!optsMaps[key]) optsMaps[key] = new Map();

        if (Array.isArray(tagVals)) {
          tagVals.forEach((strVal) => {
            if (!optsMaps[key].has(strVal)) {
              optsMaps[key].set(strVal, { value: strVal });
            }
          });
        }
      });
    }
  });

  const sortedKeys = [
    'name', // name should always appear first
    ...Object.keys(optsMaps)
      .filter((key) => key !== 'name')
      .sort(DEFAULT_COLLATOR.compare),
  ];

  return (
    sortedKeys?.map((option) => ({
      option,
      type: 'string',
      values: Array.from(optsMaps[option]?.values() || []),
    })) || []
  );
};

export const filtersArrayToNrql = (filters = []) =>
  filters
    .map((filter, i) => {
      const lastIndex = filters.length - 1;
      const conjunction =
        i === lastIndex ? '' : filter.conjunction?.value || '';
      if (!conjunction && i < lastIndex) return '';
      const key = filter.key?.value;
      if (!key) return '';
      const {
        value: operator,
        multiValue,
        noValueNeeded,
        partialMatches,
      } = filter.operator || {};
      if (!operator) return '';
      let valueStr = '';
      if (multiValue && Array.isArray(filter.values)) {
        const valuesArr = filter.values
          ?.map(({ value } = {}) => (value?.trim?.() ? `'${value}'` : ''))
          .filter(Boolean);
        valueStr = valuesArr.length ? `(${valuesArr.join(', ')})` : '';
      } else if (filter?.values?.value?.trim?.()) {
        if (partialMatches) {
          valueStr = `'%${filter.values.value}%'`;
        } else if (operator === 'STARTS WITH') {
          valueStr = `'%${filter.values.value}'`;
        } else if (operator === 'ENDS WITH') {
          valueStr = `'${filter.values.value}%'`;
        } else {
          valueStr = `'${filter.values.value}'`;
        }
      }
      if (!valueStr && !noValueNeeded) return '';
      return `${
        key === 'name' ? key : `\`tags.${key}\``
      } ${operator} ${valueStr} ${conjunction}`;
    })
    .join(' ');

export const alertingEntitiesByAccount = (nodes) => {
  const entitiesByAccount = new Map();

  const visit = (node) => {
    if (!node) return;
    const isWorkload = node.type === 'WORKLOAD' || node.children;
    const isAlerting = ALERTING_SEVERITIES.has(node.alertSeverity);
    if (!isWorkload && isAlerting && node.guid && node.accountId) {
      if (!entitiesByAccount.has(node.accountId)) {
        entitiesByAccount.set(node.accountId, []);
      }
      entitiesByAccount.get(node.accountId).push(node.guid);
    }
    if (node.children) {
      node.children.forEach(visit);
    }
  };
  nodes.forEach(visit);
  return entitiesByAccount;
};

const severityRank = (e) => SEVERITY_RANK[e?.alertSeverity] ?? 0;
const byName = (a, b) => DEFAULT_COLLATOR.compare(a?.name || '', b?.name || '');

const ENTITY_COMPARATORS = {
  [ENTITY_SORTS.STATUS_WORST]: (a, b) =>
    severityRank(b) - severityRank(a) || byName(a, b),
  [ENTITY_SORTS.STATUS_BEST]: (a, b) =>
    severityRank(a) - severityRank(b) || byName(a, b),
  [ENTITY_SORTS.NAME_ASC]: byName,
  [ENTITY_SORTS.NAME_DESC]: (a, b) => byName(b, a),
};

// Returns a sorted copy. Status sorts break ties by name so rows keep a stable
// order between refreshes. Unknown sort ids fall back to the default.
export const sortEntities = (entities = [], sort = DEFAULT_ENTITY_SORT) =>
  [...entities].sort(
    ENTITY_COMPARATORS[sort] ?? ENTITY_COMPARATORS[DEFAULT_ENTITY_SORT]
  );

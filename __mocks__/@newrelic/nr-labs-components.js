const React = require('react');

const FilterBar = ({ onChange, options }) =>
  React.createElement('div', {
    'data-testid': 'nr-labs-FilterBar',
    'data-option-count': options?.length ?? 0,
    onClick: () => onChange?.([]),
  });
FilterBar.displayName = 'FilterBar';

module.exports = { FilterBar };

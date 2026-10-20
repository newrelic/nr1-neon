import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import EntitiesTable from '../index';
import { ENTITY_SORTS } from '../../../constants';

const entity = (name, alertSeverity) => ({
  guid: name,
  name,
  alertSeverity,
  goldenMetrics: [],
});

const ENTITIES = [
  entity('beta', 'NOT_ALERTING'),
  entity('alpha', 'NOT_ALERTING'),
  entity('gamma', 'CRITICAL'),
];

const rowNames = (container) =>
  [...container.querySelectorAll('.entity-row .name')].map(
    (el) => el.textContent
  );

describe('EntitiesTable sorting', () => {
  it('lists critical entities first by default', () => {
    const { container } = render(<EntitiesTable entities={ENTITIES} />);
    expect(rowNames(container)).toEqual(['gamma', 'alpha', 'beta']);
  });

  it('applies the given sort', () => {
    const { container } = render(
      <EntitiesTable entities={ENTITIES} sort={ENTITY_SORTS.NAME_DESC} />
    );
    expect(rowNames(container)).toEqual(['gamma', 'beta', 'alpha']);
  });

  it('marks the current sort and shows it in the tooltip', () => {
    render(<EntitiesTable entities={ENTITIES} sort={ENTITY_SORTS.NAME_ASC} />);
    expect(
      screen.getByRole('menuitemradio', { name: /Name: A → Z/ })
    ).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('nr1-Tooltip')).toHaveAttribute(
      'data-tooltip-text',
      'Sorted by Name: A → Z'
    );
  });

  it('reports a newly picked sort, but not a re-pick of the current one', () => {
    const onSortChange = jest.fn();
    render(<EntitiesTable entities={ENTITIES} onSortChange={onSortChange} />);
    fireEvent.click(
      screen.getByRole('menuitemradio', { name: /Status: critical first/ })
    );
    expect(onSortChange).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('menuitemradio', { name: /Status: healthy first/ })
    );
    expect(onSortChange).toHaveBeenCalledWith(ENTITY_SORTS.STATUS_BEST);
  });
});

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';

import { Icon } from 'nr1';

import { computeDelta, formatValue } from '../../utils';

const KpiRow = ({ kpi = {} }) => {
  const { label, value, unit, compareValue, compareLabel } = useMemo(
    () => kpi,
    [kpi]
  );

  const delta = useMemo(() => computeDelta(kpi.value, kpi.compareValue), [kpi]);

  return (
    <div className="kpi-row">
      <span className="label" title={label}>
        {label}
      </span>
      <span className="metrics">
        {delta && (
          <span
            className={`delta ${delta.direction}`}
            title={
              compareLabel ?? `vs previous: ${formatValue(compareValue, kpi)}`
            }
          >
            <span className="direction">
              <Icon
                type={
                  delta.direction === 'up'
                    ? Icon.TYPE.INTERFACE__CARET__CARET_TOP__WEIGHT_BOLD
                    : Icon.TYPE.INTERFACE__CARET__CARET_BOTTOM__WEIGHT_BOLD
                }
              />
            </span>
            {delta.display}
          </span>
        )}
        <span className="value">
          {formatValue(value, kpi)}
          {unit && <span className="unit">{unit}</span>}
        </span>
      </span>
    </div>
  );
};

KpiRow.propTypes = {
  kpi: PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
    unit: PropTypes.string,
    compareValue: PropTypes.number,
    compareLabel: PropTypes.string,
  }),
};

export default KpiRow;

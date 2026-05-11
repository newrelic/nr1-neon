import React, { useMemo } from 'react';
import PropTypes from 'prop-types';

import { Icon } from 'nr1';

import { formatValue } from '../../utils';

const KpiRow = ({ kpi = {} }) => {
  const { label, value, unit, compareValue, compareLabel } = useMemo(
    () => kpi,
    [kpi]
  );

  const delta = useMemo(() => {
    const { value, compareValue } = kpi;
    if (
      typeof compareValue !== 'number' ||
      typeof value !== 'number' ||
      compareValue === 0
    ) {
      return null;
    }

    const diff = value - compareValue;
    const pctChange = (diff / Math.abs(compareValue)) * 100;
    const direction = diff >= 0 ? 'up' : 'down';

    const absPct = Math.abs(pctChange);
    const display =
      absPct >= 100
        ? `${absPct.toFixed(0)}%`
        : absPct >= 10
        ? `${absPct.toFixed(0)}%`
        : `${absPct.toFixed(1)}%`;

    return { direction, display };
  }, [kpi]);

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

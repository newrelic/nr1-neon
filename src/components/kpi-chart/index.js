import React from 'react';
import PropTypes from 'prop-types';

import { Icon } from 'nr1';

import { computeDelta, formatValue } from '../../utils';
import { useKpiValue } from '../../hooks';

// Hero KPI: a single value shown large (à la New Relic's Metric component) with
// an optional comparison delta. Runs its definition live, like LiveKpiRow, so
// the featured KPI stays in sync with the rows.
const KpiChart = ({ def = {} }) => {
  const { label, unit } = def;
  const { value, compareValue } = useKpiValue(def);
  const delta = computeDelta(value, compareValue);

  return (
    <div className="kpi-chart">
      <span className="label" title={label}>
        {label}
      </span>
      <div className="value-row">
        <span className="value">
          {formatValue(value, def)}
          {unit && <span className="unit">{unit}</span>}
        </span>
        {delta && (
          <span className={`delta ${delta.direction}`}>
            <span className="arrow">
              <Icon
                type={
                  delta.direction === 'up'
                    ? Icon.TYPE.INTERFACE__ARROW__ARROW_TOP__SIZE_8
                    : Icon.TYPE.INTERFACE__ARROW__ARROW_BOTTOM__SIZE_8
                }
              />
            </span>
            <span className="pill">{delta.display}</span>
          </span>
        )}
      </div>
    </div>
  );
};

KpiChart.propTypes = {
  def: PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string,
    accountId: PropTypes.number,
    query: PropTypes.string,
    unit: PropTypes.string,
  }),
};

export default KpiChart;

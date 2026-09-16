import React from 'react';
import PropTypes from 'prop-types';

import KpiRow from '../kpi-row';
import { useKpiValue } from '../../hooks';

// Runs one KPI definition and renders the pure KpiRow with the live value.
// Used on the card's KPI list and as the editor's preview so the two match.
const LiveKpiRow = ({ def = {} }) => {
  const { value, compareValue } = useKpiValue(def);
  // formatValue renders null as "—", covering skip/loading/error/no-data.
  return <KpiRow kpi={{ label: def.label, value, compareValue }} />;
};

LiveKpiRow.propTypes = {
  def: PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string,
    accountId: PropTypes.number,
    query: PropTypes.string,
  }),
};

export default LiveKpiRow;

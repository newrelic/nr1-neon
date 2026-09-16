import { useMemo } from 'react';

import { useNrqlQuery } from 'nr1';

// Pull a single scalar from one chart-format series (its latest point's `y`,
// the same value key Sparkline relies on, with a numeric-field fallback).
const scalarFromSeries = (series) => {
  const points = series?.data;
  if (!Array.isArray(points) || points.length === 0) return null;
  const point = points[points.length - 1];
  if (point && typeof point.y === 'number') return point.y;
  const numeric = Object.values(point || {}).find((v) => typeof v === 'number');
  return typeof numeric === 'number' ? numeric : null;
};

// A COMPARE WITH query returns a second series for the prior window, which NR
// flags on the series (metadata.comparison) or names "Previous"/"Compare". We
// match on those signals — never positionally — so a FACET query's extra series
// isn't mistaken for a comparison.
const isCompareSeries = (series) =>
  series?.metadata?.comparison === true ||
  series?.comparison === true ||
  /previous|compare/i.test(series?.metadata?.name || '');

const extractValues = (data) => {
  if (!Array.isArray(data) || data.length === 0) {
    return { value: null, compareValue: null };
  }
  const current = data.find((s) => !isCompareSeries(s)) ?? data[0];
  const compare = data.find(isCompareSeries);
  const value = scalarFromSeries(current);
  const compareValue = compare ? scalarFromSeries(compare) : null;
  return { value, compareValue };
};

// Runs one KPI definition ({ accountId, query }) and returns its current value
// plus, when the query uses COMPARE WITH, the prior-window baseline. Shared by
// LiveKpiRow (compact rows) and KpiChart (hero big-number).
export const useKpiValue = (def = {}) => {
  const { accountId, query } = def;
  const skip = !accountId || !query;

  const { data, loading, error } = useNrqlQuery({
    accountIds: accountId ? [accountId] : [],
    query: query || '',
    skip,
  });

  return useMemo(() => {
    if (skip || loading || error) {
      return { value: null, compareValue: null, loading, error };
    }
    const { value, compareValue } = extractValues(data);
    return { value, compareValue, loading, error };
  }, [skip, loading, error, data]);
};

export default useKpiValue;

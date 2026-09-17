// Compact notation (1.2K, 5.98M, 3.4B) via the platform Intl formatter. Reused
// for the explicit `compact` format and for large default-number KPI values.
const compactFormatter = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 2,
});

// Percentage change of `value` vs `compareValue` (from a COMPARE WITH query).
// Returns { direction: 'up' | 'down', display: '12%' } or null when there's no
// meaningful comparison. Shared by KpiRow and KpiChart.
export const computeDelta = (value, compareValue) => {
  if (
    typeof compareValue !== 'number' ||
    typeof value !== 'number' ||
    compareValue === 0 // guard against division by zero
  ) {
    return null;
  }
  const diff = value - compareValue;
  const absPct = Math.abs((diff / Math.abs(compareValue)) * 100);
  return {
    direction: diff >= 0 ? 'up' : 'down',
    display: absPct >= 10 ? `${absPct.toFixed(0)}%` : `${absPct.toFixed(1)}%`,
  };
};

export const formatValue = (value, kpi = {}) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';

  const { format = 'number', precision } = kpi;

  switch (format) {
    case 'percent': {
      const p = precision ?? 2;
      return value.toFixed(p);
    }
    case 'duration': {
      const p = precision ?? (value < 10 ? 2 : value < 100 ? 1 : 0);
      return value.toFixed(p);
    }
    case 'bytes': {
      return formatBytes(value);
    }
    case 'compact': {
      return compactFormatter.format(value);
    }
    case 'number':
    default: {
      const abs = Math.abs(value);
      // Large numbers get compact notation for legibility on the card.
      if (abs >= 1000 && precision === undefined) {
        return compactFormatter.format(value);
      }
      if (Number.isInteger(value) && precision === undefined) {
        return value.toLocaleString();
      }
      const p = precision ?? (abs < 1 ? 3 : abs < 10 ? 2 : 1);
      return value.toFixed(p);
    }
  }
};

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes}`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
};

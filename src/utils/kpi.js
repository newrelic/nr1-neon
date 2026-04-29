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
      return formatCompact(value, precision);
    }
    case 'number':
    default: {
      if (Number.isInteger(value) && precision === undefined) {
        return value.toLocaleString();
      }
      const p =
        precision ?? (Math.abs(value) < 1 ? 3 : Math.abs(value) < 10 ? 2 : 1);
      return value.toFixed(p);
    }
  }
};

const formatCompact = (value, precision) => {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${(value / 1e9).toFixed(precision ?? 1)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(precision ?? 1)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(precision ?? 1)}k`;
  return value.toFixed(precision ?? 0);
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

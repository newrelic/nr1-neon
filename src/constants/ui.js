export const FADE_PHASES = {
  IDLE: 'idle',
  LEAVING: 'leaving',
  ENTERING: 'entering',
};

export const FADE_TIME_MS = 160;

// Grid levels with more workloads than this switch from a plain card grid to
// the triage layout (status filters, search, unhealthy cards + compact list).
export const TRIAGE_THRESHOLD = 24;

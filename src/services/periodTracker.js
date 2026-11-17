// Simple period-tracker estimate: adds the user's average cycle length to
// their last period start date. This is a straightforward calendar-based
// projection, not a medical prediction — cycles vary in practice.

export const DEFAULT_CYCLE_LENGTH = 28;
export const MIN_CYCLE_LENGTH = 20;
export const MAX_CYCLE_LENGTH = 45;

function parseDateOnly(value) {
  // value is a 'YYYY-MM-DD' string from an <input type="date">.
  // Parse as local date components to avoid UTC/timezone off-by-one issues.
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function computeNextPeriod(lastPeriodDateStr, cycleLength) {
  const lastDate = parseDateOnly(lastPeriodDateStr);
  const nextDate = new Date(lastDate);
  nextDate.setDate(nextDate.getDate() + Number(cycleLength));

  const today = startOfDay(new Date());
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntil = Math.round((startOfDay(nextDate) - today) / msPerDay);

  return {
    lastDate,
    nextDate,
    daysUntil,
    isOverdue: daysUntil < 0,
  };
}

export function formatDate(date) {
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

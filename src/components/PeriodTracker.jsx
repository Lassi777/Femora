import { useState } from 'react';
import { useUser } from '../context/UserContext';
import { computeNextPeriod, formatDate, DEFAULT_CYCLE_LENGTH, MIN_CYCLE_LENGTH, MAX_CYCLE_LENGTH } from '../services/periodTracker';
import './PeriodTracker.css';

function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function PeriodTracker() {
  const { periodTracker, setPeriodTracker } = useUser();
  const [lastPeriodDate, setLastPeriodDate] = useState(periodTracker?.lastPeriodDate || '');
  const [cycleLength, setCycleLength] = useState(periodTracker?.cycleLength || DEFAULT_CYCLE_LENGTH);
  const [error, setError] = useState('');
  const [result, setResult] = useState(() => {
    if (periodTracker?.lastPeriodDate) {
      return computeNextPeriod(periodTracker.lastPeriodDate, periodTracker.cycleLength || DEFAULT_CYCLE_LENGTH);
    }
    return null;
  });

  function handleCalculate(e) {
    e.preventDefault();
    if (!lastPeriodDate) {
      setError('Please enter the start date of your last period.');
      setResult(null);
      return;
    }
    if (lastPeriodDate > todayStr()) {
      setError("That date is in the future — please enter your last period's start date.");
      setResult(null);
      return;
    }
    const length = Number(cycleLength);
    if (!length || length < MIN_CYCLE_LENGTH || length > MAX_CYCLE_LENGTH) {
      setError(`Cycle length should be between ${MIN_CYCLE_LENGTH} and ${MAX_CYCLE_LENGTH} days.`);
      setResult(null);
      return;
    }

    setError('');
    const computed = computeNextPeriod(lastPeriodDate, length);
    setResult(computed);
    setPeriodTracker({ lastPeriodDate, cycleLength: length });
  }

  return (
    <section className="tracker" id="period-tracker">
      <div className="container">
        <div className="tracker__card">
          <div className="tracker__intro">
            <span className="eyebrow-plain">Period tracker</span>
            <h2 className="tracker__title">When's your next period due?</h2>
            <p className="tracker__desc">
              Enter the start date of your last period and your usual cycle length, and
              we'll estimate when your next one is likely to begin.
            </p>
          </div>

          <form className="tracker__form" onSubmit={handleCalculate}>
            <div className="tracker__fields">
              <div className="tracker__field">
                <label className="field-label" htmlFor="lastPeriod">Last period start date</label>
                <input
                  id="lastPeriod"
                  type="date"
                  className="field-input"
                  value={lastPeriodDate}
                  max={todayStr()}
                  onChange={(e) => setLastPeriodDate(e.target.value)}
                />
              </div>
              <div className="tracker__field tracker__field--narrow">
                <label className="field-label" htmlFor="cycleLength">Average cycle length (days)</label>
                <input
                  id="cycleLength"
                  type="number"
                  className="field-input"
                  value={cycleLength}
                  min={MIN_CYCLE_LENGTH}
                  max={MAX_CYCLE_LENGTH}
                  onChange={(e) => setCycleLength(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="field-error">{error}</p>}

            <button type="submit" className="btn btn-primary tracker__submit">
              Estimate next period
            </button>
          </form>

          {result && (
            <div className="tracker__result">
              <div className="tracker__result-date">
                <span className="tracker__result-label">Estimated next period</span>
                <span className="tracker__result-value">{formatDate(result.nextDate)}</span>
              </div>
              <div className="tracker__result-days">
                {result.isOverdue
                  ? `${Math.abs(result.daysUntil)} day${Math.abs(result.daysUntil) === 1 ? '' : 's'} overdue by this estimate`
                  : result.daysUntil === 0
                    ? 'Estimated for today'
                    : `In ${result.daysUntil} day${result.daysUntil === 1 ? '' : 's'}`}
              </div>
            </div>
          )}

          <p className="tracker__disclaimer">
            This is a simple calendar-based estimate, assuming a regular
            cycle — actual cycles vary. It is not medical advice or a diagnostic tool.
          </p>
        </div>
      </div>
    </section>
  );
}

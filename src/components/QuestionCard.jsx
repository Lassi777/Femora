import './QuestionCard.css';

export default function QuestionCard({ question, value, onChange }) {
  const isMulti = question.type === 'multi';

  function toggleOption(opt) {
    if (isMulti) {
      const current = Array.isArray(value) ? value : [];
      const next = current.includes(opt) ? current.filter((o) => o !== opt) : [...current, opt];
      onChange(next);
    } else {
      onChange(opt);
    }
  }

  function isSelected(opt) {
    return isMulti ? Array.isArray(value) && value.includes(opt) : value === opt;
  }

  return (
    <div className="qcard">
      <h2 className="qcard__title">{question.title}</h2>
      {question.helper && <p className="qcard__helper">{question.helper}</p>}
      <div className="qcard__options">
        {question.options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`qcard__option ${isSelected(opt) ? 'qcard__option--selected' : ''}`}
            onClick={() => toggleOption(opt)}
          >
            <span className="qcard__option-mark" aria-hidden="true">
              {isSelected(opt) ? '✓' : ''}
            </span>
            {opt}
          </button>
        ))}
      </div>
      {isMulti && <p className="qcard__hint">Select all that apply.</p>}
    </div>
  );
}

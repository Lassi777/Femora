import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useUser } from '../context/UserContext';
import { TAGS, TAG_DEFS } from '../services/recommendationEngine';
import './FormPage.css';
import './ProblemInput.css';


export default function ProblemInput() {
  const navigate = useNavigate();
  const { user, setProblem, problemText, problemTags } = useUser();
  const [text, setText] = useState(problemText || '');
  const [tags, setTags] = useState(problemTags || []);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  function toggleTag(tag) {
    setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));
  }

  function handleSubmit() {
    if (!text.trim() && tags.length === 0) {
      setError('Please describe your concern or select at least one tag.');
      return;
    }
    setError('');
    setProblem(text.trim(), tags);
    navigate('/product-type');
  }

  if (!user) return null;

  return (
    <div className="formpage">
      <Navbar />
      <div className="container formpage__wrap">
        <div className="formpage__card" style={{ maxWidth: 620 }}>
          <span className="eyebrow-plain">We're listening</span>
          <h1 className="formpage__title">Tell us what's bothering you</h1>
          <p className="formpage__sub">
            Describe your concern in your own words. A simple rule-based tool (not AI, not medical
            advice) looks for whole-word mentions such as flow, leakage, irritation and night use.
            Your text stays in this browser.
          </p>

          <textarea
            aria-label="Describe your concern"
            className="field-input"
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="I experience heavy flow at night and sometimes get leakage and irritation..."
            style={{ marginBottom: 22, fontFamily: 'var(--font-body)', resize: 'vertical' }}
          />

          <span className="field-label">Or pick what applies</span>
          <div className="problem__tags">
            {TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`problem__tag ${tags.includes(tag) ? 'problem__tag--selected' : ''}`}
                onClick={() => toggleTag(tag)}
                aria-pressed={tags.includes(tag)}
              >
                {tag}{TAG_DEFS[tag].info ? ' (info only)' : ''}
              </button>
            ))}
          </div>

          {error && <p className="field-error" style={{ marginTop: 18 }}>{error}</p>}

          <button className="btn btn-primary" style={{ width: '100%', marginTop: 28 }} onClick={handleSubmit}>
            Create My Recommendation
          </button>
        </div>
      </div>
    </div>
  );
}

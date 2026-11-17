import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ProgressBar from '../components/ProgressBar';
import QuestionCard from '../components/QuestionCard';
import { useUser } from '../context/UserContext';
import './Questionnaire.css';

const QUESTIONS = [
  { id: 'flow', title: 'What is your usual menstrual flow?', options: ['Light', 'Normal', 'Heavy', 'Excessive'], type: 'single' },
  { id: 'heaviestDay', title: 'When do you usually experience the heaviest flow?', options: ['Day 1', 'Day 2', 'Day 3', 'Later days', 'It varies'], type: 'single' },
  { id: 'leakageConcern', title: 'How concerned are you about leakage?', options: ['Low', 'Moderate', 'High'], type: 'single' },
  { id: 'skinSensitivity', title: 'How sensitive is the skin around your intimate area?', options: ['Not sensitive', 'Slightly sensitive', 'Very sensitive'], type: 'single' },
  { id: 'irritation', title: 'Do you experience irritation or rashes while using pads?', options: ['Never', 'Sometimes', 'Frequently'], type: 'single' },
  { id: 'comfortImportance', title: 'How important is softness and comfort to you?', options: ['Normal', 'Important', 'Very important'], type: 'single' },
  { id: 'odorConcern', title: 'Do you have concerns about menstrual odor?', options: ['No', 'Sometimes', 'Yes'], type: 'single' },
  { id: 'usageTime', title: 'When do you mainly use sanitary pads?', options: ['Daytime', 'Night', 'Both'], type: 'single' },
  { id: 'priorities', title: 'What matters most to you?', helper: 'Choose as many as apply.', options: ['Comfort', 'Absorbency', 'Leakage protection', 'Skin-friendliness', 'Sustainability', 'Affordability'], type: 'multi' },
  { id: 'preferredLength', title: 'What type of pad length do you usually prefer?', options: ['Short', 'Medium', 'Large', 'Extra Large'], type: 'single' },
];

export default function Questionnaire() {
  const navigate = useNavigate();
  const { user, answers: saved, setAnswers } = useUser();
  // Draft state is initialised once from the saved answers, and committed back on finish.
  const [step, setStep] = useState(0);
  const [answers, setLocalAnswers] = useState(() => { const { notes: _n, ...rest } = saved || {}; return rest; });
  const [notes, setNotes] = useState(saved?.notes || '');
  const [fromReview, setFromReview] = useState(false);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  const NOTES = QUESTIONS.length;
  const REVIEW = QUESTIONS.length + 1;
  const current = QUESTIONS[step];
  const value = current ? answers[current.id] : undefined;
  const hasValue = Array.isArray(value) ? value.length > 0 : Boolean(value);
  const REQUIRED = 'flow';
  const canProceed = !current || current.id !== REQUIRED || hasValue;

  function go(to) { setStep(to); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function next() { if (fromReview && step < NOTES + 1) { setFromReview(false); go(REVIEW); } else go(step + 1); }
  function back() { if (step === 0) navigate('/ready'); else if (fromReview) { setFromReview(false); go(REVIEW); } else go(step - 1); }
  function edit(i) { setFromReview(true); go(i); }

  function finish() {
    const full = { ...answers, notes: notes.trim() };
    setAnswers(full);
    navigate('/product-type');
  }

  if (!user) return null;
  const fmt = (v) => (Array.isArray(v) ? (v.length ? v.join(', ') : null) : v || null);
  const label = step < NOTES ? `Question ${step + 1} of ${NOTES}` : step === NOTES ? 'Optional notes' : 'Review your answers';

  return (
    <div className="qpage">
      <Navbar />
      <div className="container qpage__wrap">
        <ProgressBar current={step + 1} total={REVIEW + 1} label={label} />

        <div className="qpage__card">
          {step < NOTES && (
            <>
              <QuestionCard question={current} value={value} onChange={(v) => setLocalAnswers((a) => ({ ...a, [current.id]: v }))} />
              {current.id !== REQUIRED && <p className="qpage__skip">Optional: you can skip this question. We only use your answers to build a rule-based suggestion.</p>}
            </>
          )}
          {step === NOTES && (
            <div className="qcard">
              <h2 className="qcard__title">Anything else you'd like FEMORA to know?</h2>
              <p className="qcard__helper">Optional. Notes are saved with your answers but are not used by the recommendation rules.</p>
              <label className="field-label" htmlFor="qnotes">Your notes</label>
              <textarea id="qnotes" className="field-input qpage__textarea" rows={5} value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. I switch products mid-cycle, or I'm usually active outdoors..." />
            </div>
          )}
          {step === REVIEW && (
            <div className="qcard">
              <h2 className="qcard__title">Review your answers</h2>
              <p className="qcard__helper">Check everything, or edit any answer before we create your suggestion.</p>
              <dl className="qreview">
                {QUESTIONS.map((qq, i) => (
                  <div key={qq.id} className="qreview__row">
                    <div><dt>{qq.title}</dt><dd className={fmt(answers[qq.id]) ? '' : 'is-skipped'}>{fmt(answers[qq.id]) || 'Skipped'}</dd></div>
                    <button type="button" className="qreview__edit" onClick={() => edit(i)} aria-label={`Edit answer: ${qq.title}`}>Edit</button>
                  </div>
                ))}
                <div className="qreview__row">
                  <div><dt>Notes</dt><dd className={notes.trim() ? '' : 'is-skipped'}>{notes.trim() || 'None'}</dd></div>
                  <button type="button" className="qreview__edit" onClick={() => edit(NOTES)} aria-label="Edit notes">Edit</button>
                </div>
              </dl>
              {!answers[REQUIRED] && <p className="field-error" role="alert">Please answer the first question (usual flow) so we can start from the right size.</p>}
            </div>
          )}
        </div>

        <div className="qpage__nav">
          <button type="button" className="btn btn-secondary" onClick={back}>Back</button>
          {step < REVIEW ? (
            <button type="button" className="btn btn-primary" onClick={next} disabled={!canProceed}>
              {fromReview ? 'Back to review' : step === NOTES ? (notes.trim() ? 'Review answers' : 'Skip and review') : hasValue ? 'Next' : 'Skip'}
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={finish} disabled={!answers[REQUIRED]}>See my suggestion</button>
          )}
        </div>
      </div>
    </div>
  );
}

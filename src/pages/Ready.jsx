import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useUser } from '../context/UserContext';
import './Ready.css';

export default function Ready() {
  const navigate = useNavigate();
  const { user } = useUser();

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="readypage">
      <Navbar />
      <div className="container readypage__wrap">
        <div className="readypage__card">
          <span className="eyebrow-plain">Hi {user.name.split(' ')[0]}</span>
          <h1 className="readypage__title">Are you ready for a few questions?</h1>
          <p className="readypage__desc">
            We'll ask a few simple questions about your menstrual needs to help us create a
            more suitable FEMORA recommendation.
          </p>
          <div className="readypage__actions">
            <button className="btn btn-primary readypage__btn" onClick={() => navigate('/questionnaire')}>
              Yes, let's start
            </button>
            <button className="btn btn-ghost readypage__btn" onClick={() => navigate('/tell-us')}>
              Not sure / I have a problem
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

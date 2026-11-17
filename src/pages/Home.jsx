import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PeriodTracker from '../components/PeriodTracker';
import { useUser } from '../context/UserContext';
import { adminStats } from './Admin';
import { PAD_CATALOG, computeFromAnswers } from '../services/recommendationEngine';
import { CATALOG, TYPE_META, CONCEPT_NOTE } from '../services/products';
import { observeReveal, attachTilt } from '../utils/motion';
import './Home.css';
import './HomeHero.css';

const SAMPLE = { flow: 'Heavy', usageTime: 'Night', leakageConcern: 'Moderate', skinSensitivity: 'Very sensitive' };
const SAMPLE_ROWS = [['Usual flow', 'Heavy'], ['When you use pads', 'Night'], ['Leakage concern', 'Moderate'], ['Skin sensitivity', 'Very sensitive']];

const TYPE_DESC = {
  pads: 'External and disposable, in sizes matched to flow and routine.',
  tampons: 'Internal and disposable, in absorbency categories.',
  cups: 'Internal, reusable and washed between uses, in sizes.',
  underwear: 'Washable underwear with built-in absorbency tiers, including overnight.',
};

const STEPS = [
  ['1', 'Tell us about your needs', 'A short, private questionnaire, or describe what is bothering you in your own words.'],
  ['2', 'Get a suggested configuration', 'A transparent rule-based tool (not AI, not medical advice) turns your answers into a suggestion for the product type you choose, with reasons.'],
  ['3', 'Build your pack', 'Mix variations freely. Your suggested one is highlighted, but the choice is yours.'],
  ['4', 'Choose how to pay and place your order', 'Review everything in one summary, then pay by UPI, card or cash on delivery. This prototype has no payment gateway and does not ship real orders.'],
];

const FAQ = [
  ['How does personalization work?', 'You answer a few questions (or describe your concern) and choose a product type. Fixed rules map flow, night-time use and leakage concern to a variation of that type, and each suggestion lists the rules that applied. There is no AI or medical analysis involved.'],
  ['Are FEMORA pads really biodegradable?', 'Biodegradable materials are our development goal. The actual material composition, how and how fast it breaks down, and any certification have not been verified yet, so we do not claim them.'],
  ['Are the prices and specifications final?', 'No. Variations, specifications and prices are proposed prototype values. For pads, each size tier bundles length and absorbency together as a design choice for this prototype.'],
  ['What happens to my information?', 'In this demo your details are saved in your own browser only; nothing is sent to a server. Anyone using the same browser profile could see them, so avoid entering anything you would not want shared. See the Privacy Policy in the footer.'],
  ['Can I really order a pack?', 'Not yet. Creating an order makes a demo record only. No payment is taken and nothing is delivered.'],
  ['Is this medical advice?', 'No. Suggestions cannot diagnose anything or guarantee protection from leakage or irritation. If you have pain, unusual bleeding or persistent irritation, please speak to a doctor.'],
];

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, orders, customers, recommendation } = useUser();
  const stats = adminStats(orders, customers);
  const sample = computeFromAnswers(SAMPLE);
  const start = () => navigate(user ? (recommendation ? '/pack' : '/ready') : '/signup');
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  useEffect(() => {
    const stopReveal = observeReveal('.section__title, .section__lead, .types__item, .steps li, .demo__col, .trust > div, .faq__list details, .finalcta .btn');
    const stopTilt = attachTilt('.demo__col', 5);
    return () => { stopReveal(); stopTilt(); };
  }, []);

  useEffect(() => {
    const target = location.state?.scrollTo;
    if (target) document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.state]);

  return (
    <div className="home">
      <Navbar transparent />

      <header className="hx">
        <div className="hx__bg" aria-hidden="true">
          <svg viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="currentColor" strokeWidth="1">
            <circle cx="620" cy="260" r="120" /><circle cx="620" cy="260" r="200" /><circle cx="620" cy="260" r="290" /><circle cx="620" cy="260" r="390" /><circle cx="620" cy="260" r="500" />
          </g></svg>
        </div>
        <div className="container hx__grid">
          <div className="hx__main">
            <span className="hx__kicker">FEMORA · Concept prototype</span>
            <h1 className="hx__headline">Care designed <em>for you</em>, better for the planet<sup>*</sup></h1>
            <p className="hx__desc">
              Answer a few questions and FEMORA suggests a product and variation for your flow, routine and skin comfort,
              with every reason shown. No guesswork, no black box.
            </p>
            <div className="hx__actions">
              {isAdmin ? (
                <button className="btn btn-primary" onClick={() => navigate('/admin')}>Open admin dashboard</button>
              ) : (
                <button className="btn btn-primary" onClick={start}>{user && recommendation ? 'Build my pack' : 'Find my fit'}</button>
              )}
              <button type="button" className="btn hx__ghost" onClick={() => scrollTo('how-it-works')}>Explore how it works</button>
            </div>
            <p className="hx__foot">*A development goal. Materials and environmental impact are not yet verified.</p>
          </div>
          <ol className="hx__principles" aria-label="What FEMORA is built on">
            <li><span>01</span><div><strong>Personal</strong><p>Your answers shape the suggestion, and you can change it.</p></div></li>
            <li><span>02</span><div><strong>Transparent</strong><p>Simple published rules. No AI claims, no medical advice.</p></div></li>
            <li><span>03</span><div><strong>Sustainable by intent</strong><p>Biodegradable materials are what we are working towards.</p></div></li>
          </ol>
        </div>
        <div className="hx__cats"><span>Pads</span><span>Tampons</span><span>Menstrual cups</span><span>Period underwear</span></div>
      </header>

      {isAdmin && (
        <section className="container adminband">
          <div className="adminband__box">
            <div><span className="eyebrow-plain">Admin snapshot (demo)</span><h2>{stats.total} order{stats.total === 1 ? '' : 's'} so far</h2>
              <p>{stats.pending} in progress · {stats.customers} customer{stats.customers === 1 ? '' : 's'} · ₹{stats.revenue} demo revenue</p></div>
            <button className="btn btn-primary" onClick={() => navigate('/admin')}>View orders &amp; customers</button>
          </div>
        </section>
      )}

      <section className="container section" id="range">
        <span className="eyebrow-plain">The concept range</span>
        <h2 className="section__title">Four product types, one personal suggestion</h2>
        <p className="section__lead">{CONCEPT_NOTE} Your suggestion is always for the product type you choose.</p>
        <div className="types">
          {Object.keys(CATALOG).map((t, i) => (
            <article className="types__item" key={t}>
              <span className="types__n">0{i + 1}</span>
              <h3>{TYPE_META[t].label}</h3>
              <p>{TYPE_DESC[t]}</p>
              <p className="types__vars">{CATALOG[t].map((x) => x.name).join(' · ')}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section section--tint" id="how-it-works">
        <div className="container">
          <span className="eyebrow-plain">How it works</span>
          <h2 className="section__title">From your answers to a suggestion you can inspect</h2>
          <ol className="steps">
            {STEPS.map(([n, t, d]) => (
              <li key={n}><span className="steps__n">{n}</span><h3>{t}</h3><p>{d}</p></li>
            ))}
          </ol>

          <div className="demo">
            <div className="demo__col">
              <h3>Sample answers <span className="demo__tag">Example only</span></h3>
              <dl className="demo__list">{SAMPLE_ROWS.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
            </div>
            <div className="demo__arrow" aria-hidden="true">→</div>
            <div className="demo__col demo__col--result">
              <h3>Suggested configuration</h3>
              <p className="demo__big">{PAD_CATALOG[sample.size].label}</p>
              <p className="demo__sub">{sample.softness} softness · {sample.leakageProtection} leakage-protection priority</p>
              <h4>Why</h4>
              <ul>{sample.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            </div>
          </div>
        </div>
      </section>

      <section className="container section" id="about">
        <span className="eyebrow-plain">Materials &amp; sustainability</span>
        <h2 className="section__title">Our goal, and what we have not verified yet</h2>
        <div className="trust">
          <div><h3>Our goal</h3><p>Develop pads made with biodegradable materials and a design that suits different flows, routines and skin needs.</p></div>
          <div><h3>Not verified yet</h3><p>Final material composition, how and how fast the product breaks down, skin-comfort testing, and any certification.</p></div>
          <div><h3>What we will not claim</h3><p>Certified, compostable, medically safe or environmentally better, until there is evidence we can show you.</p></div>
        </div>
      </section>

      {user && !isAdmin && <PeriodTracker />}

      <section className="section section--tint">
        <div className="container faq">
          <div><span className="eyebrow-plain">Questions</span><h2 className="section__title">Frequently asked</h2></div>
          <div className="faq__list">
            {FAQ.map(([q, a]) => (
              <details key={q}><summary>{q}</summary><p>{a}</p></details>
            ))}
          </div>
        </div>
      </section>

      <section className="container section finalcta">
        <h2 className="section__title">Find the configuration that fits you</h2>
        <p className="section__lead">Takes about two minutes. Demo mode: your answers stay in this browser.</p>
        {!isAdmin && <button className="btn btn-primary" onClick={start}>{user ? 'Start your personalization' : 'Find my fit'}</button>}
      </section>

      <Footer />
    </div>
  );
}

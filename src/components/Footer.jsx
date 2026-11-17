import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from './Logo';
import Modal from './Modal';
import { SUPPORT_EMAIL } from '../config';
import './Footer.css';

export default function Footer() {
  const navigate = useNavigate();
  const location = useLocation();
  const [openModal, setOpenModal] = useState(null); // 'privacy' | 'terms' | null

  function goToSection(id) {
    if (location.pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate('/', { state: { scrollTo: id } });
    }
  }

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <Logo size={30} dark />
          <p className="footer__tagline">Care Designed for You, Better for the Planet.</p>
        </div>
        <div className="footer__cols">
          <div className="footer__col">
            <span className="footer__heading">Company</span>
            <button type="button" onClick={() => goToSection('about')}>About</button>
            <a href={`mailto:${SUPPORT_EMAIL}`}>Contact</a>
          </div>
          <div className="footer__col">
            <span className="footer__heading">Legal</span>
            <button type="button" onClick={() => setOpenModal('privacy')}>Privacy</button>
            <button type="button" onClick={() => setOpenModal('terms')}>Terms</button>
          </div>
        </div>
      </div>
      <div className="container footer__bottom">
        <span>© {new Date().getFullYear()} FEMORA. Care designed for you, better for the planet.</span>
      </div>

      {openModal === 'privacy' && (
        <Modal title="Privacy Policy" onClose={() => setOpenModal(null)}>
          <p>
            This is a demo. If you sign up, your name, email, phone, age, password (hashed in your
            browser), questionnaire answers, delivery address, optional period-tracker entries, orders and payment method (never card numbers, CVV or UPI PINs)
            are saved in this browser's local storage. There is no server: nothing is sent to FEMORA.
          </p>
          <p>
            Anyone using the same browser profile, and the demo admin login on that browser, can see this data.
            Browser-side hashing is not production-grade security, so please do not enter a password you use elsewhere
            or information you would not want others on the device to see. Clearing your browser data deletes it.
          </p>
          <p>A real FEMORA service would need a secure backend and an updated policy before collecting real customer data.</p>
        </Modal>
      )}
      {openModal === 'terms' && (
        <Modal title="Terms of Use" onClose={() => setOpenModal(null)}>
          <p>
            This website is a prototype for an entrepreneurship project. Pads, specifications and prices shown are
            proposed concepts, not validated or available products, and no sustainability certification is claimed.
          </p>
          <p>
            Recommendations come from a transparent rule-based tool. They are not medical advice, do not diagnose any condition,
            and cannot guarantee protection from leakage or irritation. Period-tracker dates are simple calendar estimates.
          </p>
          <p>"Creating" an order makes a demo record only. No real purchase, payment or delivery is initiated.</p>
        </Modal>
      )}
    </footer>
  );
}

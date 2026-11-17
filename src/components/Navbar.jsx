import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import Logo from './Logo';
import './Navbar.css';

export default function Navbar({ transparent = false }) {
  const { user, isAdmin, logout } = useUser();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  function handleLogout() {
    setMenuOpen(false);
    logout();
    navigate('/');
  }

  return (
    <header className={`navbar ${transparent ? 'navbar--transparent' : ''}`}>
      <div className="container navbar__inner">
        <Link to="/" className="navbar__brand">
          <Logo size={34} dark={transparent} />
        </Link>
        <nav className="navbar__links">
          <Link to="/" state={{ scrollTo: 'how-it-works' }} className={transparent ? 'navbar__link--light' : ''}>How it works</Link>
          <Link to="/" state={{ scrollTo: 'about' }} className={transparent ? 'navbar__link--light' : ''}>About</Link>
          {user && !isAdmin && (
            <Link to="/" state={{ scrollTo: 'period-tracker' }} className={transparent ? 'navbar__link--light' : ''}>Period tracker</Link>
          )}
          {user ? (
            <div className="navbar__account" ref={menuRef}>
              <button
                type="button"
                className="navbar__user"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="true"
                aria-expanded={menuOpen}
              >
                {user.name.split(' ')[0]}{isAdmin && <span className="navbar__badge">Admin</span>}
                <span className="navbar__caret" aria-hidden="true">▾</span>
              </button>
              {menuOpen && (
                <div className="navbar__menu" role="menu">
                  <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); navigate(isAdmin ? '/admin' : '/dashboard'); }}>
                    {isAdmin ? 'Admin dashboard' : 'Dashboard'}
                  </button>
                  {!isAdmin && (
                    <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); navigate('/dashboard', { state: { scrollTo: 'orders' } }); }}>
                      My orders
                    </button>
                  )}
                  <button type="button" role="menuitem" onClick={handleLogout} className="navbar__menu-logout">
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="navbar__auth">
              <button className={`navbar__ghost ${transparent ? 'navbar__ghost--light' : ''}`} onClick={() => navigate('/login')}>Log in</button>
              <button className={`navbar__login ${transparent ? 'navbar__login--light' : ''}`} onClick={() => navigate('/signup')}>Sign Up</button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { UserProvider, useUser } from './context/UserContext';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Admin from './pages/Admin';
import Ready from './pages/Ready';
import Questionnaire from './pages/Questionnaire';
import ProblemInput from './pages/ProblemInput';
import Recommendation from './pages/Recommendation';
import ProductType from './pages/ProductType';
import PackBuilder from './pages/PackBuilder';
import Summary from './pages/Summary';
import Dashboard from './pages/Dashboard';

function ScrollToTop() {
  const { pathname, state } = useLocation();
  useEffect(() => { if (!state?.scrollTo) window.scrollTo(0, 0); }, [pathname, state]);
  return null;
}

// Customer-only pages: logged-out visitors go to login, admins go to their dashboard.
function RequireUser({ children }) {
  const { user, isAdmin } = useUser();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { isAdmin } = useUser();
  return isAdmin ? children : <Navigate to="/login" replace />;
}

// Already logged in? Skip the login/signup screens.
function GuestOnly({ children }) {
  const { user, isAdmin } = useUser();
  return user ? <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace /> : children;
}

function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}>
      <div>
        <h1>Page not found</h1>
        <p style={{ margin: '12px 0 24px', color: 'var(--ink-500)' }}>The page you are looking for does not exist.</p>
        <Link to="/" className="btn btn-primary">Back to home</Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <UserProvider>
      <HashRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<GuestOnly><Auth mode="login" /></GuestOnly>} />
          <Route path="/signup" element={<GuestOnly><Auth mode="signup" /></GuestOnly>} />
          <Route path="/get-started" element={<Navigate to="/signup" replace />} />
          <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
          <Route path="/ready" element={<RequireUser><Ready /></RequireUser>} />
          <Route path="/questionnaire" element={<RequireUser><Questionnaire /></RequireUser>} />
          <Route path="/tell-us" element={<RequireUser><ProblemInput /></RequireUser>} />
          <Route path="/product-type" element={<RequireUser><ProductType /></RequireUser>} />
          <Route path="/recommendation" element={<RequireUser><Recommendation /></RequireUser>} />
          <Route path="/pack" element={<RequireUser><PackBuilder /></RequireUser>} />
          <Route path="/summary" element={<RequireUser><Summary /></RequireUser>} />
          <Route path="/dashboard" element={<RequireUser><Dashboard /></RequireUser>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </UserProvider>
  );
}

import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ProtectedRoute } from './components/ui/ProtectedRoute';

import LanguageSelect from './pages/candidate/LanguageSelect';
import Register from './pages/candidate/Register';
import Interview from './pages/candidate/Interview';
import Processing from './pages/candidate/Processing';
import Result from './pages/candidate/Result';

import AdminLayout from './pages/admin/AdminLayout';
import Login from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import Candidates from './pages/admin/Candidates';
import CandidateDetail from './pages/admin/CandidateDetail';
import Flagged from './pages/admin/Flagged';
import Shortlisted from './pages/admin/Shortlisted';

const candidateTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.35 },
};
const adminTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

const Page = ({ children, isAdmin }) => (
  <motion.div {...(isAdmin ? adminTransition : candidateTransition)} className="min-h-screen">
    {children}
  </motion.div>
);

export default function App() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <ErrorBoundary>
      <ToastProvider>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname.split('/')[1] || 'root'}>
            {/* Candidate flow */}
            <Route path="/" element={<Page><LanguageSelect /></Page>} />
            <Route path="/register" element={<Page><Register /></Page>} />
            <Route path="/interview" element={<Page><Interview /></Page>} />
            <Route path="/processing" element={<Page><Processing /></Page>} />
            <Route path="/result" element={<Page><Result /></Page>} />

            {/* Admin flow */}
            <Route path="/admin/login" element={<Page isAdmin><Login /></Page>} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="candidates" element={<Candidates />} />
              <Route path="candidates/:id" element={<CandidateDetail />} />
              <Route path="flagged" element={<Flagged />} />
              <Route path="shortlisted" element={<Shortlisted />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </ToastProvider>
    </ErrorBoundary>
  );
}

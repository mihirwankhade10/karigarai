import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { tokenStore } from '../../lib/api';

// Decode a JWT payload without verifying signature (verification happens
// server-side). Returns null if malformed or expired.
function decodePayload(token) {
  try {
    const [, payload] = token.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch (_) {
    return null;
  }
}

function jwtIsValid() {
  const t = tokenStore.get();
  if (!t) return false;
  const payload = decodePayload(t);
  if (!payload) return false;
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    tokenStore.clear();
    return false;
  }
  return true;
}

export const ProtectedRoute = ({ children }) => {
  const isAuthed = useAppStore((s) => s.isAdminAuthenticated);
  const location = useLocation();
  if (!isAuthed || !jwtIsValid()) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }
  return children;
};

import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';

export const ProtectedRoute = ({ children }) => {
  const isAuthed = useAppStore((s) => s.isAdminAuthenticated);
  const location = useLocation();
  if (!isAuthed) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }
  return children;
};

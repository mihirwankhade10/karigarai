import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail } from 'lucide-react';
import { mockApi } from '../../lib/mockApi';
import { useAppStore } from '../../store/appStore';
import { Button } from '../../components/ui/Button';
import { Input, Label } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useToast } from '../../components/ui/Toast';

export default function Login() {
  const navigate = useNavigate();
  const login = useAppStore((s) => s.loginAdmin);
  const toast = useToast();
  const [email, setEmail] = useState('admin@edcs.kar.gov.in');
  const [password, setPassword] = useState('admin123');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await mockApi.adminLogin({ email, password });
    setSubmitting(false);
    if (res.success) {
      login(res.user);
      navigate('/admin/dashboard');
    } else {
      toast.error(res.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8"
      >
        <div className="text-center mb-8">
          <div className="text-2xl font-extrabold tracking-tight text-slate-900 mb-1">
            Karigar<span className="text-brand">AI</span>
          </div>
          <p className="text-xs uppercase tracking-widest text-slate-500">Admin Portal</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label required>Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                placeholder="admin@edcs.kar.gov.in"
              />
            </div>
          </div>
          <div>
            <Label required>Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                placeholder="admin123"
              />
            </div>
          </div>
          <Button type="submit" fullWidth size="lg" disabled={submitting}>
            {submitting ? <LoadingSpinner size={18} /> : 'Sign In'}
          </Button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          Demo credentials prefilled · admin@edcs.kar.gov.in / admin123
        </p>
      </motion.div>
    </div>
  );
}

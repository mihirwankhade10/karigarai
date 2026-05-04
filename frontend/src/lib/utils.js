import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs) => twMerge(clsx(inputs));

export const scoreColor = (score) => {
  if (score >= 75) return { bg: 'bg-success', text: 'text-success', stroke: '#16A34A', label: 'Excellent' };
  if (score >= 50) return { bg: 'bg-info', text: 'text-info', stroke: '#2563EB', label: 'Good' };
  if (score >= 30) return { bg: 'bg-warning', text: 'text-warning', stroke: '#D97706', label: 'Fair' };
  return { bg: 'bg-danger', text: 'text-danger', stroke: '#DC2626', label: 'Low' };
};

export const fitmentTheme = (category) => {
  const map = {
    job_ready: {
      label: 'Job Ready',
      labelKn: 'ಕೆಲಸಕ್ಕೆ ಸಿದ್ಧ',
      bg: 'bg-success/10',
      text: 'text-success',
      ring: 'ring-success/30',
      pill: 'bg-success text-white',
      icon: '✅',
    },
    requires_upskilling: {
      label: 'Training Recommended',
      labelKn: 'ತರಬೇತಿ ಶಿಫಾರಸು',
      bg: 'bg-info/10',
      text: 'text-info',
      ring: 'ring-info/30',
      pill: 'bg-info text-white',
      icon: '📚',
    },
    manual_review: {
      label: 'Under Review',
      labelKn: 'ಪರಿಶೀಲನೆಯಲ್ಲಿ',
      bg: 'bg-warning/10',
      text: 'text-warning',
      ring: 'ring-warning/30',
      pill: 'bg-warning text-white',
      icon: '🔍',
    },
    low_confidence: {
      label: 'Please Retry',
      labelKn: 'ಮತ್ತೊಮ್ಮೆ ಪ್ರಯತ್ನಿಸಿ',
      bg: 'bg-slate-200',
      text: 'text-slate-600',
      ring: 'ring-slate-300',
      pill: 'bg-slate-500 text-white',
      icon: '⚠️',
    },
    suspected_fraud: {
      label: 'Fraud Suspected',
      labelKn: 'ವಂಚನೆ ಶಂಕೆ',
      bg: 'bg-danger/10',
      text: 'text-danger',
      ring: 'ring-danger/30',
      pill: 'bg-danger text-white',
      icon: '🚨',
    },
  };
  return map[category] || map.manual_review;
};

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

export const downloadCsv = (filename, rows) => {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

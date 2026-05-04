import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  ArrowRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { mockApi } from '../../lib/mockApi';
import { CANDIDATES } from '../../lib/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { CandidateAvatar } from '../../components/ui/CandidateAvatar';
import { FitmentBadge } from '../../components/ui/FitmentBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { fitmentTheme, formatDate, scoreColor, cn } from '../../lib/utils';

const PIE_COLORS = {
  job_ready: '#16A34A',
  requires_upskilling: '#2563EB',
  manual_review: '#D97706',
  low_confidence: '#94A3B8',
  suspected_fraud: '#DC2626',
};

const StatCard = ({ icon: Icon, label, value, sub, accent, delta }) => (
  <Card className="hover:shadow-md transition">
    <CardContent className="flex items-start justify-between">
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">{label}</p>
        <p className={cn('text-3xl font-extrabold tabular-nums', accent || 'text-slate-900')}>
          {value}
        </p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
      <div className="flex flex-col items-end gap-2">
        <div
          className={cn(
            'h-10 w-10 rounded-xl flex items-center justify-center',
            accent === 'text-danger' ? 'bg-danger/10 text-danger' : 'bg-brand/10 text-brand'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        {delta && (
          <span className="inline-flex items-center gap-0.5 text-[11px] text-success font-semibold">
            <ArrowUpRight className="h-3 w-3" /> {delta}
          </span>
        )}
      </div>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    let alive = true;
    mockApi.getAnalytics().then((a) => alive && setAnalytics(a));
    return () => { alive = false; };
  }, []);

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size={40} />
      </div>
    );
  }

  const recent = [...CANDIDATES]
    .sort((a, b) => new Date(b.interviewDate) - new Date(a.interviewDate))
    .slice(0, 10);

  const pieData = analytics.fitmentDistribution.map((d) => ({
    name: fitmentTheme(d.category).label,
    category: d.category,
    value: d.count,
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-5 md:p-8 max-w-7xl mx-auto"
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Overview of candidate assessments</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Users}
          label="Total Candidates"
          value={analytics.totalCandidates}
          sub="across all districts"
          delta="+12% this week"
        />
        <StatCard
          icon={CheckCircle2}
          label="Job Ready"
          value={analytics.jobReadyCount}
          sub={`${Math.round((analytics.jobReadyCount / analytics.totalCandidates) * 100)}% of total`}
          delta="+8%"
        />
        <StatCard
          icon={AlertTriangle}
          label="Flagged Cases"
          value={analytics.flaggedCount}
          sub="awaiting review"
          accent="text-danger"
        />
        <StatCard
          icon={TrendingUp}
          label="Processed Today"
          value={analytics.processedToday}
          sub="last 24 hours"
          delta="+5"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Daily Intake</CardTitle>
            <p className="text-xs text-slate-500">Candidates registered over the last 7 days</p>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.dailyIntake} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaOrange" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F97316" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }}
                  cursor={{ fill: '#FED7AA', opacity: 0.2 }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#F97316"
                  strokeWidth={2.5}
                  fill="url(#areaOrange)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Fitment Distribution</CardTitle>
            <p className="text-xs text-slate-500">Across {analytics.totalCandidates} candidates</p>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.category} fill={PIE_COLORS[entry.category]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }}
                  formatter={(v, n) => [`${v} candidates`, n]}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(v) => <span className="text-slate-600">{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Candidates</CardTitle>
            <p className="text-xs text-slate-500">Latest 10 assessments</p>
          </div>
          <Link
            to="/admin/candidates"
            className="text-sm text-brand font-semibold inline-flex items-center gap-1 hover:underline"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <th className="px-5 py-3">Candidate</th>
                <th className="px-3 py-3">District</th>
                <th className="px-3 py-3">Trade</th>
                <th className="px-3 py-3">Fitment</th>
                <th className="px-3 py-3">ACS</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((c) => {
                const sc = scoreColor(c.acsScore);
                return (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <CandidateAvatar src={c.photo} name={c.name} size={32} />
                        <div>
                          <div className="font-semibold text-slate-800">{c.name}</div>
                          <div className="text-xs text-slate-500">{c.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{c.district}</td>
                    <td className="px-3 py-3 text-slate-700">{c.tradeCategory}</td>
                    <td className="px-3 py-3">
                      <FitmentBadge category={c.fitmentCategory} size="sm" showIcon={false} />
                    </td>
                    <td className={cn('px-3 py-3 font-semibold tabular-nums', sc.text)}>
                      {c.acsScore}
                    </td>
                    <td className="px-3 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {formatDate(c.interviewDate)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        to={`/admin/candidates/${c.id}`}
                        className="text-brand font-semibold text-xs hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
}

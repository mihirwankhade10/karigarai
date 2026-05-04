import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Briefcase,
  Languages,
  Calendar,
  Star,
  Flag,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { mockApi } from '../../lib/mockApi';
import { useAppStore } from '../../store/appStore';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { CandidateAvatar } from '../../components/ui/CandidateAvatar';
import { FitmentBadge } from '../../components/ui/FitmentBadge';
import { AcsRing } from '../../components/ui/AcsRing';
import { ScoreBar } from '../../components/ui/ScoreBar';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useToast } from '../../components/ui/Toast';
import { fitmentTheme, formatDate, cn } from '../../lib/utils';

export default function CandidateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [summaryLang, setSummaryLang] = useState('en');
  const [candidate, setCandidate] = useState(null);
  const shortlistedIds = useAppStore((s) => s.shortlistedIds);
  const toggleShortlist = useAppStore((s) => s.toggleShortlist);

  const fetchDetail = () => {
    mockApi.getCandidateDetail(id).then((c) => setCandidate(c));
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!candidate) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={40} />
      </div>
    );
  }

  const isShort = shortlistedIds.includes(candidate.id);
  const theme = fitmentTheme(candidate.fitmentCategory);

  const handleShortlist = async () => {
    toggleShortlist(candidate.id);
    await mockApi.shortlistCandidate(candidate.id, isShort ? 'remove' : 'add');
    toast.success(isShort ? 'Removed from shortlist' : 'Added to shortlist');
  };

  const handleResolveFlag = async (resolution) => {
    const r = await mockApi.resolveFlag(candidate.id, resolution);
    if (r.success) {
      setCandidate(r.candidate);
      toast.success(resolution === 'confirm' ? 'Flagged as fraud' : 'Flag cleared');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-5 md:p-8 max-w-7xl mx-auto"
    >
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardContent className="text-center">
              <CandidateAvatar
                src={candidate.photo}
                name={candidate.name}
                size={120}
                className="mx-auto mb-4 ring-4 ring-brand/10"
              />
              <h2 className="text-xl font-bold text-slate-900">{candidate.name}</h2>
              <p className="text-sm text-slate-500 mb-4">{candidate.id}</p>

              <div className="space-y-2.5 text-left text-sm border-t border-slate-100 pt-4">
                <Row icon={Phone} label="Phone" value={candidate.phone} />
                <Row icon={MapPin} label="District" value={candidate.district} />
                <Row icon={Briefcase} label="Trade" value={candidate.tradeCategory} />
                <Row
                  icon={Languages}
                  label="Language"
                  value={candidate.language.charAt(0).toUpperCase() + candidate.language.slice(1)}
                />
                <Row icon={Calendar} label="Interview" value={formatDate(candidate.interviewDate)} />
              </div>

              <div className="mt-4 flex items-center justify-center gap-2">
                <span
                  className={cn(
                    'inline-flex px-2.5 py-1 rounded-full text-xs font-semibold',
                    candidate.status === 'flagged'
                      ? 'bg-warning/10 text-warning'
                      : 'bg-success/10 text-success'
                  )}
                >
                  {candidate.status}
                </span>
              </div>
            </CardContent>
          </Card>

          <Button
            fullWidth
            variant={isShort ? 'success' : 'outline'}
            onClick={handleShortlist}
            className="gap-2"
          >
            <Star className={cn('h-4 w-4', isShort && 'fill-current')} />
            {isShort ? 'Shortlisted' : 'Add to Shortlist'}
          </Button>
          {!candidate.fraudFlag && (
            <Button
              fullWidth
              variant="outline"
              onClick={() => handleResolveFlag('confirm')}
              className="gap-2 text-warning border-warning/40 hover:bg-warning/5"
            >
              <Flag className="h-4 w-4" /> Flag for Review
            </Button>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-2">
          <Tabs value={tab} onChange={setTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="scores">Scores</TabsTrigger>
              <TabsTrigger value="summary">AI Summary</TabsTrigger>
              <TabsTrigger value="fraud">Fraud Check</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Fitment</p>
                      <FitmentBadge category={candidate.fitmentCategory} size="lg" />
                      <p className="mt-4 text-sm text-slate-600">
                        Workforce segment:{' '}
                        <span className="font-semibold text-slate-800 capitalize">
                          {candidate.workforceSegment.replace('_', ' ')}
                        </span>
                      </p>
                    </div>
                    <div className="flex justify-center">
                      <AcsRing score={candidate.acsScore} size={170} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scores">
              <Card>
                <CardContent className="space-y-5">
                  <ScoreBar label="Overall ACS Score" score={candidate.acsScore} />
                  <ScoreBar label="Relevance & Completeness" score={candidate.relevanceScore} />
                  <ScoreBar label="Communication Clarity" score={candidate.clarityScore} />
                  <ScoreBar label="Skill Confidence" score={candidate.skillConfidenceScore} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="summary">
              <Card>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs uppercase tracking-widest text-slate-500">AI Summary</p>
                    <button
                      onClick={() => setSummaryLang((l) => (l === 'en' ? 'kn' : 'en'))}
                      className="text-xs text-brand font-semibold hover:underline"
                    >
                      {summaryLang === 'en' ? 'View in Kannada' : 'View in English'}
                    </button>
                  </div>
                  <blockquote
                    className={cn(
                      'border-l-4 border-brand pl-4 italic text-slate-700 leading-relaxed text-base',
                      summaryLang === 'kn' && 'font-kannada'
                    )}
                  >
                    "{summaryLang === 'en' ? candidate.aiSummaryEn : candidate.aiSummaryKn}"
                  </blockquote>

                  <div className="mt-6">
                    <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
                      Key Observations
                    </p>
                    <ul className="space-y-2">
                      {candidate.keyObservations?.map((obs, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                          {obs}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fraud">
              {candidate.fraudFlag ? (
                <Card className="border-danger/30">
                  <CardContent>
                    <div className="flex items-start gap-3 mb-5 p-4 rounded-xl bg-danger/5 border border-danger/20">
                      <AlertTriangle className="h-5 w-5 text-danger mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-danger">⚠️ Suspected Duplicate / Fraud</p>
                        <p className="text-sm text-slate-700 mt-1">{candidate.fraudReason}</p>
                      </div>
                    </div>
                    {candidate.fraudSimilarity != null && (
                      <ScoreBar
                        label="Detection Confidence"
                        score={Math.round(candidate.fraudSimilarity * 100)}
                      />
                    )}
                    <div className="grid grid-cols-2 gap-3 mt-6">
                      <Button
                        variant="danger"
                        onClick={() => handleResolveFlag('confirm')}
                        className="gap-1.5"
                      >
                        <Flag className="h-4 w-4" /> Confirm as Fraud
                      </Button>
                      <Button
                        variant="success"
                        onClick={() => handleResolveFlag('clear')}
                        className="gap-1.5"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Clear Flag
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent>
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-success/5 border border-success/20 mb-4">
                      <ShieldCheck className="h-5 w-5 text-success mt-0.5" />
                      <div>
                        <p className="font-semibold text-success">✅ No fraud indicators detected</p>
                        <p className="text-sm text-slate-700 mt-1">
                          Voice biometric and face match within expected thresholds.
                        </p>
                      </div>
                    </div>
                    <ScoreBar
                      label="Face Match Confidence"
                      score={Math.round((candidate.faceMatchConfidence || 0.95) * 100)}
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </motion.div>
  );
}

const Row = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3">
    <Icon className="h-4 w-4 text-slate-400 shrink-0" />
    <div className="flex items-baseline justify-between gap-2 flex-1 min-w-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800 truncate">{value}</span>
    </div>
  </div>
);

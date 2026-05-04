import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, RefreshCw, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/appStore';
import { mockApi } from '../../lib/mockApi';
import { KARNATAKA_DISTRICTS, TRADE_CATEGORIES } from '../../lib/mockData';
import { Button } from '../../components/ui/Button';
import { Input, Label, FieldError } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useToast } from '../../components/ui/Toast';

export default function Register() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const lang = useAppStore((s) => s.selectedLanguage);
  const setCandidate = useAppStore((s) => s.setCandidate);
  const setCandidateId = useAppStore((s) => s.setCandidateId);
  const toast = useToast();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    district: '',
    tradeCategory: '',
    language: lang === 'kn' ? 'kannada' : lang === 'hi' ? 'hindi' : 'english',
  });
  const [photo, setPhoto] = useState(null);
  const [showCam, setShowCam] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const webcamRef = useRef(null);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const capture = useCallback(() => {
    const img = webcamRef.current?.getScreenshot();
    if (img) {
      setPhoto(img);
      setShowCam(false);
    }
  }, []);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = t('fieldRequired');
    if (!/^\d{10}$/.test(form.phone)) e.phone = t('phoneInvalid');
    if (!form.district) e.district = t('fieldRequired');
    if (!form.tradeCategory) e.tradeCategory = t('fieldRequired');
    if (!photo) e.photo = t('photoRequired');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) {
      toast.error(t('error'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await mockApi.registerCandidate(form);
      setCandidate({ ...form, photo });
      setCandidateId(res.candidateId);
      navigate('/interview');
    } catch (err) {
      toast.error(err?.message || t('error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark text-white">
      <header className="sticky top-0 z-20 bg-bg-dark/95 backdrop-blur border-b border-white/5">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/5 hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="font-bold tracking-tight">
            Karigar<span className="text-brand">AI</span>
          </div>
          <LanguageSwitcher variant="dark" />
        </div>
        <div className="px-4 pb-3">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full ${s === 1 ? 'bg-brand' : 'bg-white/10'}`}
              />
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">{t('step', { current: 1, total: 3 })}</p>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-6 max-w-md mx-auto"
      >
        <h1 className="text-2xl font-bold mb-1">{t('register')}</h1>
        <p className="text-sm text-slate-400 mb-6">{t('tagline')}</p>

        <form className="space-y-4 text-slate-100" onSubmit={submit}>
          <div>
            <Label className="text-slate-200" required>{t('fullName')}</Label>
            <Input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder={t('fullNamePlaceholder')}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              error={!!errors.name}
            />
            <FieldError>{errors.name}</FieldError>
          </div>
          <div>
            <Label className="text-slate-200" required>{t('mobileNumber')}</Label>
            <Input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={form.phone}
              onChange={(e) => update('phone', e.target.value.replace(/\D/g, ''))}
              placeholder={t('mobilePlaceholder')}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              error={!!errors.phone}
            />
            <FieldError>{errors.phone}</FieldError>
          </div>
          <div>
            <Label className="text-slate-200" required>{t('district')}</Label>
            <Select
              value={form.district}
              onChange={(e) => update('district', e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              error={!!errors.district}
            >
              <option value="" className="text-slate-900 bg-white">{t('selectDistrict')}</option>
              {KARNATAKA_DISTRICTS.map((d) => (
                <option key={d} value={d} className="text-slate-900 bg-white">{d}</option>
              ))}
            </Select>
            <FieldError>{errors.district}</FieldError>
          </div>
          <div>
            <Label className="text-slate-200" required>{t('trade')}</Label>
            <Select
              value={form.tradeCategory}
              onChange={(e) => update('tradeCategory', e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              error={!!errors.tradeCategory}
            >
              <option value="" className="text-slate-900 bg-white">{t('selectTrade')}</option>
              {TRADE_CATEGORIES.map((d) => (
                <option key={d} value={d} className="text-slate-900 bg-white">{d}</option>
              ))}
            </Select>
            <FieldError>{errors.tradeCategory}</FieldError>
          </div>
          <div>
            <Label className="text-slate-200">{t('preferredLanguage')}</Label>
            <Select
              value={form.language}
              onChange={(e) => update('language', e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            >
              <option value="kannada" className="text-slate-900 bg-white">ಕನ್ನಡ — Kannada</option>
              <option value="hindi" className="text-slate-900 bg-white">हिंदी — Hindi</option>
              <option value="english" className="text-slate-900 bg-white">English</option>
            </Select>
          </div>

          <div className="pt-2">
            <Label className="text-slate-200" required>{t('takePhoto')}</Label>
            <div className="flex flex-col items-center gap-3 py-3">
              <div className="relative h-40 w-40 rounded-full overflow-hidden bg-white/5 border-2 border-dashed border-white/15 flex items-center justify-center">
                {photo ? (
                  <img src={photo} alt="captured" className="h-full w-full object-cover" />
                ) : showCam ? (
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    videoConstraints={{ facingMode: 'user' }}
                    screenshotFormat="image/jpeg"
                    className="h-full w-full object-cover"
                    onUserMediaError={() => {
                      toast.warning('Camera unavailable — using fallback');
                      setShowCam(false);
                      setPhoto('https://i.pravatar.cc/200?img=33');
                    }}
                  />
                ) : (
                  <Camera className="h-10 w-10 text-slate-500" />
                )}
              </div>
              {photo ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setPhoto(null);
                    setShowCam(true);
                  }}
                  className="gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> {t('retake')}
                </Button>
              ) : showCam ? (
                <Button type="button" size="sm" onClick={capture} className="gap-1.5">
                  <Camera className="h-3.5 w-3.5" /> {t('takePhoto')}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowCam(true)}
                  className="gap-1.5"
                >
                  <Camera className="h-3.5 w-3.5" /> {t('takePhoto')}
                </Button>
              )}
              <FieldError>{errors.photo}</FieldError>
            </div>
          </div>

          <Button type="submit" fullWidth size="lg" disabled={submitting} className="gap-2 mt-2">
            {submitting ? (
              <>
                <LoadingSpinner size={18} /> {t('loading')}
              </>
            ) : (
              <>
                {t('next')} <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

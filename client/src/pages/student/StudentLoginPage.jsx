import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { FlaskConical, ArrowRight, ShieldAlert, CheckCircle2, Lock, Sparkles, Building2, BookOpen } from 'lucide-react';
import Button from '../../components/common/Button';

const StudentLoginPage = () => {
  const [registerNumber, setRegisterNumber] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [activeExams, setActiveExams] = useState([]);
  const [availableExams, setAvailableExams] = useState([]);
  const [requiresSelection, setRequiresSelection] = useState(false);
  const [loading, setLoading] = useState(false);
  const [examLoading, setExamLoading] = useState(true);
  const [error, setError] = useState('');

  const { studentLoginAction } = useAuth();
  const navigate = useNavigate();

  // Load active examinations on mount
  useEffect(() => {
    const fetchActiveExams = async () => {
      try {
        const res = await api.get('/students/active-exams');
        if (res.data.success) {
          setActiveExams(res.data.exams || []);
          if (res.data.exams?.length > 0) {
            setSelectedExamId(res.data.exams[0]._id);
          }
        }
      } catch (err) {
        console.error('Failed to load active exams:', err);
      } finally {
        setExamLoading(false);
      }
    };
    fetchActiveExams();
  }, []);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');

    const trimmedReg = registerNumber.trim().toUpperCase();
    if (!trimmedReg) {
      setError('Please enter your Register Number.');
      return;
    }

    setLoading(true);
    try {
      const data = await studentLoginAction(trimmedReg, selectedExamId || undefined);

      if (data?.requiresExamSelection) {
        setRequiresSelection(true);
        setAvailableExams(data.availableExams || []);
        if (data.availableExams?.length > 0) {
          setSelectedExamId(data.availableExams[0].id);
        }
        setLoading(false);
        return;
      }

      // Successful login -> Redirect to assigned question page
      const examId = selectedExamId || data.exam?.id;
      navigate(`/student/exam/${examId}`);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your register number and exam status.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (reg) => {
    setRegisterNumber(reg);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* College & Brand Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 mb-4 ring-4 ring-indigo-500/20">
            <FlaskConical className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">SmartLab Examination Portal</h1>
          <p className="text-xs text-indigo-300 font-medium mt-1 flex items-center justify-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            RGM College of Engineering & Technology, Nandyal
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-8">
          <div className="border-b border-slate-100 pb-5 mb-6 text-center">
            <h2 className="text-lg font-semibold text-slate-800">Student Portal Login</h2>
            <p className="text-xs text-slate-500 mt-1">
              Access your permanently assigned laboratory question set
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Examination Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Active Examination
              </label>
              {examLoading ? (
                <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
              ) : activeExams.length > 0 ? (
                <div className="relative">
                  <select
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  >
                    {activeExams.map((exam) => (
                      <option key={exam._id} value={exam._id}>
                        {exam.title} ({exam.subject?.subjectCode || 'LAB'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>No active lab examination right now. Check back when scheduled.</span>
                </div>
              )}
            </div>

            {/* Register Number Input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  College Register Number
                </label>
                <span className="text-[11px] text-slate-400">e.g. 23091A32F9</span>
              </div>
              <input
                type="text"
                placeholder="Enter your Register Number (e.g. 23CS001)"
                value={registerNumber}
                onChange={(e) => setRegisterNumber(e.target.value.toUpperCase())}
                autoFocus
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm uppercase font-mono tracking-wider text-slate-900 placeholder:text-slate-400 placeholder:normal-case focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              />
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full font-semibold"
              icon={ArrowRight}
            >
              Access Question Set
            </Button>
          </form>

          {/* Quick Demo Selector for Evaluator / Testing */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Quick test accounts:
              </span>
              <span className="text-[10px] text-indigo-600 font-mono">Dept: CSEDS Yr: 3</span>
            </div>
           
          </div>
        </div>

        {/* Faculty Link Footer */}
        <div className="mt-6 text-center">
          <a
            href="/faculty/login"
            className="text-xs text-indigo-300 hover:text-white underline underline-offset-4 transition-colors"
          >
            Faculty & Administrator Login &rarr;
          </a>
        </div>
      </div>
    </div>
  );
};

export default StudentLoginPage;

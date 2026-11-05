import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  Printer,
  Maximize2,
  Minimize2,
  LogOut,
  Building2,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FlaskConical,
  FileText
} from 'lucide-react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

const StudentQuestionPage = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { studentToken, studentLogout } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!studentToken) {
      navigate('/', { replace: true });
      return;
    }

    const fetchAssignment = async () => {
      try {
        const res = await api.get('/students/my-assignment');
        if (res.data.success) {
          setData(res.data);
        } else {
          setError(res.data.message || 'Failed to load question set.');
        }
      } catch (err) {
        setError(err.message || 'Failed to connect to examination server.');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignment();
  }, [studentToken, navigate]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleLogout = () => {
    studentLogout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 animate-spin">
            <FlaskConical className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">Retrieving Your Assigned Question Paper</h3>
          <p className="text-xs text-slate-500 mt-1">Please wait while your permanent question set is verified...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md w-full text-center p-8 bg-white rounded-2xl shadow-sm border border-rose-200">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Access Denied</h3>
          <p className="text-sm text-slate-600 mt-2 mb-6">{error}</p>
          <Button variant="primary" onClick={handleLogout}>
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  const { student, examination, assignedSet } = data;

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 sm:px-6 lg:px-8">
      {/* Top Action Bar (hidden in print) */}
      <div className="no-print max-w-4xl mx-auto mb-6 flex items-center justify-between bg-white px-5 py-3 rounded-xl shadow-xs border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Live Lab Examination Session
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={Printer} onClick={handlePrint}>
            Print Question Paper
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={isFullscreen ? Minimize2 : Maximize2}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          </Button>
          <Button variant="ghost" size="sm" icon={LogOut} onClick={handleLogout} className="text-rose-600 hover:bg-rose-50">
            Exit
          </Button>
        </div>
      </div>

      {/* Main Question Paper Container */}
      <div className="exam-paper-container max-w-4xl mx-auto bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
        {/* Institutional Header */}
        <div className="p-8 border-b-2 border-slate-900 bg-slate-50/50 text-center">
          <div className="flex items-center justify-center gap-2 text-indigo-700 font-semibold text-xs tracking-wider uppercase mb-1">
            <Building2 className="w-4 h-4" />
            {examination.collegeName || 'National Institute of Engineering and Technology'}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
            {examination.title}
          </h1>
          <p className="text-sm font-semibold text-slate-700 mt-1">
            {examination.subjectName} ({examination.subjectCode}) &bull; {examination.labName}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600 border-t border-slate-200/80 pt-3">
            <span className="flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Date: {new Date(examination.examDate).toLocaleDateString()}
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Timing: {examination.startTime} - {examination.endTime}
            </span>
            <span>&bull;</span>
            <span className="font-semibold text-slate-800">
              Total Marks: {assignedSet.totalMarks}
            </span>
          </div>
        </div>

        {/* Candidate Information & Assigned Set Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 border-b border-slate-200 divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-white">
          <div className="p-5 md:col-span-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Candidate Details
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500">Student Name:</span>
                <p className="font-bold text-slate-900 text-sm">{student.fullName}</p>
              </div>
              <div>
                <span className="text-slate-500">Register Number:</span>
                <p className="font-mono font-bold text-indigo-700 text-sm tracking-wider">
                  {student.registerNumber}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Department:</span>
                <p className="font-semibold text-slate-800">{student.department}</p>
              </div>
              <div>
                <span className="text-slate-500">Year / Section:</span>
                <p className="font-semibold text-slate-800">
                  Year {student.year} &bull; Section {student.section}
                </p>
              </div>
            </div>
          </div>

          {/* Assigned Question Set Box (Prominently Highlighted) */}
          <div className="p-5 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 flex flex-col justify-center items-center text-center">
            <div className="text-[11px] font-bold text-indigo-900/60 uppercase tracking-wider mb-1">
              Assigned Question Set
            </div>
            <div className="text-2xl font-black text-indigo-700 tracking-tight">
              {assignedSet.setName}
            </div>
            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Permanently Allocated
            </span>
          </div>
        </div>

        {/* General Instructions */}
        {examination.instructions && (
          <div className="px-8 py-4 bg-amber-50/40 border-b border-amber-200/60 text-xs text-amber-900 leading-relaxed">
            <div className="font-bold text-amber-950 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
              Examination Instructions:
            </div>
            <div className="whitespace-pre-line text-slate-700 pl-5">
              {examination.instructions}
            </div>
          </div>
        )}

        {/* Questions Section */}
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Questions List ({assignedSet.questions.length})
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Attempt all questions in this set
            </span>
          </div>

          <div className="space-y-6">
            {assignedSet.questions.map((q, idx) => (
              <div
                key={idx}
                className="p-6 rounded-xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                      {q.questionNumber || idx + 1}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {q.title}
                    </h3>
                  </div>
                  {q.marks > 0 && (
                    <Badge variant="primary" size="md">
                      [{q.marks} Marks]
                    </Badge>
                  )}
                </div>

                <div className="pl-9 space-y-3">
                  <p className="text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-line">
                    {q.description}
                  </p>

                  {q.instructions && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 text-xs text-slate-600 flex items-start gap-2">
                      <HelpCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-700">Specific Instructions: </span>
                        {q.instructions}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Institutional Sign-off in Print */}
        <div className="p-8 pt-12 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
          <div>
            <p className="font-semibold text-slate-700">Digital Examination Verification</p>
            <p className="text-[11px] font-mono mt-0.5">Hash: {student.registerNumber}-{assignedSet.setName}-{examination.id?.slice(-6)}</p>
          </div>
          <div className="text-right">
            <div className="w-36 border-b border-slate-400 mb-1"></div>
            <p className="font-semibold text-slate-700">Faculty Examiner Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentQuestionPage;

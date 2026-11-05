import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { CardSkeleton } from '../../components/common/Skeleton';
import {
  Users,
  BookOpen,
  CalendarCheck,
  FileQuestion,
  UserCheck,
  UserX,
  PlusCircle,
  Upload,
  Shuffle,
  Activity,
  ArrowRight,
  TrendingUp,
  Clock,
  ExternalLink
} from 'lucide-react';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        if (res.data.success) {
          setStats(res.data);
        }
      } catch (err) {
        setError(err.message || 'Failed to load dashboard statistics.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const { stats: metrics, recentExams = [], recentActivity = [], activeExamStats = [] } = stats || {};

  const statCards = [
    {
      title: 'Total Students',
      value: metrics?.totalStudents ?? 0,
      icon: Users,
      color: 'indigo',
      link: '/faculty/students',
      linkText: 'Manage Students'
    },
    {
      title: 'Total Subjects',
      value: metrics?.totalSubjects ?? 0,
      icon: BookOpen,
      color: 'blue',
      link: '/faculty/subjects',
      linkText: 'Manage Subjects'
    },
    {
      title: 'Total Examinations',
      value: metrics?.totalExaminations ?? 0,
      icon: CalendarCheck,
      color: 'purple',
      link: '/faculty/exams',
      linkText: 'View Exams'
    },
    {
      title: 'Total Question Sets',
      value: metrics?.totalQuestionSets ?? 0,
      icon: FileQuestion,
      color: 'amber',
      link: '/faculty/question-sets',
      linkText: 'View Question Sets'
    },
    {
      title: 'Students Assigned',
      value: metrics?.totalAssignments ?? 0,
      icon: UserCheck,
      color: 'emerald',
      link: '/faculty/assignments',
      linkText: 'View Assignments'
    },
    {
      title: 'Not Yet Assigned',
      value: metrics?.unassignedStudents ?? 0,
      icon: UserX,
      color: 'rose',
      link: '/faculty/assignments',
      linkText: 'Assign Now'
    }
  ];

  const colorStyles = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100'
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Laboratory Examination Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Balanced Random Question Assignment Engine
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Create multi-set laboratory question papers, distribute them across students in perfectly balanced sets with zero leakage, and monitor exam activity in real time.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/faculty/exams">
              <Button variant="primary" icon={PlusCircle}>
                New Examination
              </Button>
            </Link>
            <Link to="/faculty/assignments">
              <Button variant="navy" icon={Shuffle} className="bg-slate-800 hover:bg-slate-700 border border-slate-700">
                Run Assignment Engine
              </Button>
            </Link>
            <Link to="/faculty/students">
              <Button variant="secondary" icon={Upload}>
                Import Students
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 6 Key Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{card.title}</p>
                  <p className="text-2xl font-extrabold text-slate-900">{card.value.toLocaleString()}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${colorStyles[card.color]}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">Total counted</span>
                <Link to={card.link} className="font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                  {card.linkText} <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Examination Allocation Status */}
      {activeExamStats.length > 0 && (
        <Card
          title="Active Examination Distribution Live Status"
          subtitle="Real-time monitoring of actively running examinations"
          headerIcon={Activity}
        >
          <div className="space-y-4">
            {activeExamStats.map((exam) => (
              <div
                key={exam.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{exam.title}</h4>
                    <Badge variant="success" size="sm">Active</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Subject: {exam.subject}</p>
                </div>

                <div className="flex flex-wrap items-center gap-6 text-xs">
                  <div>
                    <span className="text-slate-500 block">Question Sets:</span>
                    <span className="font-bold text-slate-800 text-sm">{exam.sets} Sets</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Assigned Students:</span>
                    <span className="font-bold text-indigo-600 text-sm">{exam.assigned} Students</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Logged In:</span>
                    <span className="font-bold text-emerald-600 text-sm">{exam.loggedIn} Students</span>
                  </div>
                  <Link to={`/faculty/assignments?examId=${exam.id}`}>
                    <Button variant="secondary" size="sm" icon={ExternalLink}>
                      Manage Engine
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Two Column Layout: Recent Examinations & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Examinations */}
        <Card
          title="Recent Examinations"
          subtitle="Scheduled and active laboratory tests"
          headerIcon={CalendarCheck}
          action={
            <Link to="/faculty/exams">
              <Button variant="ghost" size="sm" icon={ArrowRight}>
                View All
              </Button>
            </Link>
          }
        >
          {recentExams.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No examinations created yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentExams.map((exam) => (
                <div key={exam._id} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-slate-800">{exam.title}</p>
                    <p className="text-xs text-slate-500">
                      {exam.subject?.subjectCode} &bull; Dept: {exam.department} - Yr {exam.year} Sec {exam.section}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        exam.status === 'Active'
                          ? 'success'
                          : exam.status === 'Scheduled'
                          ? 'primary'
                          : exam.status === 'Completed'
                          ? 'default'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {exam.status}
                    </Badge>
                    <Link to={`/faculty/exams/${exam._id}/sets`}>
                      <Button variant="ghost" size="sm" className="p-1 text-slate-400 hover:text-slate-600">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Audit / Assignment History */}
        <Card
          title="Recent Engine & Audit Activity"
          subtitle="History of balanced allocations and reset actions"
          headerIcon={Clock}
          action={
            <Link to="/faculty/assignments">
              <Button variant="ghost" size="sm" icon={ArrowRight}>
                Assignments Log
              </Button>
            </Link>
          }
        >
          {recentActivity.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No assignment actions recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentActivity.map((act) => (
                <div key={act._id} className="py-3 flex items-start gap-3 first:pt-0 last:pb-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      act.action === 'GENERATE'
                        ? 'bg-indigo-50 text-indigo-600'
                        : act.action === 'PUBLISH'
                        ? 'bg-emerald-50 text-emerald-600'
                        : act.action === 'RESET'
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800">{act.note}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Exam: {act.examination?.title || 'Examination'} &bull; By {act.performedBy?.name || 'Faculty'} &bull;{' '}
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;

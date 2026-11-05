import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/Skeleton';
import {
  Activity,
  RefreshCw,
  Download,
  Search,
  CheckCircle2,
  Clock,
  UserX,
  Users,
  ShieldCheck,
  Calendar
} from 'lucide-react';

const ActivityPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const examIdParam = searchParams.get('examId');

  const [exams, setExams] = useState([]);
  const [currentExam, setCurrentExam] = useState(null);
  const [activityData, setActivityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Load Exams
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await api.get('/exams');
        if (res.data.success && res.data.exams?.length > 0) {
          setExams(res.data.exams);
          const initial = examIdParam
            ? res.data.exams.find((e) => e._id === examIdParam) || res.data.exams[0]
            : res.data.exams[0];
          if (initial) {
            setCurrentExam(initial);
          }
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load exams:', err);
        setLoading(false);
      }
    };
    fetchExams();
  }, [examIdParam]);

  const fetchActivity = useCallback(async (isSilent = false) => {
    if (!currentExam?._id) return;
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await api.get(`/activity/${currentExam._id}`, {
        params: {
          statusFilter,
          search
        }
      });
      if (res.data.success) {
        setActivityData(res.data);
      }
    } catch (err) {
      console.error('Failed to load activity:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentExam, statusFilter, search]);

  useEffect(() => {
    fetchActivity();
  }, [currentExam, statusFilter]);

  const handleExamChange = (e) => {
    const found = exams.find((ex) => ex._id === e.target.value);
    if (found) {
      setCurrentExam(found);
      setSearchParams({ examId: found._id });
    }
  };

  const handleExportExcel = () => {
    if (!currentExam?._id) return;
    window.location.href = `/api/reports/activity/${currentExam._id}`;
  };

  if (!currentExam && !loading) {
    return (
      <EmptyState
        icon={Activity}
        title="No examinations available"
        description="Please create an examination before viewing student attendance and activity."
        actionLabel="Create Examination"
        onAction={() => window.location.href = '/faculty/exams'}
      />
    );
  }

  const { stats, records = [] } = activityData || {};

  return (
    <div className="space-y-6">
      {/* Header and Exam Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Student Activity Monitoring</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time laboratory attendance, student logins, and question paper view timestamps
          </p>
        </div>

        {exams.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Examination:</label>
            <select
              value={currentExam?._id || ''}
              onChange={handleExamChange}
              className="text-xs font-semibold rounded-lg border border-slate-300 px-3 py-1.5 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-200 outline-none max-w-xs"
            >
              {exams.map((ex) => (
                <option key={ex._id} value={ex._id}>
                  {ex.title} ({ex.subject?.subjectCode || 'LAB'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Assigned</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{stats.totalAssigned}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Students Logged In</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{stats.loggedInCount}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Not Yet Logged In</p>
              <p className="text-2xl font-black text-rose-600 mt-1">{stats.notLoggedInCount}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <UserX className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Login Attendance</p>
              <p className="text-2xl font-black text-indigo-700 mt-1">{stats.loginPercentage}%</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Action and Filter Bar */}
      <Card bodyClassName="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[240px]">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by student register number or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchActivity()}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'ALL' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('LOGGED_IN')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'LOGGED_IN' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Logged In
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('NOT_LOGGED_IN')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'NOT_LOGGED_IN' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Not Logged In
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              loading={refreshing}
              onClick={() => fetchActivity(true)}
            >
              Refresh
            </Button>
            <Button variant="secondary" size="sm" icon={Download} onClick={handleExportExcel}>
              Export Excel
            </Button>
          </div>
        </div>
      </Card>

      {/* Activity Table */}
      <Card bodyClassName="p-0">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} cols={6} />
          </div>
        ) : records.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activity records found"
            description="No student activities match your criteria or no assignments exist for this examination."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4">Register Number</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Assigned Set</th>
                  <th className="py-3 px-4">Login Status</th>
                  <th className="py-3 px-4">First Login</th>
                  <th className="py-3 px-4">Last Access</th>
                  <th className="py-3 px-4">Access Count</th>
                  <th className="py-3 px-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {records.map((r) => (
                  <tr key={r.registerNumber} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{r.registerNumber}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{r.studentName}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                        {r.assignedSet}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={r.hasLoggedIn ? 'success' : 'danger'} size="sm">
                        {r.hasLoggedIn ? 'Logged In' : 'Not Logged In'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {r.firstLoginAt ? new Date(r.firstLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {r.lastAccessAt ? new Date(r.lastAccessAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{r.accessCount || 0}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{r.ipAddress || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ActivityPage;

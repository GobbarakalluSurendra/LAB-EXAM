import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/Skeleton';
import {
  Shuffle,
  Eye,
  Send,
  RotateCcw,
  UserPlus,
  Download,
  History,
  CheckCircle2,
  AlertTriangle,
  Search,
  CheckCircle,
  FileSpreadsheet,
  Users,
  Layers,
  ChevronLeft
} from 'lucide-react';

const AssignmentsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const examIdParam = searchParams.get('examId');

  const [exams, setExams] = useState([]);
  const [currentExam, setCurrentExam] = useState(null);
  const [stats, setStats] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [setFilter, setSetFilter] = useState('ALL');

  // Modals & Action States
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

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

  // Load Distribution and Assignments for currentExam
  const fetchAssignmentData = useCallback(async (page = 1) => {
    if (!currentExam?._id) return;
    setLoading(true);
    try {
      const [distRes, assignRes] = await Promise.all([
        api.get(`/assignments/distribution/${currentExam._id}`),
        api.get(`/assignments/${currentExam._id}`, {
          params: {
            page,
            limit: pagination.limit,
            search,
            setNumber: setFilter !== 'ALL' ? setFilter : undefined
          }
        })
      ]);

      if (distRes.data.success) {
        setStats(distRes.data.stats);
      }
      if (assignRes.data.success) {
        setAssignments(assignRes.data.assignments || []);
        setPagination(assignRes.data.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoading(false);
    }
  }, [currentExam, pagination.limit, search, setFilter]);

  useEffect(() => {
    fetchAssignmentData(1);
  }, [currentExam, setFilter]);

  const handleExamChange = (e) => {
    const found = exams.find((ex) => ex._id === e.target.value);
    if (found) {
      setCurrentExam(found);
      setSearchParams({ examId: found._id });
    }
  };

  // Preview Generation
  const handlePreviewGeneration = async () => {
    if (!currentExam?._id) return;
    setActionLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await api.post(`/assignments/generate/${currentExam._id}`, {
        preview: true
      });
      if (res.data.success) {
        setPreviewData(res.data);
        setIsPreviewModalOpen(true);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Preview generation failed' });
    } finally {
      setActionLoading(false);
    }
  };

  // Commit Generation
  const handleCommitGeneration = async () => {
    if (!currentExam?._id) return;
    setActionLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await api.post(`/assignments/generate/${currentExam._id}`, {
        preview: false,
        autoPublish: false
      });
      if (res.data.success) {
        setIsPreviewModalOpen(false);
        setMessage({ type: 'success', text: 'Balanced assignments generated successfully!' });
        fetchAssignmentData(1);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Generation failed' });
    } finally {
      setActionLoading(false);
    }
  };

  // Publish Assignments
  const handlePublish = async () => {
    if (!currentExam?._id) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/assignments/publish/${currentExam._id}`);
      if (res.data.success) {
        setMessage({ type: 'success', text: res.data.message });
        fetchAssignmentData(pagination.page);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to publish assignments' });
    } finally {
      setActionLoading(false);
    }
  };

  // Reset Assignments
  const handleReset = async () => {
    if (!currentExam?._id) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/assignments/reset/${currentExam._id}`, {
        reason: 'Faculty manual reset from portal'
      });
      if (res.data.success) {
        setIsResetConfirmOpen(false);
        setMessage({ type: 'success', text: `Assignments reset: ${res.data.deletedCount} cleared.` });
        fetchAssignmentData(1);
      }
    } catch (err) {
      alert(err.message || 'Failed to reset assignments');
    } finally {
      setActionLoading(false);
    }
  };

  // Assign Unassigned Students
  const handleAssignUnassigned = async () => {
    if (!currentExam?._id) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/assignments/assign-unassigned/${currentExam._id}`);
      if (res.data.success) {
        setMessage({ type: 'success', text: res.data.message });
        fetchAssignmentData(pagination.page);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to assign unassigned students' });
    } finally {
      setActionLoading(false);
    }
  };

  // Open History Modal
  const handleOpenHistory = async () => {
    if (!currentExam?._id) return;
    try {
      const res = await api.get(`/assignments/history/${currentExam._id}`);
      if (res.data.success) {
        setHistoryList(res.data.history || []);
        setIsHistoryOpen(true);
      }
    } catch (err) {
      alert(err.message || 'Failed to load history');
    }
  };

  const handleExportExcel = () => {
    if (!currentExam?._id) return;
    window.location.href = `/api/reports/assignments/${currentExam._id}`;
  };

  if (!currentExam && !loading) {
    return (
      <EmptyState
        icon={Shuffle}
        title="No examinations available"
        description="Please create an examination before running the assignment engine."
        actionLabel="Create Examination"
        onAction={() => window.location.href = '/faculty/exams'}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Exam Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Question Assignment Engine</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Balanced random assignment algorithm ensuring equal student-to-set distribution ($\Delta \le 1$)
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

      {/* Notification Banner */}
      {message.text && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between animate-in fade-in ${
            message.type === 'error'
              ? 'bg-rose-50 border border-rose-200 text-rose-700'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {message.type === 'error' ? <AlertTriangle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle className="w-4 h-4 flex-shrink-0" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage({ type: '', text: '' })} className="font-bold underline text-[11px]">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Stats Banner */}
      {stats && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-900">Distribution Engine Status:</span>
                {stats.totalStudents > 0 ? (
                  <Badge variant={stats.isBalanced ? 'success' : 'warning'} size="md">
                    {stats.isBalanced ? '✓ Perfectly Balanced (Δ ≤ 1)' : 'Unbalanced'}
                  </Badge>
                ) : (
                  <Badge variant="default" size="md">Not Generated</Badge>
                )}
                {stats.isPublished ? (
                  <Badge variant="purple" size="md">✓ Published to Students</Badge>
                ) : (
                  <Badge variant="warning" size="md">Draft / Unpublished</Badge>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Max allocation: <strong>{stats.maxAssigned}</strong> &bull; Min allocation: <strong>{stats.minAssigned}</strong> &bull; Difference: <strong>{stats.difference}</strong> (Strictly $\le 1$)
              </p>
            </div>

            {/* Main Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {stats.totalStudents === 0 ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Eye}
                    onClick={handlePreviewGeneration}
                    loading={actionLoading}
                  >
                    Preview Distribution
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Shuffle}
                    onClick={handleCommitGeneration}
                    loading={actionLoading}
                  >
                    Generate Assignments
                  </Button>
                </>
              ) : (
                <>
                  {!stats.isPublished && (
                    <Button
                      variant="success"
                      size="sm"
                      icon={Send}
                      onClick={handlePublish}
                      loading={actionLoading}
                    >
                      Publish to Students
                    </Button>
                  )}
                  {stats.unassignedCount > 0 && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={UserPlus}
                      onClick={handleAssignUnassigned}
                      loading={actionLoading}
                    >
                      Assign {stats.unassignedCount} Unassigned
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Download}
                    onClick={handleExportExcel}
                  >
                    Export Excel
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={History}
                    onClick={handleOpenHistory}
                  >
                    History
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={RotateCcw}
                    onClick={() => setIsResetConfirmOpen(true)}
                  >
                    Reset Assignments
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Set Distribution Breakdown Cards */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
              <span>Question Sets Allocation Breakdown ({stats.totalSets} Sets)</span>
              <span className="text-indigo-600 font-semibold lowercase">
                {stats.totalStudents} of {stats.totalEligible} eligible students allocated
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {stats.setDistribution?.map((sd) => (
                <div
                  key={sd.setNumber}
                  className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/60 text-center space-y-1 hover:border-indigo-300 transition-colors"
                >
                  <div className="text-xs font-bold text-slate-700">{sd.setName}</div>
                  <div className="text-xl font-extrabold text-indigo-700">{sd.count}</div>
                  <div className="text-[10px] text-slate-400">Students</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar for Assignments Table */}
      <Card bodyClassName="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search assigned student by Register Number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchAssignmentData(1)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <select
            value={setFilter}
            onChange={(e) => setSetFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 bg-slate-50 focus:bg-white outline-none"
          >
            <option value="ALL">All Question Sets</option>
            {stats?.setDistribution?.map((s) => (
              <option key={s.setNumber} value={s.setNumber}>
                {s.setName} ({s.count} students)
              </option>
            ))}
          </select>

          <Button variant="secondary" size="sm" onClick={() => fetchAssignmentData(1)}>
            Apply Filter
          </Button>
        </div>
      </Card>

      {/* Assignments Table */}
      <Card bodyClassName="p-0">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} cols={6} />
          </div>
        ) : assignments.length === 0 ? (
          <EmptyState
            icon={Shuffle}
            title="No assignments generated"
            description="Use the 'Generate Assignments' button above to automatically distribute question sets among eligible students."
            actionLabel="Generate Balanced Assignments"
            onAction={handleCommitGeneration}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4">Register Number</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Department & Section</th>
                  <th className="py-3 px-4">Assigned Question Set</th>
                  <th className="py-3 px-4">Visibility Status</th>
                  <th className="py-3 px-4">Assigned Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {assignments.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{a.registerNumber}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {a.student ? `${a.student.firstName} ${a.student.lastName}`.trim() : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {a.student?.department || '—'} &bull; Yr {a.student?.year} Sec {a.student?.section}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {a.setName}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={a.isPublished ? 'purple' : 'warning'} size="sm">
                        {a.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {a.assignedAt ? new Date(a.assignedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {assignments.length} of {pagination.total} assigned records
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchAssignmentData(pagination.page - 1)}
                icon={ChevronLeft}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchAssignmentData(pagination.page + 1)}
              >
                Next &rarr;
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Preview Modal */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title="Balanced Assignment Simulation Preview"
        subtitle="Review the calculated balanced distribution before committing to the database"
        maxWidth="max-w-3xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsPreviewModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCommitGeneration} loading={actionLoading}>
              Confirm & Save Assignments
            </Button>
          </>
        }
      >
        {previewData && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Algorithm Verification: Balanced distribution achieved!
              </div>
              <span>Max: {previewData.stats.maxAssigned} | Min: {previewData.stats.minAssigned} | Diff: {previewData.stats.difference}</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {previewData.stats.setDistribution.map((sd) => (
                <div key={sd.setNumber} className="p-2.5 bg-slate-50 border rounded-lg text-center">
                  <p className="text-xs font-bold text-slate-700">{sd.setName}</p>
                  <p className="text-lg font-black text-indigo-700">{sd.count}</p>
                </div>
              ))}
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-xl divide-y text-xs">
              {previewData.assignments.slice(0, 50).map((a, i) => (
                <div key={i} className="px-4 py-2 flex items-center justify-between">
                  <span className="font-mono font-bold text-indigo-700">{a.registerNumber}</span>
                  <span className="text-slate-800 font-medium">{a.studentName}</span>
                  <span className="font-bold text-emerald-700">{a.setName}</span>
                </div>
              ))}
            </div>
            {previewData.assignments.length > 50 && (
              <p className="text-[11px] text-slate-400 text-center">
                Showing first 50 of {previewData.assignments.length} simulated allocations...
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* History Audit Modal */}
      <Modal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title="Assignment Engine Audit History"
        subtitle="Complete log of generation, publishing, and reset actions"
        maxWidth="max-w-2xl"
        footer={
          <Button variant="secondary" onClick={() => setIsHistoryOpen(false)}>
            Close Log
          </Button>
        }
      >
        <div className="space-y-3">
          {historyList.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No assignment actions logged yet.</p>
          ) : (
            historyList.map((item) => (
              <div key={item._id} className="p-3.5 bg-slate-50 border rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <Badge
                    variant={
                      item.action === 'GENERATE'
                        ? 'primary'
                        : item.action === 'PUBLISH'
                        ? 'success'
                        : item.action === 'RESET'
                        ? 'danger'
                        : 'purple'
                    }
                    size="sm"
                  >
                    {item.action}
                  </Badge>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-slate-800 font-medium mt-1">{item.note}</p>
                <p className="text-slate-500 text-[11px]">
                  Performed by: {item.performedBy?.name || 'Faculty Admin'} ({item.performedBy?.email || 'N/A'})
                </p>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleReset}
        loading={actionLoading}
        title="Reset Examination Assignments?"
        message="This will completely clear all assigned question sets for this examination. Students will no longer see their assigned sets until you generate again. This action is permanently recorded in the audit history."
      />
    </div>
  );
};

export default AssignmentsPage;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/Skeleton';
import {
  CalendarCheck,
  Plus,
  Play,
  Square,
  FileQuestion,
  Shuffle,
  Activity,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Layers,
  Users
} from 'lucide-react';

const ExamsPage = () => {
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    department: 'Computer Science and Engineering',
    year: 3,
    section: 'A',
    examDate: new Date().toISOString().split('T')[0],
    startTime: '09:30 AM',
    endTime: '12:30 PM',
    collegeName: 'National Institute of Engineering and Technology',
    labName: 'Lab 3 - Advanced Software Engineering Lab',
    instructions: '1. All questions in your assigned set are compulsory.\n2. Work solely on your allocated physical lab machine.\n3. Do not close or refresh this browser tab.'
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchExams = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'ALL' ? { status: statusFilter } : {};
      const [examsRes, subjectsRes] = await Promise.all([
        api.get('/exams', { params }),
        api.get('/subjects')
      ]);

      if (examsRes.data.success) {
        setExams(examsRes.data.exams);
      }
      if (subjectsRes.data.success) {
        setSubjects(subjectsRes.data.subjects);
      }
    } catch (err) {
      console.error('Failed to load exams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [statusFilter]);

  const handleOpenAdd = () => {
    setSelectedExam(null);
    setFormData({
      title: '',
      subject: subjects[0]?._id || '',
      department: 'Computer Science and Engineering',
      year: 3,
      section: 'A',
      examDate: new Date().toISOString().split('T')[0],
      startTime: '09:30 AM',
      endTime: '12:30 PM',
      collegeName: 'National Institute of Engineering and Technology',
      labName: 'Lab 3 - Advanced Software Engineering Lab',
      instructions: '1. All questions in your assigned set are compulsory.\n2. Work solely on your allocated physical lab machine.\n3. Do not close or refresh this browser tab.'
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exam) => {
    setSelectedExam(exam);
    setFormData({
      title: exam.title,
      subject: exam.subject?._id || exam.subject,
      department: exam.department,
      year: exam.year,
      section: exam.section,
      examDate: exam.examDate ? new Date(exam.examDate).toISOString().split('T')[0] : '',
      startTime: exam.startTime,
      endTime: exam.endTime,
      collegeName: exam.collegeName || 'National Institute of Engineering and Technology',
      labName: exam.labName || 'Lab 3 - Advanced Software Engineering Lab',
      instructions: exam.instructions || ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      if (selectedExam) {
        await api.put(`/exams/${selectedExam._id}`, formData);
      } else {
        await api.post('/exams', formData);
      }
      setIsModalOpen(false);
      fetchExams();
    } catch (err) {
      setFormError(err.message || 'Failed to save examination.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (exam) => {
    const nextStatus = exam.status === 'Active' ? 'Scheduled' : 'Active';
    try {
      const res = await api.patch(`/exams/${exam._id}/status`, { status: nextStatus });
      if (res.data.success) {
        fetchExams();
      }
    } catch (err) {
      alert(err.message || 'Status change failed');
    }
  };

  const handleDelete = async () => {
    setFormLoading(true);
    try {
      await api.delete(`/exams/${selectedExam._id}`);
      setIsDeleteOpen(false);
      setSelectedExam(null);
      fetchExams();
    } catch (err) {
      alert(err.message || 'Failed to delete exam');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Examination Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create lab examinations, schedule practical sessions, and activate live student access
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={handleOpenAdd}>
          New Examination
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto text-xs">
        {['ALL', 'Active', 'Scheduled', 'Draft', 'Completed'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === status
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {status} Examinations
          </button>
        ))}
      </div>

      {/* Examinations List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <TableSkeleton key={i} rows={2} cols={4} />
          ))}
        </div>
      ) : exams.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No examinations found"
          description="Create your first laboratory examination to begin configuring question sets and assignments."
          actionLabel="Create Examination"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => (
            <div
              key={exam._id}
              className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900">{exam.title}</h3>
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
                    {exam.isAssignmentPublished && (
                      <Badge variant="purple" size="sm">
                        Published to Students
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Subject: {exam.subject?.subjectName} ({exam.subject?.subjectCode}) &bull; Dept: {exam.department} &bull; Year {exam.year} Sec {exam.section}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Quick Activate / Deactivate Button */}
                  <Button
                    variant={exam.status === 'Active' ? 'danger' : 'success'}
                    size="sm"
                    icon={exam.status === 'Active' ? Square : Play}
                    onClick={() => handleToggleStatus(exam)}
                  >
                    {exam.status === 'Active' ? 'Deactivate Exam' : 'Activate Exam'}
                  </Button>
                  <Button variant="secondary" size="sm" icon={Edit} onClick={() => handleOpenEdit(exam)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 hover:bg-rose-50"
                    icon={Trash2}
                    onClick={() => { setSelectedExam(exam); setIsDeleteOpen(true); }}
                  />
                </div>
              </div>

              {/* Stats & Direct Navigation Buttons */}
              <div className="mt-4 pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="flex flex-wrap items-center gap-5 text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(exam.examDate).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {exam.startTime} - {exam.endTime}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    <strong>{exam.numQuestionSets}</strong> Sets
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Users className="w-3.5 h-3.5 text-emerald-500" />
                    <strong>{exam.assignedCount}</strong> Students Assigned
                  </span>
                </div>

                {/* Sub-module Shortcuts */}
                <div className="flex items-center gap-2">
                  <Link to={`/faculty/exams/${exam._id}/sets`}>
                    <Button variant="secondary" size="sm" icon={FileQuestion}>
                      Question Sets ({exam.numQuestionSets})
                    </Button>
                  </Link>
                  <Link to={`/faculty/assignments?examId=${exam._id}`}>
                    <Button variant="primary" size="sm" icon={Shuffle}>
                      Assignments
                    </Button>
                  </Link>
                  <Link to={`/faculty/activity?examId=${exam._id}`}>
                    <Button variant="ghost" size="sm" icon={Activity} className="text-slate-600">
                      Live Activity
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Exam Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedExam ? 'Edit Examination' : 'Create New Examination'}
        subtitle="Set up practical schedule, department, section, and laboratory instructions"
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={formLoading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} loading={formLoading}>
              {selectedExam ? 'Update Examination' : 'Save Examination'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Examination Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Java Programming Laboratory End-Semester Examination"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label>
              <select
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
              >
                <option value="">Select Laboratory Subject</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.subjectName} ({s.subjectCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
              >
                <option value="Computer Science and Engineering">Computer Science and Engineering</option>
                <option value="Computer Science and Engineering (Data Science)">Computer Science and Engineering (Data Science)</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Electronics and Communication">Electronics and Communication</option>
                <option value="Electrical and Electronics">Electrical and Electronics</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Year of Study *</label>
              <select
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value, 10) })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
              >
                <option value={1}>Year 1</option>
                <option value={2}>Year 2</option>
                <option value={3}>Year 3</option>
                <option value={4}>Year 4</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Section *</label>
              <input
                type="text"
                required
                placeholder="e.g. A or ALL"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value.toUpperCase() })}
                className="w-full text-xs uppercase px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Exam Date *</label>
              <input
                type="date"
                required
                value={formData.examDate}
                onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time *</label>
              <input
                type="text"
                required
                placeholder="09:30 AM"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Time *</label>
              <input
                type="text"
                required
                placeholder="12:30 PM"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">College Name</label>
              <input
                type="text"
                value={formData.collegeName}
                onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lab Hall / Name</label>
              <input
                type="text"
                value={formData.labName}
                onChange={(e) => setFormData({ ...formData, labName: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Examination Instructions</label>
            <textarea
              rows={3}
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={formLoading}
        title="Delete Examination"
        message={`Are you sure you want to delete '${selectedExam?.title}'? This will delete all its associated question sets, assignments, and student logs.`}
      />
    </div>
  );
};

export default ExamsPage;

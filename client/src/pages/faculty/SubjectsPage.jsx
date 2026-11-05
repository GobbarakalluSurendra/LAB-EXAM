import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/Skeleton';
import { BookOpen, Plus, Edit, Trash2, Search, BookMarked } from 'lucide-react';

const SubjectsPage = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);

  // Form
  const [formData, setFormData] = useState({
    subjectName: '',
    subjectCode: '',
    department: 'Computer Science and Engineering',
    year: 3,
    semester: 5,
    description: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const params = {
        department: department !== 'ALL' ? department : undefined,
        search
      };
      const res = await api.get('/subjects', { params });
      if (res.data.success) {
        setSubjects(res.data.subjects);
      }
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [department]);

  const handleOpenAdd = () => {
    setSelectedSubject(null);
    setFormData({
      subjectName: '',
      subjectCode: '',
      department: 'Computer Science and Engineering',
      year: 3,
      semester: 5,
      description: ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (subject) => {
    setSelectedSubject(subject);
    setFormData({
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode,
      department: subject.department,
      year: subject.year,
      semester: subject.semester,
      description: subject.description || ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      if (selectedSubject) {
        await api.put(`/subjects/${selectedSubject._id}`, formData);
      } else {
        await api.post('/subjects', formData);
      }
      setIsModalOpen(false);
      fetchSubjects();
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    setFormLoading(true);
    try {
      await api.delete(`/subjects/${selectedSubject._id}`);
      setIsDeleteOpen(false);
      setSelectedSubject(null);
      fetchSubjects();
    } catch (err) {
      alert(err.message || 'Failed to delete subject');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Laboratory Subjects</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure practical laboratory courses, department affiliations, and academic semesters
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={handleOpenAdd}>
          Add Subject
        </Button>
      </div>

      {/* Filter and Search */}
      <Card bodyClassName="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Subject Name or Code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchSubjects()}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 bg-slate-50 focus:bg-white outline-none"
          >
            <option value="ALL">All Departments</option>
            <option value="Computer Science and Engineering">CSE</option>
            <option value="Computer Science and Engineering (Data Science)">CSE (Data Science)</option>
            <option value="Information Technology">IT</option>
            <option value="Electronics and Communication">ECE</option>
            <option value="Electrical and Electronics">EEE</option>
          </select>
          <Button variant="secondary" size="sm" onClick={fetchSubjects}>
            Apply Filter
          </Button>
        </div>
      </Card>

      {/* Subjects Grid */}
      {loading ? (
        <div className="p-6">
          <TableSkeleton rows={4} cols={5} />
        </div>
      ) : subjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No laboratory subjects found"
          description="Create your first subject or modify the filter criteria above."
          actionLabel="Add Subject"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {subjects.map((sub) => (
            <Card
              key={sub._id}
              className="hover:border-slate-300 transition-all"
              bodyClassName="p-5 flex flex-col justify-between h-full"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                    {sub.subjectCode}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(sub)}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setSelectedSubject(sub); setIsDeleteOpen(true); }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug">{sub.subjectName}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{sub.description || 'No description provided.'}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium text-slate-700">{sub.department}</span>
                <Badge variant="default" size="sm">
                  Yr {sub.year} &bull; Sem {sub.semester}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedSubject ? 'Edit Subject' : 'Add Laboratory Subject'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={formLoading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} loading={formLoading}>
              {selectedSubject ? 'Update Subject' : 'Save Subject'}
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Java Programming Laboratory"
              value={formData.subjectName}
              onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Code *</label>
            <input
              type="text"
              required
              placeholder="e.g. CS3301"
              value={formData.subjectCode}
              onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value.toUpperCase() })}
              className="w-full text-xs font-mono uppercase px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Semester *</label>
              <select
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value, 10) })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Syllabus Overview</label>
            <textarea
              rows={3}
              placeholder="Optional course objectives or syllabus outline..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
        title="Delete Subject"
        message={`Are you sure you want to delete ${selectedSubject?.subjectName} (${selectedSubject?.subjectCode})?`}
      />
    </div>
  );
};

export default SubjectsPage;

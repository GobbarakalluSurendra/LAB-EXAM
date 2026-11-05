import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/Skeleton';
import {
  Users,
  UserPlus,
  Upload,
  Download,
  Search,
  Filter,
  Edit,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const StudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [year, setYear] = useState('ALL');
  const [section, setSection] = useState('ALL');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    registerNumber: '',
    firstName: '',
    lastName: '',
    department: 'Computer Science and Engineering',
    year: 3,
    section: 'A',
    email: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Excel Import State
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importOptions, setImportOptions] = useState({
    department: 'Computer Science and Engineering',
    year: 3,
    section: 'A'
  });

  const fetchStudents = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.limit,
        search,
        department: department !== 'ALL' ? department : undefined,
        year: year !== 'ALL' ? year : undefined,
        section: section !== 'ALL' ? section : undefined
      };
      const res = await api.get('/students', { params });
      if (res.data.success) {
        setStudents(res.data.students);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, search, department, year, section]);

  useEffect(() => {
    fetchStudents(1);
  }, [department, year, section]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents(1);
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      const res = await api.post('/students', formData);
      if (res.data.success) {
        setIsAddOpen(false);
        setFormData({
          registerNumber: '',
          firstName: '',
          lastName: '',
          department: 'Computer Science and Engineering',
          year: 3,
          section: 'A',
          email: ''
        });
        fetchStudents(1);
      }
    } catch (err) {
      setFormError(err.message || 'Failed to add student');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditStudent = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      const res = await api.put(`/students/${selectedStudent._id}`, formData);
      if (res.data.success) {
        setIsEditOpen(false);
        setSelectedStudent(null);
        fetchStudents(pagination.page);
      }
    } catch (err) {
      setFormError(err.message || 'Failed to update student');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteStudent = async () => {
    setFormLoading(true);
    try {
      await api.delete(`/students/${selectedStudent._id}`);
      setIsDeleteOpen(false);
      setSelectedStudent(null);
      fetchStudents(pagination.page);
    } catch (err) {
      alert(err.message || 'Failed to delete student');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteAllStudents = async () => {
    setDeleteAllLoading(true);
    try {
      const res = await api.delete('/students/all');
      if (res.data.success) {
        setIsDeleteAllOpen(false);
        fetchStudents(1);
      }
    } catch (err) {
      alert(err.message || 'Failed to delete all students');
    } finally {
      setDeleteAllLoading(false);
    }
  };

  const openEditModal = (student) => {
    setSelectedStudent(student);
    setFormData({
      registerNumber: student.registerNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      department: student.department,
      year: student.year,
      section: student.section,
      email: student.email || ''
    });
    setFormError('');
    setIsEditOpen(true);
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) {
      setImportError('Please select an Excel file (.xlsx).');
      return;
    }
    setImportLoading(true);
    setImportError('');
    setImportResult(null);

    const fd = new FormData();
    fd.append('file', importFile);
    fd.append('department', importOptions.department);
    fd.append('year', importOptions.year);
    fd.append('section', importOptions.section);

    try {
      const res = await api.post('/students/import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setImportResult(res.data.result);
        fetchStudents(1);
      }
    } catch (err) {
      setImportError(err.message || 'Failed to import students.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.location.href = '/api/students/template';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Student Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage student registrations, batch import records, and view laboratory cohort profiles
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="secondary" icon={Download} onClick={handleDownloadTemplate}>
            Template
          </Button>
          <Button variant="secondary" icon={Upload} onClick={() => { setIsImportOpen(true); setImportResult(null); setImportFile(null); }}>
            Import Excel
          </Button>
          <Button variant="primary" icon={UserPlus} onClick={() => { setIsAddOpen(true); setFormError(''); }}>
            Add Student
          </Button>
          <Button
            variant="danger"
            icon={Trash2}
            disabled={pagination.total === 0}
            onClick={() => setIsDeleteAllOpen(true)}
            title="Permanently remove all students from database"
          >
            Delete All Students
          </Button>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <Card bodyClassName="p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Register Number or Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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

            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 bg-slate-50 focus:bg-white outline-none"
            >
              <option value="ALL">All Years</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
            </select>

            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 bg-slate-50 focus:bg-white outline-none"
            >
              <option value="ALL">All Sections</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
            </select>

            <Button type="submit" variant="primary" size="sm">
              Filter
            </Button>
          </div>
        </form>
      </Card>

      {/* Students Table */}
      <Card bodyClassName="p-0">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} cols={6} />
          </div>
        ) : students.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No students found"
            description="No student records match the selected filters. Add a student or import an Excel sheet."
            actionLabel="Add Student"
            onAction={() => setIsAddOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4">Register Number</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Year & Sec</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {students.map((student) => (
                  <tr key={student._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{student.registerNumber}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{student.fullName}</td>
                    <td className="py-3 px-4 text-slate-600">{student.department}</td>
                    <td className="py-3 px-4">
                      <Badge variant="default" size="sm">
                        Yr {student.year} - Sec {student.section}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{student.email || '—'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(student)}
                          className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
                          title="Edit Student"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setSelectedStudent(student); setIsDeleteOpen(true); }}
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors"
                          title="Delete Student"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
              Showing {students.length} of {pagination.total} students (Page {pagination.page} of {pagination.totalPages})
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchStudents(pagination.page - 1)}
                icon={ChevronLeft}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchStudents(pagination.page + 1)}
              >
                Next &rarr;
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add Student Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Student"
        subtitle="Register an individual student into the examination system"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddOpen(false)} disabled={formLoading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateStudent} loading={formLoading}>
              Save Student
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateStudent} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Register Number *</label>
            <input
              type="text"
              required
              placeholder="e.g. 23CS073"
              value={formData.registerNumber}
              onChange={(e) => setFormData({ ...formData, registerNumber: e.target.value.toUpperCase() })}
              className="w-full text-xs font-mono uppercase px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                placeholder="First name"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                placeholder="Optional"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
            </div>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Section *</label>
              <input
                type="text"
                required
                placeholder="e.g. A"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value.toUpperCase() })}
                className="w-full text-xs uppercase px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address (Optional)</label>
            <input
              type="email"
              placeholder="student@college.edu"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>
        </form>
      </Modal>

      {/* Edit Student Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Student (${selectedStudent?.registerNumber})`}
        subtitle="Update academic details and student records"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditOpen(false)} disabled={formLoading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEditStudent} loading={formLoading}>
              Update Student
            </Button>
          </>
        }
      >
        <form onSubmit={handleEditStudent} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                placeholder="Optional"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
            </div>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Year *</label>
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
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value.toUpperCase() })}
                className="w-full text-xs uppercase px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteStudent}
        loading={formLoading}
        title="Delete Student Record"
        message={`Are you sure you want to delete ${selectedStudent?.fullName} (${selectedStudent?.registerNumber})? This action cannot be undone.`}
      />

      {/* Delete All Students Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteAllOpen}
        onClose={() => setIsDeleteAllOpen(false)}
        onConfirm={handleDeleteAllStudents}
        loading={deleteAllLoading}
        confirmVariant="danger"
        title="Delete All Students"
        message="Are you sure you want to delete ALL student records from the database? This will clear all student data and reset any active examination assignments. This action cannot be undone."
        confirmText="Yes, Delete All Students"
      />

      {/* Excel Bulk Import Modal */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Bulk Import Students via Excel"
        subtitle="Upload students using a simple 3-field spreadsheet (Sl, Regd No., Student Name)"
      >
        <div className="space-y-4">
          <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-indigo-900">Download Excel Template (3 Columns)</p>
              <p className="text-[11px] text-indigo-700">Columns: <b>Sl</b>, <b>Regd No.</b>, <b>Student Name</b></p>
            </div>
            <Button variant="secondary" size="sm" icon={Download} onClick={handleDownloadTemplate}>
              Download .xlsx
            </Button>
          </div>

          {/* Class / Batch Assignment Settings */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <p className="text-xs font-bold text-slate-800">Target Class / Batch for these Students:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Department</label>
                <select
                  value={importOptions.department}
                  onChange={(e) => setImportOptions({ ...importOptions, department: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Computer Science and Engineering">Computer Science and Engineering</option>
                  <option value="Computer Science and Engineering (Data Science)">Computer Science and Engineering (Data Science)</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electronics and Communication">Electronics and Communication</option>
                  <option value="Electrical and Electronics">Electrical and Electronics</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Year</label>
                <select
                  value={importOptions.year}
                  onChange={(e) => setImportOptions({ ...importOptions, year: parseInt(e.target.value, 10) })}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value={1}>Year 1</option>
                  <option value={2}>Year 2</option>
                  <option value={3}>Year 3</option>
                  <option value={4}>Year 4</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Section</label>
                <input
                  type="text"
                  value={importOptions.section}
                  onChange={(e) => setImportOptions({ ...importOptions, section: e.target.value.toUpperCase() })}
                  className="w-full text-xs uppercase px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                  placeholder="e.g. A"
                />
              </div>
            </div>
          </div>

          <form onSubmit={handleImportSubmit} className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors bg-slate-50/50">
              <FileSpreadsheet className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
              <label className="cursor-pointer">
                <span className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline">
                  Choose Excel spreadsheet (.xlsx, .xls)
                </span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => setImportFile(e.target.files[0])}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-slate-500 mt-1">
                {importFile ? `Selected: ${importFile.name}` : 'Drag and drop or browse from computer'}
              </p>
            </div>

            {importError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {importError}
              </div>
            )}

            {importResult && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs text-emerald-800">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Import Complete: {importResult.imported} students successfully added!
                </div>
                {importResult.failed > 0 && (
                  <p className="text-amber-700">
                    {importResult.failed} records skipped (e.g. duplicate register numbers).
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsImportOpen(false)} disabled={importLoading}>
                Close
              </Button>
              <Button type="submit" variant="primary" loading={importLoading} disabled={!importFile}>
                Upload & Import
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default StudentsPage;

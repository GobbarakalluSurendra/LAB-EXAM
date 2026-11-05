import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/Skeleton';
import {
  FileQuestion,
  Plus,
  Copy,
  Trash2,
  Edit,
  Eye,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  HelpCircle,
  Shuffle
} from 'lucide-react';

const QuestionSetsPage = () => {
  const { examId: routeExamId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeExamId = routeExamId || searchParams.get('examId');

  const [exams, setExams] = useState([]);
  const [currentExam, setCurrentExam] = useState(null);
  const [questionSets, setQuestionSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddSetOpen, setIsAddSetOpen] = useState(false);
  const [isEditSetOpen, setIsEditSetOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDeleteSetOpen, setIsDeleteSetOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyFromExamId, setCopyFromExamId] = useState('');
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyError, setCopyError] = useState('');

  // Question Form State
  const [editingQuestionIdx, setEditingQuestionIdx] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    title: '',
    description: '',
    instructions: '',
    marks: 35
  });

  // Set Form State
  const [setForm, setSetForm] = useState({
    setName: '',
    setNumber: '',
    totalMarks: 100
  });

  // Excel Import State
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importRowErrors, setImportRowErrors] = useState([]);

  // Load all exams to populate selector
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await api.get('/exams');
        if (res.data.success && res.data.exams?.length > 0) {
          setExams(res.data.exams);
          const initialExam = activeExamId
            ? res.data.exams.find((e) => e._id === activeExamId) || res.data.exams[0]
            : res.data.exams[0];

          if (initialExam) {
            setCurrentExam(initialExam);
          }
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load examinations:', err);
        setLoading(false);
      }
    };
    fetchExams();
  }, [activeExamId]);

  // Load question sets when currentExam changes
  useEffect(() => {
    if (!currentExam?._id) return;

    const fetchQuestionSets = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/question-sets/exam/${currentExam._id}`);
        if (res.data.success) {
          setQuestionSets(res.data.questionSets || []);
          if (res.data.questionSets?.length > 0) {
            setSelectedSet(res.data.questionSets[0]);
          } else {
            setSelectedSet(null);
          }
        }
      } catch (err) {
        console.error('Failed to load question sets:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionSets();
  }, [currentExam]);

  const handleExamChange = (e) => {
    const found = exams.find((ex) => ex._id === e.target.value);
    if (found) {
      setCurrentExam(found);
      setSearchParams({ examId: found._id });
    }
  };

  // Create Question Set
  const handleCreateSet = async (e) => {
    e.preventDefault();
    if (!currentExam?._id) return;
    try {
      const res = await api.post('/question-sets', {
        examination: currentExam._id,
        setName: setForm.setName || undefined,
        setNumber: setForm.setNumber ? parseInt(setForm.setNumber, 10) : undefined,
        totalMarks: parseInt(setForm.totalMarks, 10) || 100,
        questions: []
      });
      if (res.data.success) {
        setIsAddSetOpen(false);
        const updatedSets = [...questionSets, res.data.questionSet].sort((a, b) => a.setNumber - b.setNumber);
        setQuestionSets(updatedSets);
        setSelectedSet(res.data.questionSet);
      }
    } catch (err) {
      alert(err.message || 'Failed to create question set');
    }
  };

  // Duplicate Set
  const handleDuplicateSet = async (setId) => {
    try {
      const res = await api.post(`/question-sets/duplicate/${setId}`);
      if (res.data.success) {
        const updated = [...questionSets, res.data.questionSet].sort((a, b) => a.setNumber - b.setNumber);
        setQuestionSets(updated);
        setSelectedSet(res.data.questionSet);
      }
    } catch (err) {
      alert(err.message || 'Failed to duplicate set');
    }
  };

  // Delete Set
  const handleDeleteSet = async () => {
    if (!selectedSet) return;
    try {
      await api.delete(`/question-sets/${selectedSet._id}`);
      setIsDeleteSetOpen(false);
      const remaining = questionSets.filter((s) => s._id !== selectedSet._id);
      setQuestionSets(remaining);
      setSelectedSet(remaining[0] || null);
    } catch (err) {
      alert(err.message || 'Failed to delete question set');
    }
  };

  // Save / Update Single Question inside current selected set
  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!selectedSet) return;

    let updatedQuestions = [...selectedSet.questions];
    if (editingQuestionIdx !== null) {
      updatedQuestions[editingQuestionIdx] = {
        ...updatedQuestions[editingQuestionIdx],
        ...questionForm,
        marks: parseInt(questionForm.marks, 10) || 0
      };
    } else {
      updatedQuestions.push({
        questionNumber: updatedQuestions.length + 1,
        ...questionForm,
        marks: parseInt(questionForm.marks, 10) || 0
      });
    }

    try {
      const res = await api.put(`/question-sets/${selectedSet._id}`, {
        questions: updatedQuestions
      });
      if (res.data.success) {
        setSelectedSet(res.data.questionSet);
        setQuestionSets((prev) =>
          prev.map((s) => (s._id === selectedSet._id ? res.data.questionSet : s))
        );
        setIsQuestionModalOpen(false);
      }
    } catch (err) {
      alert(err.message || 'Failed to save question');
    }
  };

  // Delete Single Question
  const handleDeleteQuestion = async (idx) => {
    if (!selectedSet) return;
    const updatedQuestions = selectedSet.questions.filter((_, i) => i !== idx).map((q, i) => ({
      ...q,
      questionNumber: i + 1
    }));

    try {
      const res = await api.put(`/question-sets/${selectedSet._id}`, {
        questions: updatedQuestions
      });
      if (res.data.success) {
        setSelectedSet(res.data.questionSet);
        setQuestionSets((prev) =>
          prev.map((s) => (s._id === selectedSet._id ? res.data.questionSet : s))
        );
      }
    } catch (err) {
      alert(err.message || 'Failed to remove question');
    }
  };

  // Copy sets from another exam
  const handleCopySets = async () => {
    if (!copyFromExamId || !currentExam?._id) return;
    setCopyLoading(true);
    setCopyError('');
    try {
      const res = await api.post('/question-sets/copy-from-exam', {
        fromExamId: copyFromExamId,
        toExamId: currentExam._id
      });
      if (res.data.success) {
        setIsCopyModalOpen(false);
        const setsRes = await api.get(`/question-sets/exam/${currentExam._id}`);
        if (setsRes.data.success) {
          setQuestionSets(setsRes.data.questionSets || []);
          if (setsRes.data.questionSets?.length > 0) {
            setSelectedSet(setsRes.data.questionSets[0]);
          }
        }
      }
    } catch (err) {
      setCopyError(err.message || 'Failed to copy question sets.');
    } finally {
      setCopyLoading(false);
    }
  };

  // Open Question Modal
  const openQuestionModal = (idx = null) => {
    if (idx !== null && selectedSet?.questions[idx]) {
      const q = selectedSet.questions[idx];
      setEditingQuestionIdx(idx);
      setQuestionForm({
        title: q.title,
        description: q.description,
        instructions: q.instructions || '',
        marks: q.marks || 35
      });
    } else {
      setEditingQuestionIdx(null);
      setQuestionForm({
        title: '',
        description: '',
        instructions: '',
        marks: 35
      });
    }
    setIsQuestionModalOpen(true);
  };

  // Excel Question Sets Import
  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!currentExam?._id) return;
    if (!importFile) {
      setImportError('Please choose an Excel file (.xlsx).');
      return;
    }
    setImportLoading(true);
    setImportError('');
    setImportRowErrors([]);
    setImportResult(null);

    const fd = new FormData();
    fd.append('file', importFile);

    try {
      const res = await api.post(`/question-sets/import/${currentExam._id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setImportResult(res.data.result);
        if (res.data.result?.errors?.length > 0) {
          setImportRowErrors(res.data.result.errors);
        }
        const setsRes = await api.get(`/question-sets/exam/${currentExam._id}`);
        if (setsRes.data.success) {
          setQuestionSets(setsRes.data.questionSets || []);
          if (setsRes.data.questionSets?.length > 0) {
            setSelectedSet(setsRes.data.questionSets[0]);
          }
        }
      }
    } catch (err) {
      const serverMsg = err.response?.data?.message || err.message || 'Failed to import question sets.';
      setImportError(serverMsg);
      if (err.response?.data?.errors?.length > 0) {
        setImportRowErrors(err.response.data.errors);
      }
    } finally {
      setImportLoading(false);
    }
  };

  if (!currentExam && !loading) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="No examinations created yet"
        description="Please create an examination first before configuring question sets."
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Question Set Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create any number of distinct question sets, upload via Excel, or duplicate sets
          </p>
        </div>

        {/* Exam Picker */}
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

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-2">
          <Badge variant="primary" size="md">
            {questionSets.length} Total Sets Configured
          </Badge>
          {currentExam && (
            <span className="text-xs text-slate-500">
              Dept: {currentExam.department} - Yr {currentExam.year} Sec {currentExam.section}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/question-sets/template"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Excel Template
          </a>
          <Button
            variant="secondary"
            size="sm"
            icon={Upload}
            onClick={() => { setIsImportOpen(true); setImportResult(null); setImportFile(null); }}
          >
            Import Sets Excel
          </Button>
          {exams.length > 1 && (
            <Button
              variant="secondary"
              size="sm"
              icon={Copy}
              onClick={() => {
                const other = exams.find((e) => e._id !== currentExam?._id);
                if (other) setCopyFromExamId(other._id);
                setCopyError('');
                setIsCopyModalOpen(true);
              }}
            >
              Copy from Other Exam
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => {
              setSetForm({
                setName: `SET ${questionSets.length + 1}`,
                setNumber: questionSets.length + 1,
                totalMarks: 100
              });
              setIsAddSetOpen(true);
            }}
          >
            Add New Set
          </Button>
          {questionSets.length > 0 && currentExam && (
            <Link to={`/faculty/assignments?examId=${currentExam._id}`}>
              <Button variant="navy" size="sm" icon={Shuffle}>
                Proceed to Assignment Engine
              </Button>
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-6">
          <TableSkeleton rows={4} cols={4} />
        </div>
      ) : questionSets.length === 0 ? (
        <EmptyState
          icon={FileQuestion}
          title="No question sets created yet"
          description="Create question sets manually or upload an Excel sheet containing multiple sets."
          actionLabel="Add Question Set"
          onAction={() => setIsAddSetOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Set Selection Tabs */}
          <div className="space-y-2 lg:col-span-1">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
              Question Sets ({questionSets.length})
            </div>
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {questionSets.map((qs) => {
                const isSelected = selectedSet?._id === qs._id;
                return (
                  <div
                    key={qs._id}
                    onClick={() => setSelectedSet(qs)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90'
                    }`}
                  >
                    <div>
                      <h4 className="text-sm font-bold leading-tight">{qs.setName}</h4>
                      <p className={`text-xs mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                        {qs.questions?.length || 0} Questions &bull; {qs.totalMarks || 100} Marks
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateSet(qs._id);
                        }}
                        className={`p-1 rounded hover:bg-black/10 transition-colors ${
                          isSelected ? 'text-indigo-100' : 'text-slate-400'
                        }`}
                        title="Duplicate Set"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Set Questions Editor */}
          {selectedSet && (
            <div className="lg:col-span-3 space-y-4">
              <Card
                title={`${selectedSet.setName} Details`}
                subtitle={`Examination: ${currentExam?.title} | Total Questions: ${selectedSet.questions?.length || 0}`}
                action={
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" icon={Eye} onClick={() => setIsPreviewOpen(true)}>
                      Student Preview
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Copy}
                      onClick={() => handleDuplicateSet(selectedSet._id)}
                    >
                      Duplicate Set
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Plus}
                      onClick={() => openQuestionModal(null)}
                    >
                      Add Question
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-rose-600 hover:bg-rose-50"
                      icon={Trash2}
                      onClick={() => setIsDeleteSetOpen(true)}
                    />
                  </div>
                }
              >
                {selectedSet.questions?.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm text-slate-500">No questions in {selectedSet.setName} yet.</p>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Plus}
                      className="mt-3"
                      onClick={() => openQuestionModal(null)}
                    >
                      Add First Question
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedSet.questions.map((q, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all flex items-start justify-between gap-4"
                      >
                        <div className="flex items-start gap-3">
                          <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                            {q.questionNumber || idx + 1}
                          </span>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-slate-900">{q.title}</h4>
                              {q.marks > 0 && (
                                <Badge variant="primary" size="sm">
                                  {q.marks} Marks
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                              {q.description}
                            </p>
                            {q.instructions && (
                              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                                Instructions: {q.instructions}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openQuestionModal(idx)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded"
                            title="Edit Question"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded"
                            title="Remove Question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Add Set Modal */}
      <Modal
        isOpen={isAddSetOpen}
        onClose={() => setIsAddSetOpen(false)}
        title="Add New Question Set"
        subtitle="Specify set title or name (e.g. Set 1, Set A)"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddSetOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateSet}>
              Create Question Set
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSet} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Set Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. SET 7 or Set G"
              value={setForm.setName}
              onChange={(e) => setSetForm({ ...setForm, setName: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Set Number</label>
            <input
              type="number"
              placeholder="Auto-generated if left blank"
              value={setForm.setNumber}
              onChange={(e) => setSetForm({ ...setForm, setNumber: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Total Marks</label>
            <input
              type="number"
              value={setForm.totalMarks}
              onChange={(e) => setSetForm({ ...setForm, totalMarks: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>
        </form>
      </Modal>

      {/* Add / Edit Question Modal */}
      <Modal
        isOpen={isQuestionModalOpen}
        onClose={() => setIsQuestionModalOpen(false)}
        title={editingQuestionIdx !== null ? 'Edit Question' : `Add Question to ${selectedSet?.setName}`}
        maxWidth="max-w-xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsQuestionModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveQuestion}>
              {editingQuestionIdx !== null ? 'Update Question' : 'Add Question'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveQuestion} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Question Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Binary Search Tree Implementation"
              value={questionForm.title}
              onChange={(e) => setQuestionForm({ ...questionForm, title: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Question Description / Problem Statement *</label>
            <textarea
              rows={4}
              required
              placeholder="Write the full problem description, required algorithm steps, or inputs/outputs..."
              value={questionForm.description}
              onChange={(e) => setQuestionForm({ ...questionForm, description: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Marks</label>
              <input
                type="number"
                value={questionForm.marks}
                onChange={(e) => setQuestionForm({ ...questionForm, marks: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Optional Instructions</label>
              <input
                type="text"
                placeholder="e.g. Print traversal after each node insertion"
                value={questionForm.instructions}
                onChange={(e) => setQuestionForm({ ...questionForm, instructions: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Student View Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={`Student View Preview – ${selectedSet?.setName}`}
        maxWidth="max-w-3xl"
        footer={
          <Button variant="secondary" onClick={() => setIsPreviewOpen(false)}>
            Close Preview
          </Button>
        }
      >
        {selectedSet && (
          <div className="border border-slate-200 rounded-xl p-6 bg-white space-y-6">
            <div className="text-center border-b border-slate-200 pb-4">
              <h2 className="text-base font-bold text-slate-900 uppercase">
                {currentExam?.title || 'Laboratory Examination'}
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Subject: {currentExam?.subject?.subjectName} ({currentExam?.subject?.subjectCode})
              </p>
              <div className="mt-3 inline-block bg-indigo-50 border border-indigo-200 px-4 py-1.5 rounded-lg text-indigo-700 font-bold text-sm">
                Assigned Set: {selectedSet.setName}
              </div>
            </div>

            <div className="space-y-4">
              {selectedSet.questions.map((q, i) => (
                <div key={i} className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">
                      {i + 1}. {q.title}
                    </span>
                    <span className="text-xs font-semibold text-indigo-600">[{q.marks} Marks]</span>
                  </div>
                  <p className="text-xs text-slate-700 whitespace-pre-line">{q.description}</p>
                  {q.instructions && (
                    <p className="text-[11px] text-slate-500 italic">Note: {q.instructions}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Excel Bulk Question Sets Import Modal */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Upload Multiple Question Sets via Excel"
        subtitle="Automatic grouping of questions by set number from spreadsheet"
      >
        <div className="space-y-4">
          <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-indigo-900">Question Sets Excel Template</p>
              <p className="text-[11px] text-indigo-700">Columns: Set Number, Question Number, Title, Description, Marks</p>
            </div>
            <a
              href="/api/question-sets/template"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50"
            >
              <Download className="w-3.5 h-3.5" />
              Download .xlsx
            </a>
          </div>

          <form onSubmit={handleImportSubmit} className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors bg-slate-50/50">
              <FileSpreadsheet className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
              <label className="cursor-pointer">
                <span className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline">
                  Choose Excel File (.xlsx, .xls)
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
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  {importError}
                </p>
                {importRowErrors.length > 0 && (
                  <ul className="list-disc pl-5 pt-1 text-[11px] text-rose-600 space-y-0.5 max-h-24 overflow-y-auto">
                    {importRowErrors.slice(0, 5).map((err, idx) => (
                      <li key={idx}>Row {err.row}: {err.error}</li>
                    ))}
                    {importRowErrors.length > 5 && (
                      <li>...and {importRowErrors.length - 5} more issues.</li>
                    )}
                  </ul>
                )}
              </div>
            )}

            {importResult && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Successfully Imported {importResult.totalSetsImported} Question Sets!
                </p>
                <p>New sets created: {importResult.newSetsCreated}. Total sets in exam: {importResult.totalSetsNow}.</p>
                {importRowErrors.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-emerald-200/60 text-amber-800 text-[11px]">
                    <p className="font-medium">Note: {importRowErrors.length} row(s) had warnings or were skipped:</p>
                    <ul className="list-disc pl-5 pt-0.5 space-y-0.5">
                      {importRowErrors.slice(0, 3).map((err, idx) => (
                        <li key={idx}>Row {err.row}: {err.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsImportOpen(false)} disabled={importLoading}>
                Close
              </Button>
              <Button type="submit" variant="primary" loading={importLoading} disabled={!importFile}>
                Upload & Create Sets
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Copy Sets from Another Examination Modal */}
      <Modal
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        title="Copy Question Sets from Another Exam"
        subtitle={`Clone all question sets into "${currentExam?.title}" in one click`}
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 space-y-1">
            <p className="font-semibold">Quick Section Re-Use:</p>
            <p className="text-slate-600 text-[11px]">
              Perfect when you have multiple sections (e.g. Section A and Section B) and want to use the same question sets without re-uploading spreadsheets.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Source Examination to Copy From:
            </label>
            <select
              value={copyFromExamId}
              onChange={(e) => setCopyFromExamId(e.target.value)}
              className="w-full text-xs font-semibold rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-200 outline-none"
            >
              {exams
                .filter((e) => e._id !== currentExam?._id)
                .map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.title} (Sec {e.section}) — {e.numQuestionSets || 0} sets
                  </option>
                ))}
            </select>
          </div>

          {copyError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {copyError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsCopyModalOpen(false)} disabled={copyLoading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCopySets} loading={copyLoading} disabled={!copyFromExamId}>
              Copy All Sets
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Set Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteSetOpen}
        onClose={() => setIsDeleteSetOpen(false)}
        onConfirm={handleDeleteSet}
        title="Delete Question Set"
        message={`Are you sure you want to delete ${selectedSet?.setName}? All its questions will be removed.`}
      />
    </div>
  );
};

export default QuestionSetsPage;

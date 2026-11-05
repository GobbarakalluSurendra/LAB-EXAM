import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Layouts
import FacultyLayout from './components/layout/FacultyLayout';
import StudentLayout from './components/layout/StudentLayout';

// Student Pages
import StudentLoginPage from './pages/student/StudentLoginPage';
import StudentQuestionPage from './pages/student/StudentQuestionPage';

// Faculty Pages
import FacultyLoginPage from './pages/faculty/FacultyLoginPage';
import DashboardPage from './pages/faculty/DashboardPage';
import StudentsPage from './pages/faculty/StudentsPage';
import SubjectsPage from './pages/faculty/SubjectsPage';
import ExamsPage from './pages/faculty/ExamsPage';
import QuestionSetsPage from './pages/faculty/QuestionSetsPage';
import AssignmentsPage from './pages/faculty/AssignmentsPage';
import ActivityPage from './pages/faculty/ActivityPage';
import SettingsPage from './pages/faculty/SettingsPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Student Portal Routes */}
          <Route element={<StudentLayout />}>
            <Route path="/" element={<StudentLoginPage />} />
            <Route path="/student/login" element={<StudentLoginPage />} />
            <Route path="/student/exam/:examId" element={<StudentQuestionPage />} />
          </Route>

          {/* Faculty Authentication */}
          <Route path="/faculty/login" element={<FacultyLoginPage />} />

          {/* Faculty Dashboard & Management Portal */}
          <Route path="/faculty" element={<FacultyLayout />}>
            <Route index element={<Navigate to="/faculty/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="subjects" element={<SubjectsPage />} />
            <Route path="exams" element={<ExamsPage />} />
            <Route path="question-sets" element={<QuestionSetsPage />} />
            <Route path="exams/:examId/sets" element={<QuestionSetsPage />} />
            <Route path="assignments" element={<AssignmentsPage />} />
            <Route path="exams/:examId/assignments" element={<AssignmentsPage />} />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="exams/:examId/activity" element={<ActivityPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

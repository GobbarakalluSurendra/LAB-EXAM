import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Faculty State
  const [faculty, setFaculty] = useState(null);
  const [facultyToken, setFacultyToken] = useState(localStorage.getItem('smartlab_faculty_token'));
  const [facultyLoading, setFacultyLoading] = useState(true);

  // Student State
  const [student, setStudent] = useState(() => {
    const saved = localStorage.getItem('smartlab_student_data');
    return saved ? JSON.parse(saved) : null;
  });
  const [studentToken, setStudentToken] = useState(localStorage.getItem('smartlab_student_token'));
  const [studentExam, setStudentExam] = useState(() => {
    const saved = localStorage.getItem('smartlab_student_exam');
    return saved ? JSON.parse(saved) : null;
  });

  // Verify Faculty Token on mount
  useEffect(() => {
    const verifyFaculty = async () => {
      if (!facultyToken) {
        setFacultyLoading(false);
        return;
      }
      try {
        const res = await api.get('/faculty/profile');
        if (res.data.success) {
          setFaculty(res.data.faculty);
        } else {
          facultyLogout();
        }
      } catch (err) {
        console.warn('Faculty token expired or invalid');
        facultyLogout();
      } finally {
        setFacultyLoading(false);
      }
    };
    verifyFaculty();
  }, [facultyToken]);

  // Faculty Actions
  const facultyLogin = async (email, password) => {
    const res = await api.post('/faculty/login', { email, password });
    if (res.data.success) {
      localStorage.setItem('smartlab_faculty_token', res.data.token);
      setFacultyToken(res.data.token);
      setFaculty(res.data.faculty);
      return res.data;
    }
  };

  const facultyLogout = () => {
    localStorage.removeItem('smartlab_faculty_token');
    setFacultyToken(null);
    setFaculty(null);
  };

  const updateFacultyProfile = (updated) => {
    setFaculty((prev) => ({ ...prev, ...updated }));
  };

  // Student Actions
  const studentLoginAction = async (registerNumber, examId) => {
    const res = await api.post('/students/login', { registerNumber, examId });
    if (res.data.success) {
      if (res.data.requiresExamSelection) {
        return res.data;
      }
      localStorage.setItem('smartlab_student_token', res.data.token);
      localStorage.setItem('smartlab_student_data', JSON.stringify(res.data.student));
      localStorage.setItem('smartlab_student_exam', JSON.stringify(res.data.exam));
      setStudentToken(res.data.token);
      setStudent(res.data.student);
      setStudentExam(res.data.exam);
      return res.data;
    }
  };

  const studentLogout = () => {
    localStorage.removeItem('smartlab_student_token');
    localStorage.removeItem('smartlab_student_data');
    localStorage.removeItem('smartlab_student_exam');
    setStudentToken(null);
    setStudent(null);
    setStudentExam(null);
  };

  return (
    <AuthContext.Provider
      value={{
        faculty,
        facultyToken,
        facultyLoading,
        facultyLogin,
        facultyLogout,
        updateFacultyProfile,
        student,
        studentToken,
        studentExam,
        studentLoginAction,
        studentLogout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

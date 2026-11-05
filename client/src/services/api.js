import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    // If student token exists and request is student-related, attach student token
    const studentToken = localStorage.getItem('smartlab_student_token');
    const facultyToken = localStorage.getItem('smartlab_faculty_token');

    if (config.url?.startsWith('/students/my-assignment') && studentToken) {
      config.headers.Authorization = `Bearer ${studentToken}`;
    } else if (facultyToken) {
      config.headers.Authorization = `Bearer ${facultyToken}`;
    } else if (studentToken) {
      config.headers.Authorization = `Bearer ${studentToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for unified error parsing
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred.';
    const customError = new Error(message);
    customError.response = error.response;
    return Promise.reject(customError);
  }
);

export default api;

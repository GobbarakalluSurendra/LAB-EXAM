const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config(); // also check root .env if present
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const connectDB = require('./config/db');
const seedInitialData = require('./utils/seedData');
const { apiLimiter } = require('./middleware/rateLimiter');

// Import routes
const facultyRoutes = require('./routes/facultyRoutes');
const studentRoutes = require('./routes/studentRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const examRoutes = require('./routes/examRoutes');
const questionSetRoutes = require('./routes/questionSetRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const activityRoutes = require('./routes/activityRoutes');
const reportRoutes = require('./routes/reportRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable reverse proxy trust (for ngrok, Cloudflare, etc.)
app.set('trust proxy', true);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (res.statusCode >= 400) {
      console.error(`[HTTP ${res.statusCode}] ${req.method} ${req.originalUrl} (${duration}ms)`);
    } else {
      console.log(`[HTTP ${res.statusCode}] ${req.method} ${req.originalUrl} (${duration}ms)`);
    }
  });
  next();
});

// Apply rate limiter on API
app.use('/api', apiLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'SmartLab API Server'
  });
});

// API Routes
app.use('/api/faculty', facultyRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/question-sets', questionSetRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Explicit handlers for logo and favicon
const publicPath = path.join(__dirname, '..', 'client', 'public');
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');

app.get('/logo.svg', (req, res) => {
  const p = path.join(clientDistPath, 'logo.svg');
  if (fs.existsSync(p)) {
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.sendFile(p);
  }
  res.status(204).end();
});

app.get('/favicon.ico', (req, res) => {
  const p = path.join(clientDistPath, 'favicon.ico');
  if (fs.existsSync(p)) {
    return res.sendFile(p);
  }
  res.status(204).end();
});

// Serve Client Static Build if available
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({
        success: false,
        message: `API endpoint '${req.method} ${req.originalUrl}' not found.`
      });
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // 404 handler for unknown routes
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `API endpoint '${req.method} ${req.originalUrl}' not found.`
    });
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(`[Unhandled Error on ${req.method} ${req.originalUrl}]:`, err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start Server
const startServer = async () => {
  try {
    await connectDB();
    await seedInitialData();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`=======================================================`);
      console.log(`  SmartLab Full-Stack Server running on port ${PORT}`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Application URL: http://localhost:${PORT}`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  }
};

startServer();

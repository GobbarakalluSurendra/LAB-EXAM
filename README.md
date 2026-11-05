# SmartLab – Digital Lab Examination Management System

SmartLab is a modern, responsive, full-stack digital examination platform engineered for college and university faculty to conduct practical laboratory examinations efficiently.

The system allows faculty to upload multiple distinct question sets and automatically distribute those sets among eligible students using a **balanced random assignment engine**. Students log in with their college register numbers and view only their permanently assigned question set.

> **Note:** SmartLab is strictly designed for digital question display in physical computer laboratories. Students perform their practical coding and experiments on their physical lab computers. There are no online compilers or answer submission boxes.

---

## Key Highlights

- **Balanced Random Assignment Algorithm**: Shuffles students and question sets using cryptographically secure randomization and allocates via round-robin, mathematically guaranteeing that the difference between the most assigned set and least assigned set is never greater than one ($\max - \min \le 1$).
- **Strict Student Isolation**: Students can access **only** their assigned question set. API routes enforce role-based access tokens; refreshing the page or logging in repeatedly always returns the exact same set without changes.
- **Excel Bulk Operations**: Powered by ExcelJS for bulk student imports, bulk multi-set question paper uploads (with automatic grouping by set number), assignment reports, and activity logs.
- **Real-Time Student Activity Monitoring**: Faculty dashboard tracks student login status, first login timestamp, last access timestamp, access counts, and station IP addresses.
- **Production-Ready UI/UX**: Built with Tailwind CSS, Lucide icons, responsive sidebar, print-ready question paper formatting (`@media print`), and full-screen view mode.

---

## Technology Stack

- **Frontend**:
  - React.js (v18) with Vite
  - Tailwind CSS
  - React Router DOM (v6)
  - Axios (with unified interceptors)
  - Lucide React icons
- **Backend**:
  - Node.js & Express.js
  - MongoDB & Mongoose
  - JWT Authentication (separate faculty & student tokens)
  - bcryptjs for password hashing
  - Multer (in-memory buffer parsing)
  - ExcelJS (streaming Excel template generation and parsing)
  - Express Rate Limit (DDoS / brute-force protection)

---

## Database Collections (Mongoose Models)

1. `Faculty`: Account authentication, role ('faculty'/'admin'), department affiliation.
2. `Student`: Unique register number, first name, last name, department, year, section, email.
3. `Subject`: Laboratory subjects, subject code, semester, syllabus description.
4. `Examination`: Title, subject reference, department, year, section, exam date, start/end time, status ('Draft', 'Scheduled', 'Active', 'Completed').
5. `QuestionSet`: Sets per exam (e.g., SET 1, SET 2...), questions array (title, description, marks, instructions).
6. `Assignment`: Student-to-set mapping with unique compound index `{ examination: 1, student: 1 }`.
7. `StudentActivity`: Examination attendance tracking (first login, last access, access count, IP address).
8. `AssignmentHistory`: Audit log of generation, publishing, and reset operations.

---

## The Balanced Random Assignment Engine

### Mathematical Guarantee

Let $S$ be the total number of students and $K$ be the number of active question sets ($K \ge 1$):
- Each student is mapped to set index $i \pmod K$ after shuffling both sets and students.
- $(S \pmod K)$ sets receive $\lfloor S/K \rfloor + 1$ students.
- The remaining $K - (S \pmod K)$ sets receive $\lfloor S/K \rfloor$ students.
- **Difference ($\Delta = \max - \min$) is always $\le 1$.**

### Important Rules Enforced:
1. **Single Generation**: Assignment occurs once per examination unless faculty explicitly triggers a reset.
2. **Page Refresh Persistence**: Querying `/api/students/my-assignment` looks up the persisted assignment; students always receive their identical assigned set.
3. **Assign Unassigned Mode**: If new students register after the initial generation, faculty can click **"Assign Unassigned Students"**. The engine finds sets with the minimal student count and assigns new students in a balanced manner without modifying existing assignments.
4. **Concurrency Guard**: An in-memory mutex lock prevents race conditions if multiple faculty requests occur simultaneously.

---

## Getting Started

### Prerequisites

- Node.js (v18+ recommended, tested on v22)
- MongoDB instance running on `mongodb://127.0.0.1:27017`

### 1. Start MongoDB
Ensure MongoDB is running locally:
```bash
mongod --dbpath "data/db" --port 27017
```

### 2. Start the Server
```bash
cd server
npm start
```
The server will automatically:
- Connect to MongoDB at `mongodb://127.0.0.1:27017/smartlab`
- Seed default faculty account: `faculty@smartlab.edu` / `Password@123`
- Seed 4 laboratory subjects
- Seed 72 sample students (`23CS001` - `23CS072`)
- Seed a sample examination with 6 complete question sets and balanced assignments
- Serve both the REST API and the React Single-Page Application on `http://localhost:5000`

### 3. Accessing the Application
- **Student Exam Portal**: [http://localhost:5000/](http://localhost:5000/)
- **Faculty Dashboard**: [http://localhost:5000/faculty/login](http://localhost:5000/faculty/login)

---

## Pre-seeded Credentials for Testing

### Faculty Login
- **URL**: `http://localhost:5000/faculty/login`
- **Email**: `faculty@smartlab.edu`
- **Password**: `Password@123`
*(A convenient **"Autofill Credentials"** button is provided on the login page)*

### Student Login
- **URL**: `http://localhost:5000/`
- **Examination**: Java Programming Laboratory Examination
- **Sample Register Numbers**: `23CS001`, `23CS005`, `23CS012`, `23CS024`, `23CS048`, `23CS072`
*(Quick test buttons are available on the student login screen)*

---

## Test Suites

The project includes two automated test suites:

### 1. Algorithm Unit Tests (`server/tests/assignment.test.js`)
Tests all required distribution scenarios:
- **Scenario 1**: 6 question sets & 72 students $\rightarrow$ 12 each ($\Delta = 0$).
- **Scenario 2**: 6 question sets & 75 students $\rightarrow$ 3 sets with 13, 3 sets with 12 ($\Delta = 1$).
- **Scenario 3**: 10 question sets & 150 students $\rightarrow$ 15 each ($\Delta = 0$).
- **Scenario 4**: 20 question sets & 300 students $\rightarrow$ 15 each ($\Delta = 0$).
- **Scenario 5**: 80 students & 6 sets $\rightarrow$ 2 sets with 14, 4 sets with 13 ($\Delta = 1$).
- **Scenario 6**: 10 sets & 4 students $\rightarrow$ 4 distinct sets used, 1 student each ($\Delta = 1$).
- **Scenario 7**: Refresh persistence test.
- **Scenario 8**: Cryptographic randomization test.
- **Scenario 9**: 1,500 students stress test (< 200ms).

Run unit tests:
```bash
npm test --prefix server
```

### 2. End-to-End API Integration Tests (`server/tests/e2e.test.js`)
Tests complete full-stack workflows:
- Server health check
- SPA HTML delivery
- Faculty JWT authentication
- Dashboard stats aggregation
- Question set retrieval
- Distribution verification
- Student login with register number
- Single-set isolation enforcement
- Repeat login / refresh persistence
- Real-time activity monitoring
- Student-to-faculty route access rejection

Run end-to-end tests:
```bash
node server/tests/e2e.test.js
```

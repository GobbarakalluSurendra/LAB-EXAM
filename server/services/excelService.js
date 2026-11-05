const ExcelJS = require('exceljs');
const XLSX = require('xlsx');
const Student = require('../models/Student');
const QuestionSet = require('../models/QuestionSet');
const Examination = require('../models/Examination');

// Patch ExcelJS bug where table is undefined in worksheet model setter
try {
  const Worksheet = require('exceljs/lib/doc/worksheet');
  if (Worksheet && Worksheet.prototype) {
    const desc = Object.getOwnPropertyDescriptor(Worksheet.prototype, 'model');
    if (desc && desc.set) {
      const origSet = desc.set;
      desc.set = function (value) {
        if (value && value.tables && Array.isArray(value.tables)) {
          value.tables = value.tables.filter((t) => t && t.name);
        }
        return origSet.call(this, value);
      };
      Object.defineProperty(Worksheet.prototype, 'model', desc);
    }
  }
} catch (patchErr) {
  // Silent fallback if structure changes
}

/**
 * Robustly extract string value from any ExcelJS cell
 * Handles strings, numbers, booleans, rich text, formula results, and dates
 */
function getCellValue(cell) {
  if (!cell) return '';
  const val = cell.value;
  if (val === null || val === undefined) return '';

  if (typeof val === 'object') {
    // Rich text: [{ text: '...' }]
    if (val.richText && Array.isArray(val.richText)) {
      return val.richText.map((t) => t.text || '').join('').trim();
    }
    // Formula result
    if (val.result !== undefined && val.result !== null) {
      return String(val.result).trim();
    }
    // Object with text property
    if (val.text !== undefined && val.text !== null) {
      return String(val.text).trim();
    }
    // Date object
    if (val instanceof Date) {
      return val.toISOString();
    }
    return '';
  }
  return String(val).trim();
}

/**
 * Robustly parse set identifier from string or number
 * Handles: 1, "1", "Set 1", "SET-2", "Set 03", "Set A", "B", "SET C"
 */
function parseSetIdentifier(raw) {
  if (raw === null || raw === undefined) return null;
  const str = String(raw).trim();
  if (!str) return null;

  // 1. Direct number or string containing digits (e.g., "1", "Set 1", "SET-02")
  const digitMatch = str.match(/\d+/);
  if (digitMatch) {
    const num = parseInt(digitMatch[0], 10);
    if (!isNaN(num) && num > 0) {
      const upper = str.toUpperCase();
      const customName = upper.startsWith('SET') ? upper : `SET ${num}`;
      return {
        setNumber: num,
        setName: customName
      };
    }
  }

  // 2. Letter-based sets (e.g., "A", "Set A", "SET-B", "C")
  const letterMatch = str.match(/^(?:SET\s*[-_]?)?([A-Za-z])$/i);
  if (letterMatch) {
    const letter = letterMatch[1].toUpperCase();
    const num = letter.charCodeAt(0) - 64; // A -> 1, B -> 2, etc.
    if (num >= 1 && num <= 26) {
      return {
        setNumber: num,
        setName: `SET ${letter}`
      };
    }
  }

  return null;
}

/**
 * Universal dual-engine Excel loader (ExcelJS + SheetJS fallback)
 * Resilient against ExcelJS bugs, older .xls files, formatting anomalies,
 * and multi-sheet workbooks.
 */
async function loadWorkbookRows(buffer, sheetKeyword = '') {
  // Strategy 1: Try ExcelJS first
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    if (workbook.worksheets && workbook.worksheets.length > 0) {
      let targetSheet = workbook.worksheets[0];
      if (sheetKeyword) {
        const regex = new RegExp(sheetKeyword, 'i');
        const matched = workbook.worksheets.find(ws => regex.test(ws.name));
        if (matched) targetSheet = matched;
      }

      const rows = [];
      targetSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        rows.push({
          rowNumber,
          getCell: (col) => row.getCell(col),
          eachCell: (cb) => row.eachCell(cb)
        });
      });

      if (rows.length > 0) {
        return { rows, sheetName: targetSheet.name };
      }
    }
  } catch (exceljsErr) {
    console.warn('[Excel Parser]: ExcelJS notice, switching to secondary parser -', exceljsErr.message || exceljsErr);
  }

  // Strategy 2: Fallback to SheetJS (supports .xlsx, .xls, .csv seamlessly)
  try {
    const xwb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    if (xwb && xwb.SheetNames && xwb.SheetNames.length > 0) {
      let targetSheetName = xwb.SheetNames[0];
      if (sheetKeyword) {
        const regex = new RegExp(sheetKeyword, 'i');
        const matched = xwb.SheetNames.find(name => regex.test(name));
        if (matched) targetSheetName = matched;
      }

      const sheet = xwb.Sheets[targetSheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      const rows = [];
      data.forEach((rowArr, idx) => {
        const hasContent = Array.isArray(rowArr) && rowArr.some(c => c !== null && c !== undefined && String(c).trim() !== '');
        if (hasContent) {
          rows.push({
            rowNumber: idx + 1,
            getCell: (colNumber) => ({ value: rowArr[colNumber - 1] ?? '' }),
            eachCell: (cb) => {
              rowArr.forEach((val, colIdx) => {
                if (val !== undefined && val !== null && String(val).trim() !== '') {
                  cb({ value: val }, colIdx + 1);
                }
              });
            }
          });
        }
      });

      if (rows.length > 0) {
        return { rows, sheetName: targetSheetName };
      }
    }
  } catch (sheetjsErr) {
    console.error('[Excel Parser]: SheetJS error -', sheetjsErr.message || sheetjsErr);
  }

  const err = new Error('Invalid Excel file format. Please upload a valid .xlsx or .xls file.');
  err.statusCode = 400;
  throw err;
}

/**
 * Generate Excel Template for Student Bulk Import
 * Simplified to exactly three fields: Sl, Regd No., Student Name
 */
async function generateStudentTemplate() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Students Template');

  worksheet.columns = [
    { header: 'Sl', key: 'sl', width: 8 },
    { header: 'Regd No.', key: 'registerNumber', width: 22 },
    { header: 'Student Name', key: 'studentName', width: 32 }
  ];

  // Header styling
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' } // Navy blue
  };

  // Sample data rows matching the exact requested 3-column format
  worksheet.addRow({ sl: 1, registerNumber: '23CS001', studentName: 'Aarav Sharma' });
  worksheet.addRow({ sl: 2, registerNumber: '23CS002', studentName: 'Bhavna Patel' });
  worksheet.addRow({ sl: 3, registerNumber: '23CS003', studentName: 'Chirag Verma' });
  worksheet.addRow({ sl: 4, registerNumber: '23CS004', studentName: 'Divya Reddy' });
  worksheet.addRow({ sl: 5, registerNumber: '23CS005', studentName: 'Eshwar Rao' });

  return workbook;
}

/**
 * Parse & Import Students from Excel buffer
 * Tailored for 3-field formats: Sl, Regd No., Student Name
 * Automatically accepts batch Department, Year, and Section
 */
async function importStudentsFromExcel(buffer, options = {}) {
  const defaultDept = options.department || 'Computer Science and Engineering';
  const defaultYear = options.year ? parseInt(options.year, 10) : 3;
  const defaultSec = (options.section || 'A').toUpperCase();

  const { rows } = await loadWorkbookRows(buffer, 'student|candidate|reg');

  // Detect header row dynamically within first 8 rows
  let headerRowIndex = 1;
  const colMap = {
    sl: 1,
    registerNumber: 2,
    studentName: 3
  };

  for (let r = 0; r < Math.min(8, rows.length); r++) {
    const row = rows[r];
    let matched = 0;
    const tempMap = {};

    row.eachCell((cell, colNumber) => {
      const text = getCellValue(cell).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (text === 'sl' || text === 'slno' || text === 'sno' || text === 'serial') {
        tempMap.sl = colNumber;
        matched++;
      } else if (text.includes('regd') || text.includes('regno') || text.includes('roll') || text.includes('usn') || text.includes('register')) {
        tempMap.registerNumber = colNumber;
        matched++;
      } else if (text.includes('name') || text.includes('student') || text.includes('candidate')) {
        tempMap.studentName = colNumber;
        matched++;
      } else if (text.includes('dept') || text.includes('branch') || text.includes('department')) {
        tempMap.department = colNumber;
      } else if (text.includes('year') || text.includes('yr') || text.includes('class')) {
        tempMap.year = colNumber;
      } else if (text.includes('sec') || text.includes('section')) {
        tempMap.section = colNumber;
      }
    });

    if (matched >= 2 || (tempMap.registerNumber && tempMap.studentName)) {
      headerRowIndex = row.rowNumber;
      Object.assign(colMap, tempMap);
      break;
    }
  }

  const successList = [];
  const errors = [];
  const existingRegs = new Set((await Student.find({}, 'registerNumber')).map((s) => s.registerNumber));

  rows.forEach((row) => {
    const rowNumber = row.rowNumber;
    if (rowNumber <= headerRowIndex) return; // Skip headers

    const rawReg = getCellValue(row.getCell(colMap.registerNumber));
    if (!rawReg) return; // Empty row

    const registerNumber = rawReg.toUpperCase().replace(/\s+/g, '');

    // Skip if header repeated
    if (
      registerNumber === 'REGDNO' ||
      registerNumber === 'REGDNO.' ||
      registerNumber === 'REGISTERNUMBER' ||
      registerNumber === 'REGNO' ||
      registerNumber === 'ROLLNO'
    ) {
      return;
    }

    let fullName = getCellValue(row.getCell(colMap.studentName));
    if (!fullName && colMap.firstName) {
      fullName = `${getCellValue(row.getCell(colMap.firstName))} ${colMap.lastName ? getCellValue(row.getCell(colMap.lastName)) : ''}`.trim();
    }
    if (!fullName) {
      fullName = `Student ${registerNumber}`;
    }

    // Split name into first and last name
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts[0] || 'Student';
    const lastName = parts.slice(1).join(' ') || '';

    // Department, Year, Section (use row cell if exists, otherwise fallback to options)
    const rowDept = colMap.department ? getCellValue(row.getCell(colMap.department)) : '';
    const rowYearRaw = colMap.year ? getCellValue(row.getCell(colMap.year)) : '';
    const rowSec = colMap.section ? getCellValue(row.getCell(colMap.section)).toUpperCase() : '';

    const department = rowDept || defaultDept;
    const yearDigit = (rowYearRaw.match(/\d+/) || [])[0];
    const year = yearDigit ? parseInt(yearDigit, 10) : defaultYear;
    const section = rowSec || defaultSec;

    if (existingRegs.has(registerNumber)) {
      errors.push({
        row: rowNumber,
        registerNumber,
        error: `Duplicate: Register Number '${registerNumber}' is already registered.`
      });
      return;
    }

    existingRegs.add(registerNumber);
    successList.push({
      registerNumber,
      firstName,
      lastName,
      department,
      year,
      section,
      isActive: true
    });
  });

  if (successList.length === 0 && errors.length > 0) {
    const err = new Error(`No students could be imported. ${errors[0].error}`);
    err.statusCode = 400;
    err.errors = errors;
    throw err;
  }

  let insertedCount = 0;
  if (successList.length > 0) {
    const result = await Student.insertMany(successList, { ordered: false });
    insertedCount = result.length;
  }

  return {
    totalRows: successList.length + errors.length,
    imported: insertedCount,
    failed: errors.length,
    errors
  };
}

/**
 * Generate Question Set Excel Template
 */
async function generateQuestionSetTemplate() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Question Sets Template');

  worksheet.columns = [
    { header: 'Set Number *', key: 'setNumber', width: 16 },
    { header: 'Question Number *', key: 'questionNumber', width: 18 },
    { header: 'Question Title *', key: 'title', width: 35 },
    { header: 'Question Description *', key: 'description', width: 55 },
    { header: 'Instructions', key: 'instructions', width: 35 },
    { header: 'Marks', key: 'marks', width: 12 }
  ];

  // Header styling
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' }
  };

  // Sample data: Set 1
  worksheet.addRow({
    setNumber: 1,
    questionNumber: 1,
    title: 'Binary Search Implementation',
    description: 'Write a program to implement Binary Search on a sorted array of integers.',
    instructions: 'Handle edge cases like element not found and empty array.',
    marks: 50
  });
  worksheet.addRow({
    setNumber: 1,
    questionNumber: 2,
    title: 'Stack using Arrays',
    description: 'Implement a Stack data structure using arrays with push, pop, and peek operations.',
    instructions: 'Display overflow and underflow conditions clearly.',
    marks: 50
  });

  // Sample data: Set 2
  worksheet.addRow({
    setNumber: 2,
    questionNumber: 1,
    title: 'Linear Search Implementation',
    description: 'Write a program to implement Linear Search and count total comparisons.',
    instructions: 'Accept array input from the user.',
    marks: 50
  });
  worksheet.addRow({
    setNumber: 2,
    questionNumber: 2,
    title: 'Queue using Arrays',
    description: 'Implement a linear Queue using arrays with enqueue and dequeue operations.',
    instructions: 'Test queue full and empty states.',
    marks: 50
  });

  return workbook;
}

/**
 * Parse & Import Question Sets from Excel buffer for an examination
 * Intelligently detects headers, supports Set 1/Set A/custom set names,
 * auto-increments question numbers, and supports flexible column orders.
 */
async function importQuestionSetsFromExcel(buffer, examId) {
  const exam = await Examination.findById(examId);
  if (!exam) {
    const err = new Error('Examination not found.');
    err.statusCode = 404;
    throw err;
  }

  const { rows } = await loadWorkbookRows(buffer, 'question|set');

  // Detect header row dynamically in the first 8 rows
  let headerRowIndex = 1;
  const colMap = {
    setNumber: 1,
    questionNumber: 2,
    title: 3,
    description: 4,
    instructions: 5,
    marks: 6
  };

  for (let r = 0; r < Math.min(8, rows.length); r++) {
    const row = rows[r];
    let matched = 0;
    const tempMap = {};

    row.eachCell((cell, colNumber) => {
      const text = getCellValue(cell).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (text.includes('set') || text.includes('setnum') || text.includes('setno')) {
        tempMap.setNumber = colNumber;
        matched++;
      } else if (text.includes('qno') || text.includes('questionno') || text.includes('qnum') || text.includes('questionnum')) {
        tempMap.questionNumber = colNumber;
        matched++;
      } else if (text.includes('title') || text.includes('problem') || text.includes('questiontitle')) {
        tempMap.title = colNumber;
        matched++;
      } else if (text.includes('desc') || text.includes('statement') || text.includes('detail')) {
        tempMap.description = colNumber;
        matched++;
      } else if (text.includes('instruction') || text.includes('note') || text.includes('guideline')) {
        tempMap.instructions = colNumber;
        matched++;
      } else if (text.includes('mark') || text.includes('score') || text.includes('weight')) {
        tempMap.marks = colNumber;
        matched++;
      } else if (text === 'question' && !tempMap.title) {
        tempMap.title = colNumber;
        matched++;
      }
    });

    if (matched >= 2) {
      headerRowIndex = row.rowNumber;
      Object.assign(colMap, tempMap);
      break;
    }
  }

  const setsMap = new Map();
  const errors = [];
  let lastSetIdentifier = null;

  rows.forEach((row) => {
    const rowNumber = row.rowNumber;
    if (rowNumber <= headerRowIndex) return; // Skip headers

    const setRaw = getCellValue(row.getCell(colMap.setNumber));
    const qNumRaw = colMap.questionNumber ? getCellValue(row.getCell(colMap.questionNumber)) : '';
    let title = colMap.title ? getCellValue(row.getCell(colMap.title)) : '';
    let description = colMap.description ? getCellValue(row.getCell(colMap.description)) : '';
    const instructions = colMap.instructions ? getCellValue(row.getCell(colMap.instructions)) : '';
    const marksRaw = colMap.marks ? getCellValue(row.getCell(colMap.marks)) : '';

    // Check if entire row is empty
    if (!setRaw && !qNumRaw && !title && !description) {
      return;
    }

    // Determine set identifier (support inheriting previous set if row belongs to same set)
    let setIdent = parseSetIdentifier(setRaw);
    if (!setIdent && lastSetIdentifier && (title || description)) {
      setIdent = lastSetIdentifier;
    }

    if (!setIdent) {
      errors.push({
        row: rowNumber,
        error: `Could not identify Set Number from '${setRaw || '(empty)'}'. Please specify e.g. 1, Set 1, or Set A.`
      });
      return;
    }

    lastSetIdentifier = setIdent;
    const { setNumber, setName } = setIdent;

    // Fallback: If title present but no description, use title as description
    if (title && !description) {
      description = title;
    } else if (description && !title) {
      title = description.length > 60 ? description.substring(0, 57) + '...' : description;
    }

    if (!title && !description) {
      errors.push({
        row: rowNumber,
        error: `Row for Set ${setNumber} is missing both Question Title and Description.`
      });
      return;
    }

    // Parse marks
    const marksDigit = (marksRaw.match(/\d+/) || [])[0];
    const marks = marksDigit ? parseInt(marksDigit, 10) : 0;

    // Parse question number or auto-assign sequential
    const qNumDigit = (qNumRaw.match(/\d+/) || [])[0];
    const specifiedQNum = qNumDigit ? parseInt(qNumDigit, 10) : null;

    if (!setsMap.has(setNumber)) {
      setsMap.set(setNumber, {
        setNumber,
        setName,
        examination: examId,
        subject: exam.subject,
        questions: [],
        totalMarks: 0
      });
    }

    const currentSet = setsMap.get(setNumber);
    const assignedQNum = specifiedQNum && specifiedQNum > 0 ? specifiedQNum : currentSet.questions.length + 1;

    currentSet.questions.push({
      questionNumber: assignedQNum,
      title,
      description,
      instructions: instructions || '',
      marks
    });
    currentSet.totalMarks += marks;
  });

  if (setsMap.size === 0) {
    const errorDetails = errors.length > 0 ? ` (${errors[0].error})` : '';
    const err = new Error(`No valid question sets found in Excel file${errorDetails}. Please ensure your Excel sheet has columns for Set Number and Question Title.`);
    err.statusCode = 400;
    err.errors = errors;
    throw err;
  }

  // Create or upsert QuestionSet documents
  let createdSets = 0;
  for (const [setNumber, setData] of setsMap.entries()) {
    // If totalMarks is 0, default to 100
    if (setData.totalMarks === 0) {
      setData.totalMarks = 100;
    }

    let qs = await QuestionSet.findOne({ examination: examId, setNumber });
    if (qs) {
      qs.setName = setData.setName || qs.setName;
      qs.questions = setData.questions;
      qs.totalMarks = setData.totalMarks;
      await qs.save();
    } else {
      await QuestionSet.create(setData);
      createdSets++;
    }
  }

  // Update examination question sets count
  const totalSetsNow = await QuestionSet.countDocuments({ examination: examId, isActive: true });
  exam.numQuestionSets = totalSetsNow;
  await exam.save();

  return {
    totalSetsImported: setsMap.size,
    newSetsCreated: createdSets,
    totalSetsNow,
    errors
  };
}

/**
 * Export Examination Assignments to Excel
 */
async function exportAssignmentsToExcel(exam, assignments) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Student Assignments');

  // Title Banner
  worksheet.mergeCells('A1:G1');
  worksheet.getCell('A1').value = `${exam.collegeName || 'SmartLab'} – Examination Assignments Report`;
  worksheet.getCell('A1').font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 30;

  worksheet.mergeCells('A2:G2');
  worksheet.getCell('A2').value = `Exam: ${exam.title} | Subject: ${exam.subject?.subjectName || ''} (${exam.subject?.subjectCode || ''}) | Dept: ${exam.department} - Year ${exam.year} Sec ${exam.section}`;
  worksheet.getCell('A2').font = { size: 11, italic: true };
  worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 22;

  // Header Row
  const headers = ['S.No', 'Register Number', 'Student Name', 'Department', 'Year / Sec', 'Assigned Set', 'Assigned Timestamp'];
  const headerRow = worksheet.addRow(headers);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  headerRow.height = 24;

  worksheet.columns = [
    { key: 'sno', width: 8 },
    { key: 'regNo', width: 18 },
    { key: 'name', width: 26 },
    { key: 'dept', width: 28 },
    { key: 'yearSec', width: 14 },
    { key: 'set', width: 18 },
    { key: 'timestamp', width: 24 }
  ];

  assignments.forEach((a, index) => {
    const student = a.student || {};
    worksheet.addRow({
      sno: index + 1,
      regNo: a.registerNumber,
      name: `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'N/A',
      dept: student.department || exam.department,
      yearSec: `Yr ${student.year || exam.year} - ${student.section || exam.section}`,
      set: a.setName || `SET ${a.setNumber}`,
      timestamp: a.assignedAt ? new Date(a.assignedAt).toLocaleString() : 'N/A'
    });
  });

  return workbook;
}

module.exports = {
  generateStudentTemplate,
  importStudentsFromExcel,
  generateQuestionSetTemplate,
  importQuestionSetsFromExcel,
  exportAssignmentsToExcel
};

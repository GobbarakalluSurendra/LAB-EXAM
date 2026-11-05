const Faculty = require('../models/Faculty');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Examination = require('../models/Examination');
const QuestionSet = require('../models/QuestionSet');
const assignmentEngine = require('../services/assignmentEngine');

const seedInitialData = async () => {
  try {
    // 1. Seed Faculty
    const facultyCount = await Faculty.countDocuments();
    let faculty = await Faculty.findOne({ email: 'faculty@smartlab.edu' });

    if (!faculty) {
      faculty = await Faculty.create({
        name: 'Dr. Ramesh Kumar',
        email: 'faculty@smartlab.edu',
        password: 'Password@123',
        department: 'Computer Science and Engineering',
        phone: '+91 98765 43210',
        role: 'faculty',
        isActive: true
      });
      console.log('[Seed] Default faculty created: faculty@smartlab.edu / Password@123');
    }

    // 2. Seed Subjects
    const subjectsCount = await Subject.countDocuments();
    let javaSubject = await Subject.findOne({ subjectCode: 'CS3301' });

    if (subjectsCount === 0 || !javaSubject) {
      const subjects = [
        {
          subjectName: 'Java Programming Laboratory',
          subjectCode: 'CS3301',
          department: 'Computer Science and Engineering',
          year: 3,
          semester: 5,
          description: 'Core laboratory course covering OOP concepts, collections, and algorithms in Java.'
        },
        {
          subjectName: 'Data Structures and Algorithms Laboratory',
          subjectCode: 'CS3302',
          department: 'Computer Science and Engineering',
          year: 2,
          semester: 3,
          description: 'Implementation of linear and non-linear data structures and sorting algorithms.'
        },
        {
          subjectName: 'Database Management Systems Laboratory',
          subjectCode: 'CS3401',
          department: 'Computer Science and Engineering',
          year: 2,
          semester: 4,
          description: 'SQL queries, PL/SQL procedures, triggers, and schema normalization.'
        },
        {
          subjectName: 'Web Technology Laboratory',
          subjectCode: 'CS3501',
          department: 'Computer Science and Engineering',
          year: 3,
          semester: 5,
          description: 'Full stack development with HTML5, CSS3, JavaScript, React, and Node.js.'
        }
      ];

      for (const s of subjects) {
        await Subject.findOneAndUpdate({ subjectCode: s.subjectCode }, s, { upsert: true, new: true });
      }
      javaSubject = await Subject.findOne({ subjectCode: 'CS3301' });
      console.log('[Seed] Sample subjects created.');
    }

    // 3. Seed Students (Disabled so faculty maintains full control of student database)
    /*
    const studentsCount = await Student.countDocuments();
    if (studentsCount < 72) {
      ...
    }
    */

    // 4. Seed Sample Examination and 6 Question Sets
    const existingExam = await Examination.findOne({ title: 'Java Programming Laboratory Examination' });
    if (!existingExam && javaSubject) {
      const exam = await Examination.create({
        title: 'Java Programming Laboratory Examination',
        subject: javaSubject._id,
        department: 'Computer Science and Engineering',
        year: 3,
        section: 'A',
        examDate: new Date(),
        startTime: '09:30 AM',
        endTime: '12:30 PM',
        instructions: '1. All questions in your assigned set must be completed.\n2. Write and test your code on your physical workstation.\n3. Keep your question page open for reference.',
        collegeName: 'National Institute of Engineering and Technology',
        labName: 'Lab 3 - Advanced Software Engineering Lab',
        status: 'Active',
        isAssignmentPublished: true,
        createdBy: faculty._id
      });

      // 6 question sets as requested in the specification
      const sampleSets = [
        {
          setNumber: 1,
          setName: 'SET 1',
          questions: [
            {
              questionNumber: 1,
              title: 'Binary Search Implementation',
              description: 'Write a Java program to implement Binary Search algorithm on a sorted array of 10 integers. Print the index and total comparisons.',
              instructions: 'Handle non-existent elements properly.',
              marks: 35
            },
            {
              questionNumber: 2,
              title: 'Stack using Primitive Arrays',
              description: 'Write a program to implement Stack using Arrays with push, pop, peek, and display operations.',
              instructions: 'Throw custom exceptions on Stack Overflow and Stack Underflow.',
              marks: 35
            },
            {
              questionNumber: 3,
              title: 'Multilevel Inheritance',
              description: 'Write a program to demonstrate multilevel inheritance with Person, Employee, and Manager classes.',
              instructions: 'Override calculateSalary() in subclasses.',
              marks: 30
            }
          ]
        },
        {
          setNumber: 2,
          setName: 'SET 2',
          questions: [
            {
              questionNumber: 1,
              title: 'Linear Search with Duplicates',
              description: 'Write a Java program to implement Linear Search that returns all occurrences of a search key in an array.',
              instructions: 'Accept array size and elements via standard input.',
              marks: 35
            },
            {
              questionNumber: 2,
              title: 'Queue using Primitive Arrays',
              description: 'Write a program to implement a linear Queue using Arrays with enqueue, dequeue, and display operations.',
              instructions: 'Handle queue full and empty conditions cleanly.',
              marks: 35
            },
            {
              questionNumber: 3,
              title: 'Runtime Polymorphism (Method Overriding)',
              description: 'Write a program to demonstrate runtime polymorphism using an abstract class Shape and subclasses Circle, Rectangle, and Triangle.',
              instructions: 'Compute and display area for each shape.',
              marks: 30
            }
          ]
        },
        {
          setNumber: 3,
          setName: 'SET 3',
          questions: [
            {
              questionNumber: 1,
              title: 'Bubble Sort with Optimization Flag',
              description: 'Write a Java program to implement Bubble Sort with an early-exit swapped flag for already sorted elements.',
              instructions: 'Display array state after each outer pass.',
              marks: 35
            },
            {
              questionNumber: 2,
              title: 'Singly Linked List Implementation',
              description: 'Write a program to implement Singly Linked List with insertAtBeginning, insertAtEnd, deleteNode, and display operations.',
              instructions: 'Do not use Java standard Collections LinkedList.',
              marks: 35
            },
            {
              questionNumber: 3,
              title: 'Multiple Inheritance via Interfaces',
              description: 'Write a program to demonstrate multiple inheritance in Java using interfaces Printable and Showable implemented by Document class.',
              instructions: 'Provide suitable test driver code in main().',
              marks: 30
            }
          ]
        },
        {
          setNumber: 4,
          setName: 'SET 4',
          questions: [
            {
              questionNumber: 1,
              title: 'Selection Sort Algorithm',
              description: 'Write a Java program to implement Selection Sort and display minimum element selected in each iteration.',
              instructions: 'Track and print total swap operations performed.',
              marks: 35
            },
            {
              questionNumber: 2,
              title: 'Circular Queue Implementation',
              description: 'Write a program to implement Circular Queue using Arrays with front and rear pointers.',
              instructions: 'Demonstrate reuse of dequeued slots.',
              marks: 35
            },
            {
              questionNumber: 3,
              title: 'Custom Exception Handling',
              description: 'Create a custom InvalidAgeException and write a BankAccount registration program that validates age >= 18.',
              instructions: 'Use try-catch-finally blocks with meaningful messages.',
              marks: 30
            }
          ]
        },
        {
          setNumber: 5,
          setName: 'SET 5',
          questions: [
            {
              questionNumber: 1,
              title: 'Insertion Sort Implementation',
              description: 'Write a Java program to sort an array of strings in alphabetical order using Insertion Sort.',
              instructions: 'Use compareTo() method for string comparison.',
              marks: 35
            },
            {
              questionNumber: 2,
              title: 'Doubly Linked List Operations',
              description: 'Write a program to implement Doubly Linked List with forward and backward traversal display.',
              instructions: 'Include deletion of a specific node by value.',
              marks: 35
            },
            {
              questionNumber: 3,
              title: 'Abstract Classes and Template Pattern',
              description: 'Design an abstract BankAccount with abstract calculateInterest() and concrete deposit()/withdraw() methods. Implement SavingsAccount and CurrentAccount.',
              instructions: 'Test polymorphically in main.',
              marks: 30
            }
          ]
        },
        {
          setNumber: 6,
          setName: 'SET 6',
          questions: [
            {
              questionNumber: 1,
              title: 'Merge Sort Implementation',
              description: 'Write a recursive Java program to implement Merge Sort on an array of integers.',
              instructions: 'Print left and right subarrays during merge step.',
              marks: 35
            },
            {
              questionNumber: 2,
              title: 'Binary Search Tree Traversal',
              description: 'Implement a Binary Search Tree with node insertion and in-order, pre-order, post-order recursive traversals.',
              instructions: 'Confirm in-order yields sorted output.',
              marks: 35
            },
            {
              questionNumber: 3,
              title: 'Multithreading with Runnable Interface',
              description: 'Write a program that spawns two threads: one prints even numbers (1-20) and the second prints odd numbers (1-20) with synchronization.',
              instructions: 'Use Thread.sleep(200) to observe interleaved execution.',
              marks: 30
            }
          ]
        }
      ];

      for (const s of sampleSets) {
        await QuestionSet.create({
          examination: exam._id,
          subject: javaSubject._id,
          setNumber: s.setNumber,
          setName: s.setName,
          questions: s.questions,
          totalMarks: 100,
          isActive: true
        });
      }

      exam.numQuestionSets = sampleSets.length;
      await exam.save();

      // Generate assignments only if matching students exist
      const matchingStudentsCount = await Student.countDocuments({
        department: exam.department,
        year: exam.year,
        section: exam.section,
        isActive: true
      });

      if (matchingStudentsCount > 0) {
        await assignmentEngine.generateAssignments({
          examId: exam._id,
          facultyId: faculty._id,
          isPreview: false,
          autoPublish: true
        });
        console.log(`[Seed] Created sample exam with 6 sets and generated balanced assignments!`);
      } else {
        console.log(`[Seed] Created sample exam with 6 sets (ready for faculty to add students).`);
      }
    }
  } catch (error) {
    console.error('[Seed Error]', error);
  }
};

module.exports = seedInitialData;

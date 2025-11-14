// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'data.json');

// --- utility: load & save ---
function loadData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    // if file missing or corrupt, return fresh structure
    return { students: [] };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// --- validation helpers ---
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateStudentPayload(payload, { requireNameAndEmail = false } = {}) {
  const errors = [];

  // name
  if ('name' in payload) {
    const name = String(payload.name || '').trim();
    if (name.length < 2) errors.push('name must be at least 2 characters');
  } else if (requireNameAndEmail) {
    errors.push('name is required');
  }

  // email
  if ('email' in payload) {
    const email = String(payload.email || '').trim().toLowerCase();
    if (!emailRegex.test(email)) errors.push('email must be a valid email address');
  } else if (requireNameAndEmail) {
    errors.push('email is required');
  }

  // age
  if ('age' in payload) {
    const age = Number(payload.age);
    if (!Number.isInteger(age)) {
      errors.push('age must be an integer');
    } else if (age < 1 || age > 150) {
      errors.push('age must be between 1 and 150');
    }
  }

  // grade (optional, if present must be string)
  if ('grade' in payload) {
    if (payload.grade !== null && typeof payload.grade !== 'string') {
      errors.push('grade must be a string');
    }
  }

  return errors;
}

// --- routes ---

// GET all students
app.get('/students', (req, res) => {
  const data = loadData();
  res.json(data.students);
});

// GET one student
app.get('/students/:id', (req, res) => {
  const data = loadData();
  const id = Number(req.params.id);
  const student = data.students.find(s => s.id === id);
  if (!student) return res.status(404).json({ message: 'Student not found' });
  res.json(student);
});

// POST create student
app.post('/students', (req, res) => {
  const payload = req.body || {};
  // validate required fields
  const errors = validateStudentPayload(payload, { requireNameAndEmail: true });
  if (errors.length) return res.status(400).json({ errors });

  const data = loadData();

  const emailNormalized = String(payload.email).trim().toLowerCase();
  const existing = data.students.find(s => (s.email || '').toLowerCase() === emailNormalized);
  if (existing) return res.status(409).json({ message: 'Email already exists' });

  const newStudent = {
    id: Date.now(), // simple unique id for demo
    name: String(payload.name).trim(),
    email: emailNormalized,
    age: payload.age !== undefined ? Number(payload.age) : undefined,
    grade: payload.grade !== undefined ? String(payload.grade).trim() : 'Not specified',
    createdAt: new Date().toISOString()
  };

  data.students.push(newStudent);
  saveData(data);

  res.status(201).json(newStudent);
});

// PATCH update student (partial)
app.patch('/students/:id', (req, res) => {
  const payload = req.body || {};
  const data = loadData();
  const id = Number(req.params.id);
  const student = data.students.find(s => s.id === id);
  if (!student) return res.status(404).json({ message: 'Student not found' });

  // validate only provided fields
  const errors = validateStudentPayload(payload, { requireNameAndEmail: false });
  if (errors.length) return res.status(400).json({ errors });

  // if email provided, ensure uniqueness among others
  if ('email' in payload) {
    const newEmail = String(payload.email).trim().toLowerCase();
    const emailTaken = data.students.some(s => s.id !== id && (s.email || '').toLowerCase() === newEmail);
    if (emailTaken) return res.status(409).json({ message: 'Email already exists' });
    student.email = newEmail;
  }

  if ('name' in payload) student.name = String(payload.name).trim();
  if ('age' in payload) student.age = payload.age !== null ? Number(payload.age) : undefined;
  if ('grade' in payload) student.grade = payload.grade !== null ? String(payload.grade).trim() : undefined;

  student.updatedAt = new Date().toISOString();

  saveData(data);
  res.json(student);
});

// DELETE student
app.delete('/students/:id', (req, res) => {
  const data = loadData();
  const id = Number(req.params.id);
  const idx = data.students.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Student not found' });

  data.students.splice(idx, 1);
  saveData(data);
  res.json({ message: 'Student deleted' });
});

// root
app.get('/', (req, res) => res.send('Student API (file storage) running'));

// global error handler (basic)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Server error' });
});

// start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

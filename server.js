const express = require("express");
const fs = require("fs");
const app = express();

app.use(express.json());

// Load data
function loadData() {
  const data = fs.readFileSync("data.json");
  return JSON.parse(data);
}

// Save data
function saveData(data) {
  fs.writeFileSync("data.json", JSON.stringify(data, null, 2));
}

// GET all students
app.get("/students", (req, res) => {
  const data = loadData();
  res.json(data.students);
});

// GET one student
app.get("/students/:id", (req, res) => {
  const data = loadData();
  const student = data.students.find(s => s.id === parseInt(req.params.id));

  if (!student) return res.status(404).json({ message: "Student not found" });

  res.json(student);
});

// POST create student
app.post("/students", (req, res) => {
  const data = loadData();

  const newStudent = {
    id: Date.now(),
    name: req.body.name,
    email: req.body.email,
    age: req.body.age
  };

  data.students.push(newStudent);
  saveData(data);

  res.status(201).json(newStudent);
});

// PATCH update student
app.patch("/students/:id", (req, res) => {
  const data = loadData();
  const student = data.students.find(s => s.id === parseInt(req.params.id));

  if (!student) return res.status(404).json({ message: "Student not found" });

  Object.assign(student, req.body);

  saveData(data);
  res.json(student);
});

// DELETE student
app.delete("/students/:id", (req, res) => {
  const data = loadData();
  const filtered = data.students.filter(s => s.id !== parseInt(req.params.id));

  if (filtered.length === data.students.length)
    return res.status(404).json({ message: "Student not found" });

  data.students = filtered;
  saveData(data);

  res.json({ message: "Student deleted" });
});

// Server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});

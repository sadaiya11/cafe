const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, 'students.json')

function readStudents() {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]')
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeStudents(students) {
  fs.writeFileSync(filePath, JSON.stringify(students, null, 2))
}

const getAllStudents = (req, res) => {
  const students = readStudents()
  res.json(students)
}

const getStudentById = (req, res) => {
  const students = readStudents()
  const student = students.find((item) => item.id === Number(req.params.id))

  if (!student) {
    return res.status(404).json({ message: 'Student not found' })
  }

  res.json(student)
}

const createStudent = (req, res) => {
  const { fullName, parentName } = req.body

  if (!fullName || !parentName) {
    return res.status(400).json({ message: 'fullName and parentName are required' })
  }

  const students = readStudents()
  const newStudent = {
    id: students.length ? students[students.length - 1].id + 1 : 1,
    fullName,
    parentName,
  }

  students.push(newStudent)
  writeStudents(students)

  res.status(201).json(newStudent)
}

const updateStudent = (req, res) => {
  const students = readStudents()
  const index = students.findIndex((item) => item.id === Number(req.params.id))

  if (index === -1) {
    return res.status(404).json({ message: 'Student not found' })
  }

  const { fullName, parentName } = req.body

  if (!fullName || !parentName) {
    return res.status(400).json({ message: 'fullName and parentName are required' })
  }

  students[index] = {
    ...students[index],
    fullName,
    parentName,
  }

  writeStudents(students)
  res.json(students[index])
}

const deleteStudent = (req, res) => {
  const students = readStudents()
  const filteredStudents = students.filter((item) => item.id !== Number(req.params.id))

  if (filteredStudents.length === students.length) {
    return res.status(404).json({ message: 'Student not found' })
  }

  writeStudents(filteredStudents)
  res.json({ message: 'Student deleted successfully' })
}

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
}
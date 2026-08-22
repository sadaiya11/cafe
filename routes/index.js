const express = require('express')
const studentController = require('./controllers/students/index')

const router = express.Router()

router.get('/students', studentController.getAllStudents)
router.get('/students/:id', studentController.getStudentById)
router.post('/students', studentController.createStudent)
router.put('/students/:id', studentController.updateStudent)
router.delete('/students/:id', studentController.deleteStudent)

module.exports = router
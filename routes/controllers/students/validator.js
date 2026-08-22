const Joi = require('joi')

const createStudentSchema = Joi.object({
  fullName: Joi.string().required(),
  parentName: Joi.string().required(),
}).options({ allowUnknown: false })

const updateStudentSchema = Joi.object({
  fullName: Joi.string().required(),
  parentName: Joi.string().required(),
}).options({ allowUnknown: false })

module.exports = {
  createStudentSchema,
  updateStudentSchema,
}

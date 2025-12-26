const Joi = require('joi');

const createPostSchema = Joi.object({
  content: Joi.string().max(2000).required().messages({
    'string.empty': 'Content is required',
    'string.max': 'Content cannot exceed 2000 characters'
  }),
  image: Joi.string().allow('').optional() 
});

const updatePostSchema = Joi.object({
  content: Joi.string().max(2000).optional().messages({
    'string.max': 'Content cannot exceed 2000 characters'
  }),
  image: Joi.string().allow('').optional()
});

module.exports = { createPostSchema, updatePostSchema };

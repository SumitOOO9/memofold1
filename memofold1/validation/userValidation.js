const Joi = require("joi");

const registerValidation = Joi.object({
  realname: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      "string.base": "Real name must be a text value",
      "string.empty": "Real name is required",
      "string.min": "Real name must be at least 2 characters",
      "string.max": "Real name must be at most 50 characters",
      "any.required": "Real name is required",
    }),
  username: Joi.string()
    .min(3)
    .max(30)
    .required()
    .messages({
      "string.base": "Username must be a text value",
      "string.empty": "Username is required",
      "string.min": "Username must be at least 3 characters",
      "string.max": "Username must be at most 30 characters",
      "any.required": "Username is required",
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      "string.email": "Please provide a valid email address",
      "string.empty": "Email is required",
      "any.required": "Email is required",
    }),
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      "string.base": "Password must be a text value",
      "string.empty": "Password is required",
      "string.min": "Password must be at least 6 characters",
      "any.required": "Password is required",
    }),
  profilePic: Joi.string()
    .uri()
    .optional()
    .allow("")
    .messages({
      "string.uri": "Profile picture must be a valid URL",
    }),
});


const loginValidation = Joi.object({
  email: Joi.string()
    .email()
    .messages({
      "string.email": "Please provide a valid email address",
      "string.empty": "Email cannot be empty",
    }),
  username: Joi.string()
    .min(3)
    .max(30)
    .messages({
      "string.min": "Username must be at least 3 characters",
      "string.max": "Username cannot exceed 30 characters",
      "string.empty": "Username cannot be empty",
    }),
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      "string.empty": "Password is required",
      "string.min": "Password must be at least 6 characters",
      "any.required": "Password is required",
    }),
})
  // Custom validation: either email or username must be present
  .or("email", "username")
  .messages({
    "object.missing": "Either email or username is required",
  });



module.exports = {
  registerValidation,
  loginValidation,
};

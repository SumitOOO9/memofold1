const { body, param } = require('express-validator');

exports.validateComment = [
  // Validate comment content
  body('content')
    .trim()
    .notEmpty().withMessage('Comment content is required')
    .isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters'),

  // Validate postId from URL param
  param('postId')
    .notEmpty().withMessage('Post ID is required')
    .isMongoId().withMessage('Invalid Post ID'),

  // Validate parent comment ID if it's a reply
  body('parentCommentId')
    .optional()
    .isMongoId().withMessage('Invalid Parent Comment ID')
];
exports.validateCommentUpdate = [
  param('commentId')
    .trim()
    .notEmpty().withMessage('Comment ID is required')
    .isMongoId().withMessage('Invalid Comment ID'),

  body('content')
    .trim()
    .notEmpty().withMessage('Comment content is required')
    .isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters')
];
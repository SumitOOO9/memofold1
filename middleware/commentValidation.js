const { body } = require('express-validator');

exports.validateComment = [
  body('content')
    .trim()
    .notEmpty().withMessage('Comment content is required')
    .isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters'),
  
  body('postId')
    .notEmpty().withMessage('Post ID is required')
    .isMongoId().withMessage('Invalid Post ID'),
  
  body('parentCommentId')
    .optional()
    .isMongoId().withMessage('Invalid Parent Comment ID')
];
import { body, param } from 'express-validator';

export const createAttributeValidation = [
  body('sport_id')
    .notEmpty()
    .withMessage('Sport ID is required')
    .isInt()
    .withMessage('Sport ID must be an integer'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Attribute name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Attribute name must be between 2 and 100 characters')
];

export const createScoreValidation = [
  body('student_id')
    .notEmpty()
    .withMessage('Student ID is required')
    .isInt()
    .withMessage('Student ID must be an integer'),
  body('attribute_id')
    .notEmpty()
    .withMessage('Attribute ID is required')
    .isInt()
    .withMessage('Attribute ID must be an integer'),
  body('score')
    .notEmpty()
    .withMessage('Score is required')
    .isInt({ min: 1, max: 10 })
    .withMessage('Score must be an integer between 1 and 10'),
  body('batch_id')
    .optional()
    .isInt()
    .withMessage('Batch ID must be an integer'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters')
];

export const attributeIdValidation = [
  param('attributeId')
    .notEmpty()
    .withMessage('Attribute ID is required')
    .isInt()
    .withMessage('Attribute ID must be an integer')
];

export const studentIdValidation = [
  param('studentId')
    .notEmpty()
    .withMessage('Student ID is required')
    .isInt()
    .withMessage('Student ID must be an integer')
];

export const batchIdValidation = [
  param('batchId')
    .notEmpty()
    .withMessage('Batch ID is required')
    .isInt()
    .withMessage('Batch ID must be an integer')
];

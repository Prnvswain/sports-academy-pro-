import { body } from 'express-validator';

export const validate = (method) => {
  switch (method) {
    case 'signup':
      return [
        body('name')
          .isString()
          .trim()
          .notEmpty()
          .withMessage('Name is required'),
        body('email')
          .isEmail()
          .withMessage('Invalid email format'),
        body('password')
          .isLength({ min: 6 })
          .withMessage('Password must be at least 6 characters'),
        body('academy_name')
          .isString()
          .trim()
          .notEmpty()
          .withMessage('Academy name is required'),
        body('phone_number')
          .optional()
          .isString()
          .withMessage('Phone number must be a string'),
        body('subscription_plan')
          .optional()
          .isString()
          .withMessage('Subscription plan must be a string')
      ];

    case 'login':
      return [
        body('email')
          .isEmail()
          .withMessage('Invalid email format'),
        body('password')
          .isString()
          .notEmpty()
          .withMessage('Password is required')
      ];

    case 'forgotPassword':
      return [
        body('email')
          .isEmail()
          .withMessage('Invalid email format')
      ];

    case 'resetPassword':
      return [
        body('email')
          .isEmail()
          .withMessage('Invalid email format'),
        body('code')
          .isString()
          .trim()
          .isLength({ min: 6, max: 6 })
          .withMessage('Verification code must be 6 digits'),
        body('new_password')
          .isLength({ min: 6 })
          .withMessage('Password must be at least 6 characters')
      ];

    default:
      return [];
  }
};

import { body } from 'express-validator';

export const validate = (method) => {
  switch (method) {
    case 'markAttendance':
      return [
        body('batch_id')
          .isInt()
          .withMessage('Valid batch_id is required'),
        body('date')
          .optional()
          .isISO8601()
          .withMessage('Invalid date format'),
        body('records')
          .isArray({ min: 1 })
          .withMessage('records must be a non-empty array'),
        body('records.*.student_id')
          .isInt()
          .withMessage('Each record requires a valid student_id'),
        body('records.*.status')
          .isIn(['PRESENT', 'ABSENT', 'LATE', 'present', 'absent', 'late'])
          .withMessage('Status must be PRESENT, ABSENT, or LATE'),
        body('records.*.remarks')
          .optional()
          .isString()
          .withMessage('Remarks must be a string')
      ];

    default:
      return [];
  }
};

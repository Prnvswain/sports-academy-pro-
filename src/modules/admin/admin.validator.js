import { body, param } from 'express-validator';

export const validate = (method) => {
  switch (method) {
    case 'createSport':
      return [
        body('name').isString().trim().notEmpty().withMessage('Sport name is required'),
        body('base_fee')
          .optional()
          .isFloat({ min: 0 })
          .withMessage('Base fee must be a valid number'),
        body('baseFee')
          .optional()
          .isFloat({ min: 0 })
          .withMessage('Base fee must be a valid number'),
        body('sport_center').optional().isString().withMessage('Sport center must be a string'),
        body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
      ];

    case 'bulkSportAction':
      return [
        body('action').isIn(['activate', 'deactivate', 'delete']).withMessage('Invalid action'),
        body('sport_ids')
          .isArray()
          .withMessage('Sport IDs must be an array')
          .custom((value) => {
            if (Array.isArray(value)) {
              return value.every((id) => !isNaN(parseInt(id, 10)));
            }
            return true;
          })
          .withMessage('All sport IDs must be valid integers'),
      ];

    case 'bulkStudentAction':
      return [
        body('action').isIn(['activate', 'deactivate', 'delete']).withMessage('Invalid action'),
        body('student_ids')
          .isArray()
          .withMessage('Student IDs must be an array')
          .custom((value) => {
            if (Array.isArray(value)) {
              return value.every((id) => !isNaN(parseInt(id, 10)));
            }
            return true;
          })
          .withMessage('All student IDs must be valid integers'),
      ];

    case 'createDurationPlan':
      return [
        body('name').isString().trim().notEmpty().withMessage('Plan name is required'),
        body('duration_months')
          .isInt({ min: 1 })
          .withMessage('Duration months must be a positive integer'),
        body('multiplier')
          .isFloat({ min: 0.1 })
          .withMessage('Multiplier must be a valid number greater than 0'),
      ];

    case 'linkSport':
      return [body('sport_id').isInt().withMessage('Valid global sport_id is required')];

    case 'createCoach':
      return [
        body('name').isString().notEmpty().withMessage('Coach name is required'),
        body('specialization').isString().notEmpty().withMessage('Specialization is required'),
        body('phone_number').isMobilePhone().withMessage('Invalid phone number'),
        body('email').isEmail().withMessage('Invalid email format'),
      ];

    case 'updateCoach':
      return [
        param('coach_id').isInt().withMessage('Invalid coach ID'),
        body('name').optional().isString().withMessage('Coach name must be a string'),
        body('specialization').optional().isString().withMessage('Specialization must be a string'),
        body('phone_number').optional().isMobilePhone().withMessage('Invalid phone number'),
        body('email').optional().isEmail().withMessage('Invalid email format'),
      ];

    // STUDENT VALIDATORS
    case 'createStudent':
      return [
        body('name').isString().notEmpty().withMessage('Student name is required'),
        body('dob').optional().isISO8601().withMessage('Invalid date of birth format'),
        body('age').optional().isInt({ min: 1, max: 100 }).withMessage('Age must be between 1 and 100'),
        body('gender').custom((value) => {
          if (!value) return true;
          const normalized = value.toString().toLowerCase().trim();
          const validGenders = ['male', 'female', 'other', 'm', 'f'];
          if (!validGenders.includes(normalized)) {
            throw new Error('Invalid gender');
          }
          return true;
        }),
        body('sport_ids')
          .isArray({ min: 1 })
          .withMessage('Please select at least one sport')
          .custom((value) => {
            if (Array.isArray(value)) {
              return value.every((id) => !isNaN(parseInt(id, 10)));
            }
            return true;
          })
          .withMessage('All sport IDs must be valid integers'),
        body('sport_id').optional().isInt().withMessage('Invalid sport ID'),
        body('batch_id')
          .optional({ nullable: true, checkFalsy: true })
          .custom((value) => {
            if (value === null || value === undefined || value === '') {
              return true;
            }
            const parsed = parseInt(value, 10);
            if (isNaN(parsed)) {
              throw new Error('Invalid batch ID');
            }
            return true;
          })
          .withMessage('Invalid batch ID'),
        body('duration_plan_id').optional().isInt().withMessage('Invalid duration plan ID'),
        body('registration_fee').optional().isFloat({ min: 0 }).withMessage('Registration fee must be a valid number'),
        body('additional_charges').optional().isFloat({ min: 0 }).withMessage('Additional charges must be a valid number'),
        body('discount').optional().isFloat({ min: 0 }).withMessage('Discount must be a valid number'),
        body('blood_group')
          .optional()
          .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
          .withMessage('Invalid blood group'),
        body('height')
          .optional({ nullable: true, checkFalsy: true })
          .isFloat({ min: 0 })
          .withMessage('Height must be a valid number'),
        body('weight')
          .optional({ nullable: true, checkFalsy: true })
          .isFloat({ min: 0 })
          .withMessage('Weight must be a valid number'),
        body('joining_date')
          .optional()
          .isISO8601()
          .withMessage('Invalid joining date format'),
        body('fees_status')
          .optional()
          .isIn(['paid', 'pending', 'partial', 'unpaid'])
          .withMessage('Invalid fees status'),
        body('parent_email')
          .isEmail()
          .withMessage('Valid parent email is required for attendance notifications'),
        body('parent_phone').optional().isMobilePhone().withMessage('Invalid parent phone number'),
        body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
      ];

    case 'exitStudent':
      return [
        param('student_id').isInt().withMessage('Invalid student ID'),
        body('exit_reason').isString().trim().notEmpty().withMessage('Exit reason is required'),
        body('exit_note').optional().isString(),
      ];

    case 'updateStudent':
      return [
        param('student_id').isInt().withMessage('Invalid student ID'),
        body('name').optional().isString().withMessage('Student name must be a string'),
        body('dob').optional().isISO8601().withMessage('Invalid date of birth format'),
        body('age').optional().isInt({ min: 1, max: 100 }).withMessage('Age must be between 1 and 100'),
        body('gender')
          .optional()
          .custom((value) => {
            if (!value) return true;
            const normalized = value.toString().toLowerCase().trim();
            const validGenders = ['male', 'female', 'other', 'm', 'f'];
            if (!validGenders.includes(normalized)) {
              throw new Error('Invalid gender');
            }
            return true;
          }),
        body('sport_ids')
          .optional()
          .isArray()
          .withMessage('Sport IDs must be an array')
          .custom((value) => {
            if (Array.isArray(value)) {
              return value.every((id) => !isNaN(parseInt(id, 10)));
            }
            return true;
          })
          .withMessage('All sport IDs must be valid integers'),
        body('sport_id').optional().isInt().withMessage('Invalid sport ID'),
        body('batch_id')
          .optional({ nullable: true, checkFalsy: true })
          .custom((value) => {
            if (value === null || value === undefined || value === '') {
              return true;
            }
            const parsed = parseInt(value, 10);
            if (isNaN(parsed)) {
              throw new Error('Invalid batch ID');
            }
            return true;
          })
          .withMessage('Invalid batch ID'),
        body('duration_plan_id').optional().isInt().withMessage('Invalid duration plan ID'),
        body('blood_group')
          .optional()
          .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
          .withMessage('Invalid blood group'),
        body('height')
          .optional({ nullable: true, checkFalsy: true })
          .isFloat({ min: 0 })
          .withMessage('Height must be a valid number'),
        body('weight')
          .optional({ nullable: true, checkFalsy: true })
          .isFloat({ min: 0 })
          .withMessage('Weight must be a valid number'),
        body('joining_date')
          .optional()
          .isISO8601()
          .withMessage('Invalid joining date format'),
        body('fees_status')
          .optional()
          .isIn(['paid', 'pending', 'partial', 'unpaid'])
          .withMessage('Invalid fees status'),
        body('parent_email').optional().isEmail().withMessage('Invalid parent email'),
        body('parent_phone').optional().isMobilePhone().withMessage('Invalid parent phone number'),
        body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
      ];

    // BATCH VALIDATORS
    case 'createBatch':
      return [
        body('name').isString().notEmpty().withMessage('Batch name is required'),
        body('coach_id').isInt().withMessage('Invalid coach ID'),
        body('sport_id').isInt().withMessage('Invalid sport ID'),
        body('timing')
          .matches(/^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$/)
          .withMessage('Invalid timing format (use HH:mm - HH:mm)'),
        body('max_capacity')
          .optional()
          .isInt({ min: 1 })
          .withMessage('max_capacity must be a positive integer'),
        body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid batch status'),
      ];

    case 'updateBatch':
      return [
        param('batch_id').isInt().withMessage('Invalid batch ID'),
        body('name').optional().isString().withMessage('Batch name must be a string'),
        body('coach_id').optional().isInt().withMessage('Invalid coach ID'),
        body('sport_id').optional().isInt().withMessage('Invalid sport ID'),
        body('timing')
          .optional()
          .matches(/^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$/)
          .withMessage('Invalid timing format (use HH:mm - HH:mm)'),
        body('max_capacity')
          .optional()
          .isInt({ min: 1 })
          .withMessage('max_capacity must be a positive integer'),
        body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid batch status'),
      ];

    // ATTENDANCE VALIDATORS
    case 'markAttendance':
      return [
        body('coach_id').isInt().withMessage('Invalid coach ID'),
        body('date').isISO8601().withMessage('Invalid date format'),
        body('status').isIn(['present', 'absent', 'leave']).withMessage('Invalid status'),
        body('remarks').optional().isString().withMessage('Remarks must be a string'),
      ];

    // PAYMENT VALIDATORS
    case 'createPayment':
      return [
        body('student_id').isInt().withMessage('Invalid student ID'),
        body('amount').isFloat({ min: 0 }).withMessage('Amount must be greater than 0'),
        body('payment_date').isISO8601().withMessage('Invalid date format'),
        body('method')
          .isIn(['cash', 'cheque', 'online', 'upi', 'card', 'bank_transfer'])
          .withMessage('Invalid payment method'),
        body('status')
          .optional()
          .isIn(['pending', 'completed', 'failed'])
          .withMessage('Invalid status'),
      ];

    case 'updatePaymentStatus':
      return [
        param('payment_id').isInt().withMessage('Invalid payment ID'),
        body('status')
          .isIn(['pending', 'completed', 'failed', 'rejected'])
          .withMessage('Invalid status'),
        body('rejected_reason')
          .optional()
          .isString()
          .withMessage('Rejected reason must be a string'),
      ];

    default:
      return [];
  }
};

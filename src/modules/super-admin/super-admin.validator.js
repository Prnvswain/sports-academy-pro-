import { body, param } from 'express-validator';

export const validate = (method) => {
  switch (method) {
    case 'login':
      return [
        body('email').isEmail().withMessage('Valid email required'),
        body('password').notEmpty().withMessage('Password required')
      ];
    case 'updateAcademyStatus':
      return [
        param('academy_id').isInt().withMessage('Invalid academy ID'),
        body('status')
          .isIn(['pending', 'active', 'suspended', 'rejected'])
          .withMessage('Invalid status')
      ];
    case 'updatePlanStatus':
      return [
        param('plan_id').isInt().withMessage('Invalid plan ID'),
        body('status')
          .isIn(['active', 'disabled'])
          .withMessage('Invalid status')
      ];
    case 'putSetting':
      return [
        body('setting_key').isString().trim().notEmpty(),
        body('setting_value').isString().notEmpty()
      ];
    default:
      return [];
  }
};

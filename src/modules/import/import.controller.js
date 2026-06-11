import * as importService from './import.service.js';
import { successResponse } from '../../utils/response.js';

export const getTemplate = (req, res) => {
  const entity = req.params.entity;
  const csv = importService.getCsvTemplate(entity);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${entity}-import-template.csv"`);
  res.send(csv);
};


export const validateImport = async (req, res, next) => {
  try {
    const result = await importService.validateImportRows(
      req.user.academy_id,
      req.params.entity,
      req.body.rows
    );
    res.json(successResponse('Validation complete', result));
  } catch (err) {
    next(err);
  }
};

export const commitImport = async (req, res, next) => {
  try {
    if (req.params.entity !== 'students') {
      return res.status(400).json({
        success: false,
        message: 'Only student bulk import is enabled in this release'
      });
    }
    const result = await importService.commitStudentImport(
      req.user.academy_id,
      req.body.rows,
      req.user.user_id
    );
    res.status(201).json(successResponse('Import completed', result));
  } catch (err) {
    next(err);
  }
};

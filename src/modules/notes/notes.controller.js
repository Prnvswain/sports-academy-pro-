import * as notesService from './notes.service.js';
import { successResponse } from '../../utils/response.js';

export const createNote = async (req, res, next) => {
  try {
    const note = await notesService.createDailyNote(
      req.user.coach_id,
      req.user.academy_id,
      req.body
    );
    res.status(201).json(successResponse('Daily note saved and emailed to parent', note));
  } catch (err) {
    next(err);
  }
};

export const getStudentNotes = async (req, res, next) => {
  try {
    const notes = await notesService.listNotesForStudent(
      req.user.academy_id,
      req.params.student_id
    );
    res.json(successResponse('Notes retrieved', notes));
  } catch (err) {
    next(err);
  }
};

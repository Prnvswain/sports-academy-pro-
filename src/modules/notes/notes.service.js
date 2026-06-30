import prisma from '../../config/prisma.js';
import { NOT_DELETED } from '../../utils/softDelete.util.js';
import { sendParentDailyNoteEmail } from '../../services/mail.service.js';
import { logAudit } from '../../utils/audit.util.js';
import logger from '../../utils/logger.js';

export const createDailyNote = async (coach_id, academy_id, payload) => {
  const coachId = parseInt(coach_id, 10);
  const academyId = parseInt(academy_id, 10);
  const studentId = parseInt(payload.student_id, 10);
  const noteDate = payload.note_date ? new Date(payload.note_date) : new Date();
  noteDate.setHours(0, 0, 0, 0);

  const student = await prisma.student.findFirst({
    where: {
      student_id: studentId,
      academy_id: academyId,
      ...NOT_DELETED,
      status: 'ACTIVE'
    },
    include: { batch: true }
  });

  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  const batch = await prisma.batch.findFirst({
    where: {
      batch_id: student.batch_id,
      academy_id: academyId,
      coaches: {
        some: {
          coach_id: coachId
        }
      }
    }
  });

  if (!batch) {
    const error = new Error('Student is not in a batch assigned to you');
    error.statusCode = 403;
    throw error;
  }

  const hasContent =
    payload.performance_notes ||
    payload.behaviour_notes ||
    payload.achievements ||
    payload.improvement_areas;

  if (!hasContent) {
    const error = new Error('At least one note field is required');
    error.statusCode = 400;
    throw error;
  }

  const note = await prisma.dailyStudentNote.create({
    data: {
      academy_id: academyId,
      student_id: studentId,
      batch_id: student.batch_id,
      coach_id: coachId,
      note_date: noteDate,
      performance_notes: payload.performance_notes || null,
      behaviour_notes: payload.behaviour_notes || null,
      achievements: payload.achievements || null,
      improvement_areas: payload.improvement_areas || null
    }
  });

  if (student.parent_email) {
    try {
      await sendParentDailyNoteEmail({
        parentEmail: student.parent_email,
        studentName: student.name,
        batchName: student.batch?.name,
        note
      });
      await prisma.dailyStudentNote.update({
        where: { note_id: note.note_id },
        data: { emailed_at: new Date() }
      });
    } catch (mailErr) {
      logger.error('Daily note email failed', {
        student_id: studentId,
        message: mailErr.message
      });
    }
  }

  await logAudit({
    academy_id: academyId,
    actor_type: 'COACH',
    actor_id: coachId,
    action: 'DAILY_NOTE_CREATED',
    entity_type: 'Student',
    entity_id: studentId
  });

  return note;
};

export const listNotesForStudent = async (academy_id, student_id) =>
  prisma.dailyStudentNote.findMany({
    where: {
      academy_id: parseInt(academy_id, 10),
      student_id: parseInt(student_id, 10)
    },
    include: { coach: { select: { name: true } } },
    orderBy: { note_date: 'desc' },
    take: 50
  });

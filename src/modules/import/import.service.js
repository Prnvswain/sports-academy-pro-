import prisma from '../../config/prisma.js';
import { NOT_DELETED } from '../../utils/softDelete.util.js';
import { logAudit } from '../../utils/audit.util.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s-]{8,15}$/;

const validateStudentRow = (row, index, seenEmails) => {
  const errors = [];
  const line = index + 2;

  if (!row.name?.trim()) errors.push({ line, field: 'name', message: 'Name is required' });
  if (!row.parent_email?.trim()) {
    errors.push({ line, field: 'parent_email', message: 'Parent email is required' });
  } else if (!EMAIL_RE.test(row.parent_email.trim())) {
    errors.push({ line, field: 'parent_email', message: 'Invalid email' });
  } else if (seenEmails.has(row.parent_email.trim().toLowerCase())) {
    errors.push({ line, field: 'parent_email', message: 'Duplicate email in file' });
  } else {
    seenEmails.add(row.parent_email.trim().toLowerCase());
  }

  if (row.parent_phone && !PHONE_RE.test(String(row.parent_phone).trim())) {
    errors.push({ line, field: 'parent_phone', message: 'Invalid phone number' });
  }

  if (row.age && (Number.isNaN(Number(row.age)) || Number(row.age) < 1)) {
    errors.push({ line, field: 'age', message: 'Invalid age' });
  }

  return errors;
};

export const validateImportRows = async (academy_id, entity, rows) => {
  const errors = [];
  const valid = [];
  const seenEmails = new Set();

  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      valid: [],
      errors: [{ line: 0, field: 'file', message: 'No rows found in file' }],
      summary: { total: 0, valid_count: 0, error_count: 1 }
    };
  }

  if (entity === 'students') {
    for (let i = 0; i < rows.length; i += 1) {
      const rowErrors = validateStudentRow(rows[i], i, seenEmails);
      if (rowErrors.length) {
        errors.push(...rowErrors);
      } else {
        valid.push(rows[i]);
      }
    }

    const filteredValid = [];
    for (let i = 0; i < valid.length; i += 1) {
      const row = valid[i];
      const existing = await prisma.student.findFirst({
        where: {
          academy_id: parseInt(academy_id, 10),
          parent_email: row.parent_email.trim(),
          ...NOT_DELETED
        }
      });
      if (existing) {
        errors.push({
          line: rows.indexOf(row) + 2,
          field: 'parent_email',
          message: 'Student with this parent email already exists'
        });
      } else {
        filteredValid.push(row);
      }
    }

    return {
      valid: filteredValid,
      errors,
      summary: {
        total: rows.length,
        valid_count: filteredValid.length,
        error_count: errors.length
      }
    };
  }

  return {
    valid: [],
    errors: [{ line: 0, field: 'entity', message: `Import for ${entity} not implemented yet` }],
    summary: { total: rows.length, valid_count: 0, error_count: 1 }
  };
};

export const commitStudentImport = async (academy_id, rows, admin_user_id) => {
  const created = [];

  for (const row of rows) {
    const student = await prisma.student.create({
      data: {
        academy_id: parseInt(academy_id, 10),
        name: row.name.trim(),
        age: row.age ? parseInt(row.age, 10) : null,
        gender: row.gender || 'Other',
        parent_name: row.parent_name?.trim() || null,
        parent_email: row.parent_email.trim(),
        parent_phone: row.parent_phone?.trim() || null,
        blood_group: row.blood_group || null,
        fees_status: 'unpaid',
        status: 'ACTIVE'
      }
    });
    created.push(student);
  }

  await logAudit({
    academy_id,
    actor_type: 'ADMIN',
    actor_id: admin_user_id,
    action: 'BULK_IMPORT_STUDENTS',
    metadata: { count: created.length }
  });

  return { imported_count: created.length, students: created };
};

export const getCsvTemplate = (entity) => {
  if (entity === 'students') {
    return 'name,age,gender,parent_name,parent_email,parent_phone,blood_group\nJohn Doe,12,Male,Jane Doe,jane@example.com,+919876543210,O+\n';
  }
  if (entity === 'coaches') {
    return 'name,email,phone_number,specialization\nCoach Name,coach@example.com,+919876543210,Cricket\n';
  }
  if (entity === 'batches') {
    return 'name,sport_name,timing,max_capacity,coach_email\nMorning Cricket,Cricket,07:00,20,coach@example.com\n';
  }
  return '';
};

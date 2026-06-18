import prisma from '../../config/prisma.js';
import { NOT_DELETED } from '../../utils/softDelete.util.js';
import { logAudit } from '../../utils/audit.util.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s-]{8,15}$/;

const validateCoachRow = (row, index, seenEmails) => {
  const errors = [];
  const line = index + 2;

  if (!row.name?.trim()) errors.push({ line, field: 'name', message: 'Name is required' });
  if (!row.email?.trim()) {
    errors.push({ line, field: 'email', message: 'Email is required' });
  } else if (!EMAIL_RE.test(row.email.trim())) {
    errors.push({ line, field: 'email', message: 'Invalid email' });
  } else if (seenEmails.has(row.email.trim().toLowerCase())) {
    errors.push({ line, field: 'email', message: 'Duplicate email in file' });
  } else {
    seenEmails.add(row.email.trim().toLowerCase());
  }

  if (row.phone_number && !PHONE_RE.test(String(row.phone_number).trim())) {
    errors.push({ line, field: 'phone_number', message: 'Invalid phone number' });
  }

  return errors;
};

const validateBatchRow = (row, index, seenBatchNames) => {
  const errors = [];
  const line = index + 2;

  if (!row.name?.trim()) errors.push({ line, field: 'name', message: 'Batch name is required' });
  if (!row.sport_name?.trim()) errors.push({ line, field: 'sport_name', message: 'Sport name is required' });
  
  if (row.name && seenBatchNames.has(row.name.trim().toLowerCase())) {
    errors.push({ line, field: 'name', message: 'Duplicate batch name in file' });
  } else if (row.name) {
    seenBatchNames.add(row.name.trim().toLowerCase());
  }

  if (row.max_capacity && (Number.isNaN(Number(row.max_capacity)) || Number(row.max_capacity) < 1)) {
    errors.push({ line, field: 'max_capacity', message: 'Invalid max capacity' });
  }

  return errors;
};

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
  const seenBatchNames = new Set();

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

  if (entity === 'coaches') {
    for (let i = 0; i < rows.length; i += 1) {
      const rowErrors = validateCoachRow(rows[i], i, seenEmails);
      if (rowErrors.length) {
        errors.push(...rowErrors);
      } else {
        valid.push(rows[i]);
      }
    }

    const filteredValid = [];
    for (let i = 0; i < valid.length; i += 1) {
      const row = valid[i];
      const existing = await prisma.coach.findFirst({
        where: {
          academy_id: parseInt(academy_id, 10),
          email: row.email.trim(),
          ...NOT_DELETED
        }
      });
      if (existing) {
        errors.push({
          line: rows.indexOf(row) + 2,
          field: 'email',
          message: 'Coach with this email already exists'
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

  if (entity === 'batches') {
    for (let i = 0; i < rows.length; i += 1) {
      const rowErrors = validateBatchRow(rows[i], i, seenBatchNames);
      if (rowErrors.length) {
        errors.push(...rowErrors);
      } else {
        valid.push(rows[i]);
      }
    }

    const filteredValid = [];
    for (let i = 0; i < valid.length; i += 1) {
      const row = valid[i];
      
      // Check if sport exists
      const sport = await prisma.sport.findFirst({
        where: {
          academy_id: parseInt(academy_id, 10),
          name: row.sport_name.trim(),
          ...NOT_DELETED
        }
      });

      if (!sport) {
        errors.push({
          line: rows.indexOf(row) + 2,
          field: 'sport_name',
          message: `Sport '${row.sport_name}' not found in academy`
        });
      } else {
        // Check if batch with same name exists for this sport
        const existing = await prisma.batch.findFirst({
          where: {
            academy_id: parseInt(academy_id, 10),
            name: row.name.trim(),
            sport_id: sport.sport_id,
            ...NOT_DELETED
          }
        });

        if (existing) {
          errors.push({
            line: rows.indexOf(row) + 2,
            field: 'name',
            message: 'Batch with this name already exists for this sport'
          });
        } else {
          filteredValid.push({ ...row, sport_id: sport.sport_id });
        }
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

const normalizeGender = (gender) => {
  if (!gender) return 'Other';
  const normalized = gender.toString().toLowerCase().trim();
  if (['male', 'm'].includes(normalized)) return 'Male';
  if (['female', 'f'].includes(normalized)) return 'Female';
  return 'Other';
};

export const commitStudentImport = async (academy_id, rows, admin_user_id) => {
  const created = [];

  for (const row of rows) {
    const student = await prisma.student.create({
      data: {
        academy_id: parseInt(academy_id, 10),
        name: row.name.trim(),
        age: row.age ? parseInt(row.age, 10) : null,
        gender: normalizeGender(row.gender),
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

export const commitCoachImport = async (academy_id, rows, admin_user_id) => {
  const created = [];

  for (const row of rows) {
    const coach = await prisma.coach.create({
      data: {
        academy_id: parseInt(academy_id, 10),
        name: row.name.trim(),
        email: row.email.trim(),
        phone_number: row.phone_number?.trim() || null,
        specialization: row.specialization?.trim() || null,
        status: 'ACTIVE'
      }
    });
    created.push(coach);
  }

  await logAudit({
    academy_id,
    actor_type: 'ADMIN',
    actor_id: admin_user_id,
    action: 'BULK_IMPORT_COACHES',
    metadata: { count: created.length }
  });

  return { imported_count: created.length, coaches: created };
};

export const commitBatchImport = async (academy_id, rows, admin_user_id) => {
  const created = [];

  for (const row of rows) {
    const batch = await prisma.batch.create({
      data: {
        academy_id: parseInt(academy_id, 10),
        name: row.name.trim(),
        sport_id: row.sport_id,
        timing: row.timing?.trim() || null,
        start_time: row.start_time?.trim() || null,
        end_time: row.end_time?.trim() || null,
        max_capacity: row.max_capacity ? parseInt(row.max_capacity, 10) : null,
        status: 'ACTIVE'
      }
    });
    created.push(batch);

    // If coach_email is provided, assign coach to batch
    if (row.coach_email?.trim()) {
      const coach = await prisma.coach.findFirst({
        where: {
          academy_id: parseInt(academy_id, 10),
          email: row.coach_email.trim(),
          ...NOT_DELETED
        }
      });

      if (coach) {
        await prisma.batchCoach.create({
          data: {
            batch_id: batch.batch_id,
            coach_id: coach.coach_id
          }
        });
      }
    }
  }

  await logAudit({
    academy_id,
    actor_type: 'ADMIN',
    actor_id: admin_user_id,
    action: 'BULK_IMPORT_BATCHES',
    metadata: { count: created.length }
  });

  return { imported_count: created.length, batches: created };
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

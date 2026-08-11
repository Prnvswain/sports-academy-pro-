import prisma from '../../config/prisma.js';
import logger from '../../utils/logger.js';
import { createNotification } from '../notifications/notifications.service.js';

// India's static national/public holidays mapping table
const INDIA_HOLIDAYS = [
  { title: 'Republic Day', month: 0, day: 26 },
  { title: 'Holi', month: 2, day: 8 },
  { title: 'Mahavir Jayanti', month: 3, day: 4 },
  { title: 'Good Friday', month: 3, day: 7 },
  { title: 'Ambedkar Jayanti', month: 3, day: 14 },
  { title: 'Eid al-Fitr', month: 3, day: 22 },
  { title: 'Buddha Purnima', month: 4, day: 5 },
  { title: 'Independence Day', month: 7, day: 15 },
  { title: 'Janmashtami', month: 8, day: 7 },
  { title: 'Gandhi Jayanti', month: 9, day: 2 },
  { title: 'Dussehra', month: 9, day: 24 },
  { title: 'Diwali', month: 10, day: 12 },
  { title: 'Guru Nanak Jayanti', month: 10, day: 27 },
  { title: 'Christmas', month: 11, day: 25 }
];

// Helper to seed national holidays for a given year if not yet seeded
export const seedNationalHolidaysForYear = async (academyId, year) => {
  const parsedYear = parseInt(year, 10);
  
  // Check if national holidays already exist for this year
  const startOfYear = new Date(parsedYear, 0, 1);
  const endOfYear = new Date(parsedYear, 11, 31, 23, 59, 59);

  const existingCount = await prisma.calendarEvent.count({
    where: {
      academy_id: academyId,
      type: 'NATIONAL_HOLIDAY',
      start_date: {
        gte: startOfYear,
        lte: endOfYear
      }
    }
  });

  if (existingCount > 0) return;

  // Bulk create national holidays
  const eventsToCreate = INDIA_HOLIDAYS.map(holiday => {
    const start = new Date(parsedYear, holiday.month, holiday.day, 9, 0, 0);
    const end = new Date(parsedYear, holiday.month, holiday.day, 18, 0, 0);
    return {
      academy_id: academyId,
      title: holiday.title,
      description: `Default Indian National Holiday: ${holiday.title}`,
      type: 'NATIONAL_HOLIDAY',
      start_date: start,
      end_date: end,
      block_attendance: true,
      block_performance: true,
      color: '#eab308', // Yellow
      priority: 'MEDIUM',
      visibility: 'ALL'
    };
  });

  await prisma.calendarEvent.createMany({
    data: eventsToCreate
  });
  logger.info(`Seeded ${eventsToCreate.length} National Holidays for Academy ${academyId} for year ${parsedYear}`);
};

// Get calendar events for standard views
export const getCalendarEvents = async (academyId, query, user) => {
  const { year, month, sport_id, type, student_id } = query;
  const academy_id = parseInt(academyId, 10);
  
  const targetYear = parseInt(year || new Date().getFullYear(), 10);

  // Auto seed default national holidays for target year
  await seedNationalHolidaysForYear(academy_id, targetYear);

  const whereClause = {
    academy_id,
    start_date: {
      gte: new Date(targetYear - 1, 11, 1), // Fetch overlaps
      lte: new Date(targetYear + 1, 0, 31)
    }
  };

  if (month !== undefined) {
    const m = parseInt(month, 10);
    whereClause.start_date = {
      gte: new Date(targetYear, m, 1),
      lte: new Date(targetYear, m + 1, 0, 23, 59, 59)
    };
  }

  if (sport_id) {
    whereClause.sport_id = parseInt(sport_id, 10);
  }

  if (type) {
    whereClause.type = type;
  }

  // Scoping checks based on role
  if (user) {
    if (user.role === 'COACH') {
      const batchCoaches = await prisma.batchCoach.findMany({
        where: { coach_id: user.coach_id },
        select: { batch_id: true }
      });
      const coachBatchIds = batchCoaches.map(bc => bc.batch_id);

      whereClause.AND = [
        {
          OR: [
            { batch_id: null, visibility: { in: ['ALL', 'COACH'] } },
            { batch_id: { in: coachBatchIds } }
          ]
        }
      ];
    } else if (user.role === 'PARENT') {
      let parentBatchIds = [];
      const parentId = parseInt(user.id, 10);

      if (student_id) {
        const student = await prisma.student.findFirst({
          where: { student_id: parseInt(student_id, 10), parent_id: parentId, is_deleted: false },
          select: { batch_id: true }
        });
        if (student && student.batch_id) {
          parentBatchIds = [student.batch_id];
        }
      } else {
        const students = await prisma.student.findMany({
          where: { parent_id: parentId, is_deleted: false },
          select: { batch_id: true }
        });
        parentBatchIds = students.map(s => s.batch_id).filter(id => id !== null);
      }

      whereClause.AND = [
        {
          OR: [
            { batch_id: null, visibility: { in: ['ALL', 'PARENT'] } },
            { batch_id: { in: parentBatchIds } }
          ]
        }
      ];
    }
  }

  const events = await prisma.calendarEvent.findMany({
    where: whereClause,
    include: {
      sport: {
        select: {
          name: true
        }
      },
      batch: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      start_date: 'asc'
    }
  });

  return events;
};

// Create calendar event
export const createCalendarEvent = async (academyId, data, user) => {
  const {
    title,
    description,
    type,
    start_date,
    end_date,
    start_time,
    end_time,
    location,
    sport_id,
    organizer,
    banner,
    attachment,
    priority,
    reminder,
    visibility,
    notes,
    block_attendance,
    block_performance,
    is_custom,
    color,
    batch_id
  } = data;

  const academy_id = parseInt(academyId, 10);
  const parsedSportId = sport_id ? parseInt(sport_id, 10) : null;
  const parsedBatchId = batch_id ? parseInt(batch_id, 10) : null;

  if (user && user.role === 'COACH') {
    if (!parsedBatchId) {
      throw new Error('Batch ID is required for coach events.');
    }
    const assigned = await prisma.batchCoach.findFirst({
      where: { coach_id: user.coach_id, batch_id: parsedBatchId }
    });
    if (!assigned) {
      throw new Error('Coach is not assigned to this batch.');
    }
  }

  // Validate duplicate custom event names on same date
  if (type === 'CUSTOM_EVENT') {
    const duplicate = await prisma.calendarEvent.findFirst({
      where: {
        academy_id,
        title: title.trim(),
        start_date: new Date(start_date)
      }
    });
    if (duplicate) {
      throw new Error('A custom event with this title already exists on the selected date.');
    }
  }

  const createdEvent = await prisma.calendarEvent.create({
    data: {
      academy_id,
      title: title.trim(),
      description,
      type,
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      start_time,
      end_time,
      location,
      sport_id: parsedSportId,
      batch_id: parsedBatchId,
      coach_id: user && user.role === 'COACH' ? user.coach_id : null,
      organizer,
      banner,
      attachment,
      priority: priority || 'MEDIUM',
      reminder: reminder ? parseInt(reminder, 10) : null,
      visibility: visibility || 'ALL',
      notes,
      block_attendance: block_attendance || false,
      block_performance: block_performance || false,
      is_custom: is_custom || false,
      color: color || '#eab308'
    }
  });

  // Notify parents
  if (createdEvent.batch_id) {
    const batch = await prisma.batch.findUnique({
      where: { batch_id: createdEvent.batch_id },
      select: { name: true }
    });
    const students = await prisma.student.findMany({
      where: { batch_id: createdEvent.batch_id, is_deleted: false, parent_id: { not: null } },
      select: { parent_id: true }
    });
    const parentIds = [...new Set(students.map(s => s.parent_id))];
    for (const parentId of parentIds) {
      await createNotification(academy_id, {
        type: 'GENERAL',
        title: `New Batch Event: ${createdEvent.title}`,
        body: `A new event "${createdEvent.title}" for batch "${batch?.name || ''}" has been scheduled on ${new Date(createdEvent.start_date).toLocaleDateString()}.`,
        user_id: parentId
      });
    }
  }

  return createdEvent;
};

// Update calendar event
export const updateCalendarEvent = async (academyId, eventId, data, user) => {
  const id = parseInt(eventId, 10);
  const academy_id = parseInt(academyId, 10);

  const event = await prisma.calendarEvent.findFirst({
    where: { event_id: id, academy_id }
  });

  if (!event) throw new Error('Event not found');

  if (user && user.role === 'COACH') {
    if (event.coach_id !== user.coach_id) {
      throw new Error('Unauthorized to modify this event.');
    }
  }

  const {
    title,
    description,
    type,
    start_date,
    end_date,
    start_time,
    end_time,
    location,
    sport_id,
    organizer,
    banner,
    attachment,
    priority,
    reminder,
    visibility,
    notes,
    block_attendance,
    block_performance,
    is_custom,
    color,
    batch_id
  } = data;

  const updatedEvent = await prisma.calendarEvent.update({
    where: { event_id: id },
    data: {
      title: title?.trim(),
      description,
      type,
      start_date: start_date ? new Date(start_date) : undefined,
      end_date: end_date ? new Date(end_date) : undefined,
      start_time,
      end_time,
      location,
      sport_id: sport_id ? parseInt(sport_id, 10) : null,
      batch_id: batch_id ? parseInt(batch_id, 10) : undefined,
      organizer,
      banner,
      attachment,
      priority,
      reminder: reminder ? parseInt(reminder, 10) : null,
      visibility,
      notes,
      block_attendance,
      block_performance,
      is_custom,
      color
    }
  });

  // Notify parents
  if (updatedEvent.batch_id) {
    const batch = await prisma.batch.findUnique({
      where: { batch_id: updatedEvent.batch_id },
      select: { name: true }
    });
    const students = await prisma.student.findMany({
      where: { batch_id: updatedEvent.batch_id, is_deleted: false, parent_id: { not: null } },
      select: { parent_id: true }
    });
    const parentIds = [...new Set(students.map(s => s.parent_id))];
    for (const parentId of parentIds) {
      await createNotification(academy_id, {
        type: 'GENERAL',
        title: `Batch Event Updated: ${updatedEvent.title}`,
        body: `The event "${updatedEvent.title}" for batch "${batch?.name || ''}" on ${new Date(updatedEvent.start_date).toLocaleDateString()} has been updated.`,
        user_id: parentId
      });
    }
  }

  return updatedEvent;
};

// Delete calendar event
export const deleteCalendarEvent = async (academyId, eventId, user) => {
  const id = parseInt(eventId, 10);
  const academy_id = parseInt(academyId, 10);

  const event = await prisma.calendarEvent.findFirst({
    where: { event_id: id, academy_id }
  });

  if (!event) throw new Error('Event not found');

  if (user && user.role === 'COACH') {
    if (event.coach_id !== user.coach_id) {
      throw new Error('Unauthorized to delete this event.');
    }
  }

  await prisma.calendarEvent.delete({
    where: { event_id: id }
  });
};

// Create a date override
export const createDateOverride = async (academyId, userId, data) => {
  const { date, reason, type } = data;
  const academy_id = parseInt(academyId, 10);
  const parsedDate = new Date(date);
  parsedDate.setHours(0, 0, 0, 0);

  // Re-upsert override to avoid conflicts
  return await prisma.calendarOverride.upsert({
    where: {
      academy_id_date_type: {
        academy_id,
        date: parsedDate,
        type
      }
    },
    update: {
      reason,
      created_by: parseInt(userId, 10)
    },
    create: {
      academy_id,
      date: parsedDate,
      reason,
      type,
      created_by: parseInt(userId, 10)
    }
  });
};

// Check if a date operation is blocked
export const isOperationBlocked = async (academyId, dateStr, operationType, batchId = null) => {
  const academy_id = parseInt(academyId, 10);
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);

  // Look for any event overlapping this date that blocks the operation
  const startOfDay = new Date(date);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // 1. Academy Holiday / Admin Weekly Off (Blocks all)
  const academyBlockEvent = await prisma.calendarEvent.findFirst({
    where: {
      academy_id,
      batch_id: null,
      start_date: { lte: endOfDay },
      end_date: { gte: startOfDay },
      OR: [
        { type: { in: ['WEEKLY_OFF', 'PUBLIC_HOLIDAY', 'ACADEMY_HOLIDAY'] } },
        {
          AND: [
            { type: 'NATIONAL_HOLIDAY' },
            { block_attendance: true }
          ]
        },
        {
          AND: [
            { type: 'CUSTOM_EVENT' },
            {
              OR: [
                { block_attendance: operationType === 'ATTENDANCE' },
                { block_performance: operationType === 'PERFORMANCE' },
                { AND: [{ block_attendance: true }, { block_performance: true }] }
              ]
            }
          ]
        }
      ]
    }
  });

  if (academyBlockEvent) {
    // If a blocking event exists, check if there is an active override
    const override = await prisma.calendarOverride.findFirst({
      where: {
        academy_id,
        date,
        type: { in: [operationType, 'BOTH'] }
      }
    });

    if (!override) {
      return {
        blocked: true,
        message: 'Academy is closed today. Attendance and performance entry are unavailable.'
      };
    }
  }

  // 2. Approved Batch Holiday (Blocks only that batch)
  if (batchId) {
    const parsedBatchId = parseInt(batchId, 10);
    const batchBlockEvent = await prisma.calendarEvent.findFirst({
      where: {
        academy_id,
        batch_id: parsedBatchId,
        start_date: { lte: endOfDay },
        end_date: { gte: startOfDay },
        OR: [
          { type: 'BATCH_HOLIDAY' },
          { block_attendance: operationType === 'ATTENDANCE' },
          { block_performance: operationType === 'PERFORMANCE' }
        ]
      }
    });

    if (batchBlockEvent) {
      return {
        blocked: true,
        message: 'This batch is off today. Attendance and performance entry are unavailable.'
      };
    }
  }

  return false;
};

// Get Dashboard widgets details
export const getCalendarDashboardStats = async (academyId, user, query = {}) => {
  const academy_id = parseInt(academyId, 10);
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  // Determine what batch_id to filter for today's status
  let batchIds = [];

  if (user) {
    if (user.role === 'PARENT') {
      const studentId = query.student_id ? parseInt(query.student_id, 10) : null;
      if (studentId) {
        const student = await prisma.student.findFirst({
          where: { student_id: studentId, parent_id: parseInt(user.id, 10), is_deleted: false },
          select: { batch_id: true }
        });
        if (student && student.batch_id) {
          batchIds = [student.batch_id];
        }
      } else {
        const students = await prisma.student.findMany({
          where: { parent_id: parseInt(user.id, 10), is_deleted: false },
          select: { batch_id: true }
        });
        batchIds = students.map(s => s.batch_id).filter(id => id !== null);
      }
    } else if (user.role === 'COACH') {
      const bId = query.batch_id ? parseInt(query.batch_id, 10) : null;
      if (bId) {
        batchIds = [bId];
      } else {
        const batchCoaches = await prisma.batchCoach.findMany({
          where: { coach_id: user.coach_id },
          select: { batch_id: true }
        });
        batchIds = batchCoaches.map(bc => bc.batch_id);
      }
    }
  }

  // 1. Today's Status
  const whereEvent = {
    academy_id,
    start_date: { lte: endOfDay },
    end_date: { gte: startOfDay }
  };

  if (user && user.role === 'COACH') {
    whereEvent.OR = [
      { batch_id: null, visibility: { in: ['ALL', 'COACH'] } },
      { batch_id: { in: batchIds } }
    ];
  } else if (user && user.role === 'PARENT') {
    whereEvent.OR = [
      { batch_id: null, visibility: { in: ['ALL', 'PARENT'] } },
      { batch_id: { in: batchIds } }
    ];
  }

  const activeEvent = await prisma.calendarEvent.findFirst({
    where: whereEvent,
    orderBy: [
      { priority: 'desc' },
      { created_at: 'desc' }
    ]
  });

  let todayStatus = '🟢 Working Day';
  let banner = '';

  if (activeEvent) {
    if (activeEvent.type === 'BATCH_HOLIDAY') {
      todayStatus = `🔴 ${activeEvent.title}`;
    } else if (activeEvent.type === 'NATIONAL_HOLIDAY' || activeEvent.type === 'PUBLIC_HOLIDAY' || activeEvent.type === 'ACADEMY_HOLIDAY') {
      todayStatus = '🔴 Holiday';
    } else if (activeEvent.type === 'WEEKLY_OFF') {
      todayStatus = '🔴 Weekly Off';
    } else if (activeEvent.type === 'TOURNAMENT') {
      todayStatus = '🏆 Tournament Today';
      banner = 'Tournament Today';
    } else if (activeEvent.type === 'PRACTICE_CAMP') {
      todayStatus = '🎯 Practice Camp';
      banner = 'Practice Camp Today';
    } else if (activeEvent.type === 'PARENT_MEETING') {
      todayStatus = '👨👩👧 Parent Meeting';
      banner = 'Parent Meeting Today';
    } else {
      todayStatus = `⭐ ${activeEvent.title}`;
    }
  }

  // 2. Upcoming events count & dates
  const nextHolidayWhere = {
    academy_id,
    start_date: { gt: today },
    type: { in: ['NATIONAL_HOLIDAY', 'PUBLIC_HOLIDAY', 'ACADEMY_HOLIDAY', 'WEEKLY_OFF', 'BATCH_HOLIDAY'] }
  };

  const nextTournamentWhere = {
    academy_id,
    start_date: { gt: today },
    type: 'TOURNAMENT'
  };

  const nextEventWhere = {
    academy_id,
    start_date: { gt: today },
    type: { notIn: ['WORKING_DAY', 'NATIONAL_HOLIDAY', 'PUBLIC_HOLIDAY', 'ACADEMY_HOLIDAY', 'WEEKLY_OFF', 'BATCH_HOLIDAY'] }
  };

  if (user && user.role === 'COACH') {
    const andCond = {
      OR: [
        { batch_id: null },
        { batch_id: { in: batchIds } }
      ]
    };
    nextHolidayWhere.AND = andCond;
    nextTournamentWhere.AND = andCond;
    nextEventWhere.AND = andCond;
  } else if (user && user.role === 'PARENT') {
    const andCond = {
      OR: [
        { batch_id: null },
        { batch_id: { in: batchIds } }
      ]
    };
    nextHolidayWhere.AND = andCond;
    nextTournamentWhere.AND = andCond;
    nextEventWhere.AND = andCond;
  }

  const nextHoliday = await prisma.calendarEvent.findFirst({
    where: nextHolidayWhere,
    orderBy: { start_date: 'asc' }
  });

  const nextTournament = await prisma.calendarEvent.findFirst({
    where: nextTournamentWhere,
    orderBy: { start_date: 'asc' }
  });

  const nextEvent = await prisma.calendarEvent.findFirst({
    where: nextEventWhere,
    orderBy: { start_date: 'asc' }
  });

  // Calculate current month statistics
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

  const holidaysCountThisMonthWhere = {
    academy_id,
    start_date: { gte: currentMonthStart, lte: currentMonthEnd },
    type: { in: ['NATIONAL_HOLIDAY', 'PUBLIC_HOLIDAY', 'ACADEMY_HOLIDAY', 'WEEKLY_OFF', 'BATCH_HOLIDAY'] }
  };

  if (user && user.role === 'COACH') {
    holidaysCountThisMonthWhere.AND = {
      OR: [
        { batch_id: null },
        { batch_id: { in: batchIds } }
      ]
    };
  } else if (user && user.role === 'PARENT') {
    holidaysCountThisMonthWhere.AND = {
      OR: [
        { batch_id: null },
        { batch_id: { in: batchIds } }
      ]
    };
  }

  const holidaysThisMonth = await prisma.calendarEvent.count({
    where: holidaysCountThisMonthWhere
  });

  const daysInMonth = currentMonthEnd.getDate();
  const workingDays = daysInMonth - holidaysThisMonth;

  return {
    todayStatus,
    banner,
    nextHoliday,
    nextTournament,
    nextEvent,
    workingDaysThisMonth: workingDays,
    holidaysCountThisMonth: holidaysThisMonth
  };
};

// Reset calendar events for a specific month & year, then seed national holidays
export const resetCalendarEvents = async (academyId, year, month) => {
  const academy_id = parseInt(academyId, 10);
  const targetYear = parseInt(year, 10);
  const targetMonth = parseInt(month, 10); // 0-indexed

  const startOfMonth = new Date(targetYear, targetMonth, 1);
  const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

  // Delete all events in this month
  await prisma.calendarEvent.deleteMany({
    where: {
      academy_id,
      start_date: {
        gte: startOfMonth,
        lte: endOfMonth
      }
    }
  });

  // Seed national holidays for this year (this helper handles deduplication or seeds if missing)
  const monthHolidays = INDIA_HOLIDAYS.filter(h => h.month === targetMonth);
  const eventsToCreate = monthHolidays.map(holiday => {
    const start = new Date(targetYear, holiday.month, holiday.day, 9, 0, 0);
    const end = new Date(targetYear, holiday.month, holiday.day, 18, 0, 0);
    return {
      academy_id,
      title: holiday.title,
      description: `Default Indian National Holiday: ${holiday.title}`,
      type: 'NATIONAL_HOLIDAY',
      start_date: start,
      end_date: end,
      block_attendance: true,
      block_performance: true,
      color: '#eab308',
      priority: 'MEDIUM',
      visibility: 'ALL'
    };
  });

  if (eventsToCreate.length > 0) {
    await prisma.calendarEvent.createMany({
      data: eventsToCreate
    });
  }
};

// Clear all calendar events for a specific month & year
export const clearCalendarEvents = async (academyId, year, month) => {
  const academy_id = parseInt(academyId, 10);
  const targetYear = parseInt(year, 10);
  const targetMonth = parseInt(month, 10);

  const startOfMonth = new Date(targetYear, targetMonth, 1);
  const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

  await prisma.calendarEvent.deleteMany({
    where: {
      academy_id,
      start_date: {
        gte: startOfMonth,
        lte: endOfMonth
      }
    }
  });
};

// Copy all events from the previous month to the current month
export const copyCalendarFromPreviousMonth = async (academyId, year, month) => {
  const academy_id = parseInt(academyId, 10);
  const targetYear = parseInt(year, 10);
  const targetMonth = parseInt(month, 10);

  // Previous month dates
  let prevMonth = targetMonth - 1;
  let prevYear = targetYear;
  if (prevMonth < 0) {
    prevMonth = 11;
    prevYear -= 1;
  }

  const startOfPrev = new Date(prevYear, prevMonth, 1);
  const endOfPrev = new Date(prevYear, prevMonth + 1, 0, 23, 59, 59, 999);

  // Fetch all events from previous month
  const prevEvents = await prisma.calendarEvent.findMany({
    where: {
      academy_id,
      start_date: {
        gte: startOfPrev,
        lte: endOfPrev
      }
    }
  });

  // Create duplicates shifted by 1 month
  const eventsToCreate = prevEvents.map(event => {
    const prevStart = new Date(event.start_date);
    const prevEnd = new Date(event.end_date);
    
    // Shift target start/end date by matching day of month in targetMonth
    const targetStart = new Date(targetYear, targetMonth, prevStart.getDate(), prevStart.getHours(), prevStart.getMinutes(), prevStart.getSeconds());
    const targetEnd = new Date(targetYear, targetMonth, prevEnd.getDate(), prevEnd.getHours(), prevEnd.getMinutes(), prevEnd.getSeconds());

    return {
      academy_id,
      title: event.title,
      description: event.description,
      type: event.type,
      start_date: targetStart,
      end_date: targetEnd,
      start_time: event.start_time,
      end_time: event.end_time,
      location: event.location,
      sport_id: event.sport_id,
      organizer: event.organizer,
      banner: event.banner,
      attachment: event.attachment,
      priority: event.priority,
      reminder: event.reminder,
      visibility: event.visibility,
      notes: event.notes,
      block_attendance: event.block_attendance,
      block_performance: event.block_performance,
      is_custom: event.is_custom,
      color: event.color
    };
  });

  if (eventsToCreate.length > 0) {
    await prisma.calendarEvent.createMany({
      data: eventsToCreate
    });
  }
};

// Apply Weekly Off Rule for a specific month and year
export const applyWeeklyOffRule = async (academyId, year, month, rule) => {
  const academy_id = parseInt(academyId, 10);
  const targetYear = parseInt(year, 10);
  const targetMonth = parseInt(month, 10);

  const startOfMonth = new Date(targetYear, targetMonth, 1);
  const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

  // Delete existing WEEKLY_OFF events for this month
  await prisma.calendarEvent.deleteMany({
    where: {
      academy_id,
      type: 'WEEKLY_OFF',
      start_date: {
        gte: startOfMonth,
        lte: endOfMonth
      }
    }
  });

  if (rule === 'NONE') return;

  const eventsToCreate = [];
  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(targetYear, targetMonth, d);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    let isOff = false;
    if (rule === 'SUNDAY' && dayOfWeek === 0) {
      isOff = true;
    } else if (rule === 'SATURDAY_SUNDAY' && (dayOfWeek === 0 || dayOfWeek === 6)) {
      isOff = true;
    } else if (rule === 'FRIDAY' && dayOfWeek === 5) {
      isOff = true;
    }

    if (isOff) {
      eventsToCreate.push({
        academy_id,
        title: 'Weekly Off',
        description: 'Scheduled Weekly Off Day',
        type: 'WEEKLY_OFF',
        start_date: new Date(targetYear, targetMonth, d, 0, 0, 0),
        end_date: new Date(targetYear, targetMonth, d, 23, 59, 59),
        block_attendance: true,
        block_performance: true,
        color: '#f43f5e',
        priority: 'MEDIUM',
        visibility: 'ALL'
      });
    }
  }

  if (eventsToCreate.length > 0) {
    await prisma.calendarEvent.createMany({
      data: eventsToCreate
    });
  }
};


// ─── Batch Holiday Request Services ───────────────────────────────────────────

export const createBatchHolidayRequest = async (academyId, user, data) => {
  const { batch_id, date, reason } = data;
  const academy_id = parseInt(academyId, 10);
  const parsedBatchId = parseInt(batch_id, 10);
  const coach_id = user.coach_id;

  // Validate future date
  const requestDate = new Date(date);
  requestDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (requestDate <= today) {
    throw new Error('Batch off request date must be in the future.');
  }

  // Verify coach assignment
  const assignment = await prisma.batchCoach.findFirst({
    where: { coach_id, batch_id: parsedBatchId }
  });
  if (!assignment) {
    throw new Error('Coach is not assigned to this batch.');
  }

  return await prisma.batchHolidayRequest.create({
    data: {
      academy_id,
      coach_id,
      batch_id: parsedBatchId,
      date: requestDate,
      reason,
      status: 'PENDING'
    },
    include: {
      batch: { select: { name: true } }
    }
  });
};

export const getBatchHolidayRequests = async (academyId, user) => {
  const academy_id = parseInt(academyId, 10);
  const where = { academy_id };

  if (user.role === 'COACH') {
    where.coach_id = user.coach_id;
  }

  return await prisma.batchHolidayRequest.findMany({
    where,
    include: {
      coach: { select: { name: true, first_name: true, last_name: true } },
      batch: { select: { name: true, sport: { select: { name: true } } } }
    },
    orderBy: { created_at: 'desc' }
  });
};

export const approveBatchHolidayRequest = async (academyId, requestId) => {
  const id = parseInt(requestId, 10);
  const academy_id = parseInt(academyId, 10);

  const request = await prisma.batchHolidayRequest.findFirst({
    where: { request_id: id, academy_id },
    include: { batch: { select: { name: true } }, coach: { select: { coach_id: true } } }
  });

  if (!request) throw new Error('Request not found');
  if (request.status !== 'PENDING') throw new Error('Request is already processed.');

  // Update request status
  const updatedRequest = await prisma.batchHolidayRequest.update({
    where: { request_id: id },
    data: { status: 'APPROVED' }
  });

  // Create CalendarEvent for BATCH_HOLIDAY
  const start = new Date(request.date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(request.date);
  end.setHours(23, 59, 59, 999);

  await prisma.calendarEvent.create({
    data: {
      academy_id,
      title: `Batch Off: ${request.batch.name}`,
      description: `Approved Batch Off. Reason: ${request.reason}`,
      type: 'BATCH_HOLIDAY',
      start_date: start,
      end_date: end,
      batch_id: request.batch_id,
      coach_id: request.coach_id,
      block_attendance: true,
      block_performance: true,
      color: '#f43f5e',
      visibility: 'ALL'
    }
  });

  // Notify Coach
  await createNotification(academy_id, {
    type: 'GENERAL',
    title: 'Batch Off Request Approved',
    body: `Your request for Batch Off on ${new Date(request.date).toLocaleDateString()} for batch "${request.batch.name}" has been approved.`,
    coach_id: request.coach_id
  });

  // Notify Parents of student in that batch
  const students = await prisma.student.findMany({
    where: { batch_id: request.batch_id, is_deleted: false, parent_id: { not: null } },
    select: { parent_id: true }
  });
  const parentIds = [...new Set(students.map(s => s.parent_id))];
  for (const parentId of parentIds) {
    await createNotification(academy_id, {
      type: 'GENERAL',
      title: `Batch Declared OFF: ${request.batch.name}`,
      body: `The batch "${request.batch.name}" has been declared OFF for ${new Date(request.date).toLocaleDateString()}. Attendance and performance entry are unavailable.`,
      user_id: parentId
    });
  }

  return updatedRequest;
};

export const rejectBatchHolidayRequest = async (academyId, requestId, reason) => {
  const id = parseInt(requestId, 10);
  const academy_id = parseInt(academyId, 10);

  const request = await prisma.batchHolidayRequest.findFirst({
    where: { request_id: id, academy_id },
    include: { batch: { select: { name: true } } }
  });

  if (!request) throw new Error('Request not found');
  if (request.status !== 'PENDING') throw new Error('Request is already processed.');

  const updatedRequest = await prisma.batchHolidayRequest.update({
    where: { request_id: id },
    data: { status: 'REJECTED' }
  });

  // Notify Coach
  await createNotification(academy_id, {
    type: 'GENERAL',
    title: 'Batch Off Request Rejected',
    body: `Your request for Batch Off on ${new Date(request.date).toLocaleDateString()} for batch "${request.batch.name}" has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
    coach_id: request.coach_id
  });

  return updatedRequest;
};


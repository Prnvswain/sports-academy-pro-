import prisma from '../../config/prisma.js';

// ─── ROLE-BASED PERMISSION LOGIC ───────────────────────────────────────────────

const getSenderInfo = (user) => {
  if (user.role === 'SUPER_ADMIN') {
    return { sender_type: 'SUPER_ADMIN', sender_id: user.super_admin_id, academy_id: null };
  } else if (user.role === 'ACADEMY_ADMIN') {
    return { sender_type: 'ACADEMY_ADMIN', sender_id: user.user_id, academy_id: user.academy_id };
  } else if (user.role === 'COACH') {
    return { sender_type: 'COACH', sender_id: user.coach_id, academy_id: user.academy_id };
  }
  throw new Error('Unauthorized role for announcements');
};

const validateTargetPermission = (sender, targetType) => {
  if (sender.sender_type === 'SUPER_ADMIN') {
    // Super Admin can send to all academies, selected academies, academy admins
    const allowed = ['ALL_ACADEMIES', 'SELECTED_ACADEMIES', 'ACADEMY_ADMINS'];
    if (!allowed.includes(targetType)) {
      throw new Error('Super Admin can only send academy-level announcements');
    }
  } else if (sender.sender_type === 'ACADEMY_ADMIN') {
    // Academy Admin can send to coaches, parents, students, sports, batches
    const allowed = ['ALL_COACHES', 'SELECTED_COACHES', 'ALL_PARENTS', 'SELECTED_PARENTS', 
                     'ALL_STUDENTS', 'SELECTED_STUDENTS', 'BY_SPORT', 'BY_BATCH', 'INDIVIDUAL'];
    if (!allowed.includes(targetType)) {
      throw new Error('Academy Admin cannot send this type of announcement');
    }
  } else if (sender.sender_type === 'COACH') {
    // Coach can only send to parents of their assigned students
    const allowed = ['BY_BATCH', 'BY_SPORT', 'INDIVIDUAL_PARENT'];
    if (!allowed.includes(targetType)) {
      throw new Error('Coach can only send to parents of their assigned students');
    }
  }
};

// ─── RECIPIENT SELECTION LOGIC ─────────────────────────────────────────────────

const getRecipients = async (sender, targetType, targetIds, sportId, batchId) => {
  let recipients = [];

  if (sender.sender_type === 'SUPER_ADMIN') {
    if (targetType === 'ALL_ACADEMIES') {
      const academies = await prisma.academy.findMany({ where: { status: 'ACTIVE' } });
      recipients = academies.map(a => ({ type: 'ACADEMY', id: a.academy_id }));
    } else if (targetType === 'SELECTED_ACADEMIES' && targetIds?.length) {
      recipients = targetIds.map(id => ({ type: 'ACADEMY', id }));
    } else if (targetType === 'ACADEMY_ADMINS') {
      // Get all academy admins from selected academies
      const academyIds = targetIds?.length ? targetIds.map(t => t.id) : [];
      const admins = await prisma.admin.findMany({
        where: { 
          academy_id: { in: academyIds },
          is_deleted: false
        }
      });
      recipients = admins.map(a => ({ type: 'ACADEMY_ADMIN', id: a.user_id }));
    }
  } else if (sender.sender_type === 'ACADEMY_ADMIN') {
    const academy_id = sender.academy_id;

    if (targetType === 'ALL_COACHES') {
      const coaches = await prisma.coach.findMany({ 
        where: { academy_id, status: 'ACTIVE', is_deleted: false } 
      });
      recipients = coaches.map(c => ({ type: 'COACH', id: c.coach_id }));
    } else if (targetType === 'SELECTED_COACHES' && targetIds?.length) {
      recipients = targetIds.map(id => ({ type: 'COACH', id }));
    } else if (targetType === 'ALL_PARENTS') {
      const parents = await prisma.parent.findMany({ where: { academy_id, is_active: true } });
      recipients = parents.map(p => ({ type: 'PARENT', id: p.parent_id }));
    } else if (targetType === 'SELECTED_PARENTS' && targetIds?.length) {
      recipients = targetIds.map(id => ({ type: 'PARENT', id }));
    } else if (targetType === 'ALL_STUDENTS') {
      const students = await prisma.student.findMany({ 
        where: { academy_id, status: 'ACTIVE', is_deleted: false } 
      });
      recipients = students.map(s => ({ type: 'STUDENT', id: s.student_id }));
    } else if (targetType === 'SELECTED_STUDENTS' && targetIds?.length) {
      recipients = targetIds.map(id => ({ type: 'STUDENT', id }));
    } else if (targetType === 'BY_SPORT' && sportId) {
      const students = await prisma.student.findMany({ 
        where: { academy_id, sport_id, status: 'ACTIVE', is_deleted: false } 
      });
      // Get parents of these students
      const parentIds = students.filter(s => s.parent_id).map(s => s.parent_id);
      recipients = parentIds.map(id => ({ type: 'PARENT', id }));
    } else if (targetType === 'BY_BATCH' && batchId) {
      const students = await prisma.student.findMany({ 
        where: { academy_id, batch_id, status: 'ACTIVE', is_deleted: false } 
      });
      const parentIds = students.filter(s => s.parent_id).map(s => s.parent_id);
      recipients = parentIds.map(id => ({ type: 'PARENT', id }));
    } else if (targetType === 'INDIVIDUAL' && targetIds?.length) {
      // targetIds can be mix of coach_id, parent_id, student_id
      recipients = targetIds.map(item => ({ type: item.type, id: item.id }));
    }
  } else if (sender.sender_type === 'COACH') {
    const coach_id = sender.sender_id;
    const academy_id = sender.academy_id;

    // Get batches assigned to this coach
    const batchAssignments = await prisma.batchCoach.findMany({ 
      where: { coach_id },
      include: { batch: true }
    });
    const assignedBatchIds = batchAssignments.map(ba => ba.batch_id);

    if (targetType === 'BY_BATCH' && batchId) {
      if (!assignedBatchIds.includes(parseInt(batchId))) {
        throw new Error('Coach can only send to their assigned batches');
      }
      const students = await prisma.student.findMany({ 
        where: { academy_id, batch_id: parseInt(batchId), status: 'ACTIVE', is_deleted: false } 
      });
      const parentIds = students.filter(s => s.parent_id).map(s => s.parent_id);
      recipients = parentIds.map(id => ({ type: 'PARENT', id }));
    } else if (targetType === 'BY_SPORT' && sportId) {
      // Get students in this coach's batches with this sport
      const students = await prisma.student.findMany({ 
        where: { 
          academy_id, 
          sport_id, 
          batch_id: { in: assignedBatchIds },
          status: 'ACTIVE', 
          is_deleted: false 
        }
      });
      const parentIds = students.filter(s => s.parent_id).map(s => s.parent_id);
      recipients = parentIds.map(id => ({ type: 'PARENT', id }));
    } else if (targetType === 'INDIVIDUAL_PARENT' && targetIds?.length) {
      // Validate that parents have students in coach's batches
      for (const parentId of targetIds) {
        const parent = await prisma.parent.findUnique({ 
          where: { parent_id: parentId },
          include: { students: true }
        });
        const hasStudentInBatch = parent.students.some(s => 
          assignedBatchIds.includes(s.batch_id) && s.status === 'ACTIVE' && !s.is_deleted
        );
        if (hasStudentInBatch) {
          recipients.push({ type: 'PARENT', id: parentId });
        }
      }
    }
  }

  return recipients;
};

// ─── ANNOUNCEMENT CRUD OPERATIONS ─────────────────────────────────────────────

export const createAnnouncement = async (user, data) => {
  const { title, message, category, priority, target_type, target_ids, sport_id, batch_id, 
          scheduled_for, expires_at, attachments } = data;

  // Debug logging
  console.log('=== CREATE ANNOUNCEMENT DEBUG ===');
  console.log('User from JWT:', user);
  console.log('User role:', user?.role);
  console.log('User user_id:', user?.user_id);
  console.log('User coach_id:', user?.coach_id);
  console.log('User academy_id:', user?.academy_id);

  const sender = getSenderInfo(user);
  console.log('Sender info:', sender);

  validateTargetPermission(sender, target_type);

  const recipients = await getRecipients(sender, target_type, target_ids, sport_id, batch_id);

  console.log('Recipients generated:', recipients.length);
  console.log('Recipient details:', recipients);

  if (recipients.length === 0) {
    throw new Error('No valid recipients found for this announcement');
  }

  const announcementData = {
    title,
    message,
    category,
    priority: priority || 'NORMAL',
    target_type,
    scheduled_for: scheduled_for ? new Date(scheduled_for) : null,
    expires_at: expires_at ? new Date(expires_at) : null,
    status: scheduled_for ? 'SCHEDULED' : 'PUBLISHED',
    published_at: scheduled_for ? null : new Date(),
    total_recipients: recipients.length,
    sender_type: sender.sender_type,
    sender_id: sender.sender_id,
    academy_id: sender.academy_id || null
  };

  console.log('Announcement data before Prisma:', announcementData);

  const announcement = await prisma.announcement.create({
    data: announcementData
  });

  console.log('Announcement created with ID:', announcement.announcement_id);

  // Create recipients
  const recipientData = recipients.map(r => ({
    announcement_id: announcement.announcement_id,
    recipient_type: r.type,
    recipient_id_field: r.id,
    delivery_status: scheduled_for ? 'PENDING' : 'DELIVERED',
    delivered_at: scheduled_for ? null : new Date()
  }));

  console.log('Creating recipient records:', recipientData.length);
  await prisma.announcementRecipient.createMany({
    data: recipientData
  });
  console.log('Recipient records created successfully');

  // Create attachments if provided
  if (attachments && attachments.length > 0) {
    const attachmentData = attachments.map(att => ({
      announcement_id: announcement.announcement_id,
      file_name: att.fileName,
      file_url: att.url,
      file_type: att.type,
      file_size: att.size
    }));
    await prisma.announcementAttachment.createMany({ data: attachmentData });
  }

  // Initialize read status for all recipients
  const readStatusData = recipients.map(r => ({
    announcement_id: announcement.announcement_id,
    recipient_type: r.type,
    recipient_id: r.id
  }));
  await prisma.announcementReadStatus.createMany({ data: readStatusData });
  console.log('Read status records created successfully');

  // Update delivered count if published immediately
  if (!scheduled_for) {
    await prisma.announcement.update({
      where: { announcement_id: announcement.announcement_id },
      data: { delivered_count: recipients.length }
    });
  }

  console.log('=== ANNOUNCEMENT CREATION COMPLETE ===');
  return getAnnouncementById(announcement.announcement_id);
};

export const getAnnouncementById = async (announcement_id) => {
  const announcement = await prisma.announcement.findUnique({
    where: { announcement_id },
    include: {
      attachments: true,
      recipients: true,
      readStatuses: true
    }
  });

  if (!announcement) {
    throw new Error('Announcement not found');
  }

  return announcement;
};

export const getAnnouncements = async (user, filters = {}) => {
  console.log('=== GET ANNOUNCEMENTS DEBUG ===');
  console.log('User from JWT:', user);
  console.log('Filters:', filters);

  const { category, priority, status, sender_type, search, page = 1, limit = 20 } = filters;
  
  const sender = getSenderInfo(user);
  console.log('Sender info:', sender);

  const where = {};

  // ROLE-BASED ISOLATION FOR ANNOUNCEMENT LISTING
  if (sender.sender_type === 'SUPER_ADMIN') {
    // Super Admin sees ONLY announcements created by Super Admin
    where.sender_type = 'SUPER_ADMIN';
  } else if (sender.sender_type === 'ACADEMY_ADMIN') {
    // Academy Admin sees ONLY announcements from their academy (by Academy Admin or Coach)
    where.academy_id = sender.academy_id;
    // Exclude Super Admin announcements unless explicitly targeted
    where.sender_type = { in: ['ACADEMY_ADMIN', 'COACH'] };
  } else if (sender.sender_type === 'COACH') {
    // Coach sees ONLY announcements from their academy
    where.academy_id = sender.academy_id;
    where.sender_type = { in: ['ACADEMY_ADMIN', 'COACH'] };
  }

  if (category) where.category = category;
  if (priority) where.priority = priority;
  if (status) where.status = status;
  if (sender_type) where.sender_type = sender_type;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { message: { contains: search } }
    ];
  }

  console.log('Prisma where clause:', where);

  const [announcements, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      include: {
        attachments: true,
        recipients: true,
        readStatuses: true
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.announcement.count({ where })
  ]);

  console.log('Found announcements:', announcements.length);
  console.log('Total count:', total);

  return {
    announcements,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const updateAnnouncement = async (user, announcement_id, data) => {
  const sender = getSenderInfo(user);
  const announcement = await prisma.announcement.findUnique({
    where: { announcement_id }
  });

  if (!announcement) {
    throw new Error('Announcement not found');
  }

  // Permission check
  if (sender.sender_type === 'SUPER_ADMIN') {
    // Super Admin can edit any announcement
  } else if (sender.sender_type === 'ACADEMY_ADMIN') {
    if (announcement.academy_id !== sender.academy_id) {
      throw new Error('You can only edit your academy announcements');
    }
  } else if (sender.sender_type === 'COACH') {
    if (announcement.sender_type !== 'COACH' || announcement.sender_id !== sender.sender_id) {
      throw new Error('You can only edit your own announcements');
    }
  }

  // Can only edit draft or scheduled announcements
  if (announcement.status === 'PUBLISHED') {
    throw new Error('Cannot edit published announcements');
  }

  const { title, message, category, priority, scheduled_for, expires_at } = data;

  const updated = await prisma.announcement.update({
    where: { announcement_id },
    data: {
      title: title || announcement.title,
      message: message || announcement.message,
      category: category || announcement.category,
      priority: priority || announcement.priority,
      scheduled_for: scheduled_for ? new Date(scheduled_for) : announcement.scheduled_for,
      expires_at: expires_at ? new Date(expires_at) : announcement.expires_at,
      status: scheduled_for ? 'SCHEDULED' : announcement.status
    }
  });

  return getAnnouncementById(announcement_id);
};

export const deleteAnnouncement = async (user, announcement_id) => {
  const sender = getSenderInfo(user);
  const announcement = await prisma.announcement.findUnique({
    where: { announcement_id }
  });

  if (!announcement) {
    throw new Error('Announcement not found');
  }

  // Permission check
  if (sender.sender_type === 'SUPER_ADMIN') {
    // Super Admin can delete any announcement
  } else if (sender.sender_type === 'ACADEMY_ADMIN') {
    if (announcement.academy_id !== sender.academy_id) {
      throw new Error('You can only delete your academy announcements');
    }
  } else if (sender.sender_type === 'COACH') {
    if (announcement.sender_type !== 'COACH' || announcement.sender_id !== sender.sender_id) {
      throw new Error('You can only delete your own announcements');
    }
  }

  await prisma.announcement.delete({
    where: { announcement_id }
  });

  return { message: 'Announcement deleted successfully' };
};

export const archiveAnnouncement = async (user, announcement_id) => {
  const sender = getSenderInfo(user);
  const announcement = await prisma.announcement.findUnique({
    where: { announcement_id }
  });

  if (!announcement) {
    throw new Error('Announcement not found');
  }

  // Permission check
  if (sender.sender_type === 'SUPER_ADMIN') {
    // Super Admin can archive any announcement
  } else if (sender.sender_type === 'ACADEMY_ADMIN') {
    if (announcement.academy_id !== sender.academy_id) {
      throw new Error('You can only archive your academy announcements');
    }
  } else if (sender.sender_type === 'COACH') {
    if (announcement.sender_type !== 'COACH' || announcement.sender_id !== sender.sender_id) {
      throw new Error('You can only archive your own announcements');
    }
  }

  await prisma.announcement.update({
    where: { announcement_id },
    data: { status: 'ARCHIVED' }
  });

  return { message: 'Announcement archived successfully' };
};

// ─── RECIPIENT-SPECIFIC OPERATIONS ─────────────────────────────────────────────

export const getMyAnnouncements = async (user, filters = {}) => {
  console.log('=== GET MY ANNOUNCEMENTS DEBUG ===');
  console.log('User from JWT:', user);
  console.log('User role:', user?.role);
  console.log('User parent_id:', user?.parent_id);
  console.log('User academy_id:', user?.academy_id);
  
  const { unread_only, page = 1, limit = 20 } = filters;
  
  // Get recipient type and ID based on user role
  let recipientType, recipientId;

  if (user.role === 'ACADEMY_ADMIN') {
    recipientType = 'ACADEMY';
    recipientId = user.academy_id;
  } else if (user.role === 'COACH') {
    recipientType = 'COACH';
    recipientId = user.coach_id;
  } else if (user.role === 'PARENT') {
    recipientType = 'PARENT';
    recipientId = user.parent_id;
  }

  console.log('Recipient type:', recipientType);
  console.log('Recipient ID:', recipientId);

  if (!recipientType || !recipientId) {
    console.log('Missing recipient info, returning empty');
    return {
      announcements: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0
      }
    };
  }

  // Build where clause - ROLE-BASED ISOLATION FOR RECIPIENTS
  const where = {
    status: 'PUBLISHED',
    recipients: {
      some: {
        recipient_type: recipientType,
        recipient_id_field: recipientId
      }
    },
    OR: [
      { expires_at: null },
      { expires_at: { gt: new Date() } }
    ]
  };

  // Additional role-based filtering
  if (user.role === 'ACADEMY_ADMIN') {
    // Academy Admin should NOT see Super Admin announcements unless explicitly targeted
    where.sender_type = { in: ['ACADEMY_ADMIN', 'COACH'] };
  } else if (user.role === 'COACH') {
    // Coach should NOT see Super Admin announcements
    where.sender_type = { in: ['ACADEMY_ADMIN', 'COACH'] };
  } else if (user.role === 'PARENT') {
    // Parent should NOT see Super Admin announcements
    where.sender_type = { in: ['ACADEMY_ADMIN', 'COACH'] };
  }

  console.log('Prisma where clause:', JSON.stringify(where, null, 2));

  const [announcements, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      include: {
        attachments: true,
        readStatuses: {
          where: {
            recipient_type: recipientType,
            recipient_id: recipientId
          }
        }
      },
      orderBy: { published_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.announcement.count({ where })
  ]);

  console.log('Found announcements:', announcements.length);
  console.log('Total count:', total);

  // Filter unread if requested
  let filteredAnnouncements = announcements;
  if (unread_only) {
    filteredAnnouncements = announcements.filter(a => 
      a.readStatuses.length === 0 || !a.readStatuses[0].is_read
    );
  }

  return {
    announcements: filteredAnnouncements,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const markAsRead = async (user, announcement_id) => {
  let recipientType, recipientId;

  if (user.role === 'ACADEMY_ADMIN') {
    recipientType = 'ACADEMY';
    recipientId = user.academy_id;
  } else if (user.role === 'COACH') {
    recipientType = 'COACH';
    recipientId = user.coach_id;
  } else if (user.role === 'PARENT') {
    recipientType = 'PARENT';
    recipientId = user.parent_id;
  }

  const readStatus = await prisma.announcementReadStatus.upsert({
    where: {
      announcement_id_recipient_type_recipient_id: {
        announcement_id,
        recipient_type: recipientType,
        recipient_id: recipientId
      }
    },
    update: {
      is_read: true,
      read_at: new Date()
    },
    create: {
      announcement_id,
      recipient_type: recipientType,
      recipient_id: recipientId,
      is_read: true,
      read_at: new Date()
    }
  });

  // Update read count on announcement
  const readCount = await prisma.announcementReadStatus.count({
    where: { announcement_id, is_read: true }
  });
  await prisma.announcement.update({
    where: { announcement_id },
    data: { read_count: readCount }
  });

  return readStatus;
};

export const markAllAsRead = async (user) => {
  let recipientType, recipientId;

  if (user.role === 'ACADEMY_ADMIN') {
    recipientType = 'ACADEMY';
    recipientId = user.academy_id;
  } else if (user.role === 'COACH') {
    recipientType = 'COACH';
    recipientId = user.coach_id;
  } else if (user.role === 'PARENT') {
    recipientType = 'PARENT';
    recipientId = user.parent_id;
  }

  // Get all unread announcements for this recipient
  const unreadStatuses = await prisma.announcementReadStatus.findMany({
    where: {
      recipient_type: recipientType,
      recipient_id: recipientId,
      is_read: false,
      announcement: {
        status: 'PUBLISHED',
        OR: [
          { expires_at: null },
          { expires_at: { gt: new Date() } }
        ]
      }
    },
    include: {
      announcement: true
    }
  });

  // Mark all as read
  const now = new Date();
  for (const status of unreadStatuses) {
    await prisma.announcementReadStatus.update({
      where: { read_status_id: status.read_status_id },
      data: { is_read: true, read_at: now }
    });

    // Update read count on each announcement
    const readCount = await prisma.announcementReadStatus.count({
      where: { announcement_id: status.announcement_id, is_read: true }
    });
    await prisma.announcement.update({
      where: { announcement_id: status.announcement_id },
      data: { read_count: readCount }
    });
  }

  return { marked: unreadStatuses.length };
};

export const getUnreadCount = async (user) => {
  console.log('=== GET UNREAD COUNT DEBUG ===');
  console.log('User from JWT:', user);

  let recipientType, recipientId;

  if (user.role === 'SUPER_ADMIN') {
    // Super Admin doesn't receive announcements as a recipient
    return { count: 0 };
  } else if (user.role === 'ACADEMY_ADMIN') {
    recipientType = 'ACADEMY';
    recipientId = user.academy_id;
  } else if (user.role === 'COACH') {
    recipientType = 'COACH';
    recipientId = user.coach_id;
  } else if (user.role === 'PARENT') {
    recipientType = 'PARENT';
    recipientId = user.parent_id;
  } else {
    console.log('Unknown role:', user.role);
    return { count: 0 };
  }

  console.log('Recipient type:', recipientType);
  console.log('Recipient ID:', recipientId);

  if (!recipientType || !recipientId) {
    console.log('Missing recipient info, returning 0');
    return { count: 0 };
  }

  const count = await prisma.announcementReadStatus.count({
    where: {
      recipient_type: recipientType,
      recipient_id: recipientId,
      is_read: false,
      announcement: {
        status: 'PUBLISHED',
        OR: [
          { expires_at: null },
          { expires_at: { gt: new Date() } }
        ]
      }
    }
  });

  console.log('Unread count:', count);
  return { count };
};

export const getAnnouncementStats = async (user, announcement_id) => {
  const sender = getSenderInfo(user);
  const announcement = await prisma.announcement.findUnique({
    where: { announcement_id },
    include: {
      recipients: true,
      readStatuses: true
    }
  });

  if (!announcement) {
    throw new Error('Announcement not found');
  }

  // Permission check
  if (sender.sender_type === 'SUPER_ADMIN') {
    // Super Admin can view stats for any announcement
  } else if (sender.sender_type === 'ACADEMY_ADMIN') {
    if (announcement.academy_id !== sender.academy_id) {
      throw new Error('You can only view stats for your academy announcements');
    }
  } else if (sender.sender_type === 'COACH') {
    if (announcement.sender_type !== 'COACH' || announcement.sender_id !== sender.sender_id) {
      throw new Error('You can only view stats for your own announcements');
    }
  }

  const total = announcement.total_recipients;
  const delivered = announcement.delivered_count;
  const read = announcement.read_count;
  const unread = total - read;
  const readPercentage = total > 0 ? Math.round((read / total) * 100) : 0;

  return {
    total_recipients: total,
    delivered,
    read,
    unread,
    read_percentage: readPercentage
  };
};

// ─── SCHEDULING ─────────────────────────────────────────────────────────────────

export const publishScheduledAnnouncements = async () => {
  const now = new Date();
  const scheduled = await prisma.announcement.findMany({
    where: {
      status: 'SCHEDULED',
      scheduled_for: { lte: now }
    },
    include: {
      recipients: true
    }
  });

  for (const announcement of scheduled) {
    await prisma.announcement.update({
      where: { announcement_id: announcement.announcement_id },
      data: {
        status: 'PUBLISHED',
        published_at: now,
        delivered_count: announcement.recipients.length
      }
    });

    // Update recipients as delivered
    await prisma.announcementRecipient.updateMany({
      where: { announcement_id: announcement.announcement_id },
      data: {
        delivery_status: 'DELIVERED',
        delivered_at: now
      }
    });
  }

  return { published: scheduled.length };
};

export const expireAnnouncements = async () => {
  const now = new Date();
  const expired = await prisma.announcement.findMany({
    where: {
      status: 'PUBLISHED',
      expires_at: { lte: now }
    }
  });

  for (const announcement of expired) {
    await prisma.announcement.update({
      where: { announcement_id: announcement.announcement_id },
      data: { status: 'EXPIRED' }
    });
  }

  return { expired: expired.length };
};

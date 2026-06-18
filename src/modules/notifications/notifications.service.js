import prisma from '../../config/prisma.js';

export const createNotification = async (academy_id, data) => {
  const { type, title, body, user_id, coach_id, metadata } = data;

  const notification = await prisma.notification.create({
    data: {
      academy_id: academy_id ? parseInt(academy_id, 10) : null,
      user_id: user_id ? parseInt(user_id, 10) : null,
      coach_id: coach_id ? parseInt(coach_id, 10) : null,
      type,
      title,
      body,
      metadata: metadata ? JSON.stringify(metadata) : null
    }
  });

  return notification;
};

export const getNotifications = async (academy_id, user_id, coach_id) => {
  const where = {
    academy_id: academy_id ? parseInt(academy_id, 10) : null
  };

  if (user_id) {
    where.user_id = parseInt(user_id, 10);
  } else if (coach_id) {
    where.coach_id = parseInt(coach_id, 10);
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: 50
  });

  return notifications.map(n => ({
    ...n,
    metadata: n.metadata ? JSON.parse(n.metadata) : null
  }));
};

export const markAsRead = async (notification_id) => {
  const notification = await prisma.notification.update({
    where: { notification_id: parseInt(notification_id, 10) },
    data: { is_read: true }
  });

  return notification;
};

export const markAllAsRead = async (academy_id, user_id, coach_id) => {
  const where = {
    academy_id: academy_id ? parseInt(academy_id, 10) : null,
    is_read: false
  };

  if (user_id) {
    where.user_id = parseInt(user_id, 10);
  } else if (coach_id) {
    where.coach_id = parseInt(coach_id, 10);
  }

  const result = await prisma.notification.updateMany({
    where,
    data: { is_read: true }
  });

  return { count: result.count };
};

export const getUnreadCount = async (academy_id, user_id, coach_id) => {
  const where = {
    academy_id: academy_id ? parseInt(academy_id, 10) : null,
    is_read: false
  };

  if (user_id) {
    where.user_id = parseInt(user_id, 10);
  } else if (coach_id) {
    where.coach_id = parseInt(coach_id, 10);
  }

  const count = await prisma.notification.count({ where });

  return { count };
};

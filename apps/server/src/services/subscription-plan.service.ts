import { prisma } from '@school-syllabus/database';
import { AppError } from '../middleware/error-handler.js';
import { softDeleteFilter } from '../repositories/base.repository.js';

export const subscriptionPlanService = {
  async list() {
    return prisma.subscriptionPlan.findMany({
      where: softDeleteFilter(),
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { subscriptions: true } } },
    });
  },

  async getById(id: string) {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id, ...softDeleteFilter() },
    });
    if (!plan) throw new AppError('Plan not found', 404);
    return plan;
  },

  async create(data: {
    name: string;
    slug: string;
    description?: string;
    priceMonthly: number;
    priceYearly: number;
    teacherLimit: number;
    features?: string[];
  }) {
    return prisma.subscriptionPlan.create({
      data: {
        ...data,
        features: data.features ?? [],
      },
    });
  },

  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      priceMonthly: number;
      priceYearly: number;
      teacherLimit: number;
      features: string[];
      isActive: boolean;
      sortOrder: number;
    }>,
  ) {
    await this.getById(id);
    return prisma.subscriptionPlan.update({ where: { id }, data });
  },

  async toggleActive(id: string) {
    const plan = await this.getById(id);
    return prisma.subscriptionPlan.update({
      where: { id },
      data: { isActive: !plan.isActive },
    });
  },

  async softDelete(id: string) {
    await this.getById(id);
    return prisma.subscriptionPlan.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  },
};

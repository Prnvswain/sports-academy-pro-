import type { ChapterWorkflowStatus, SubscriptionStatus, UserRole } from './enums.js';

export interface SchoolEntity {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  address: string | null;
  logo: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherEntity {
  id: string;
  schoolId: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  subjectId: string;
  status: string;
}

export interface ChapterProgressEntity {
  id: string;
  schoolId: string;
  chapterId: string;
  teacherId: string;
  teachingCompleted: boolean;
  qaCompleted: boolean;
  copyChecked: boolean;
  chapterStatus: ChapterWorkflowStatus;
  completionPercentage: number;
  completedAt: string | null;
}

export interface TopicProgressEntity {
  status: string;
}

export interface TopicEntity {
  id: string;
  title: string;
  topicProgress?: TopicProgressEntity[];
}

export interface ChapterEntity {
  id: string;
  title: string;
  topics: TopicEntity[];
  chapterProgress?: ChapterProgressEntity[];
}

export interface SubjectDetailsEntity {
  id: string;
  name: string;
  chapters: ChapterEntity[];
  _count?: { chapters: number };
}

export interface TeacherAssignedClassEntity {
  id: string;
  name: string;
  grade: string | null;
  section: string | null;
  description: string | null;
  totalChapters: number;
  completedChapters: number;
  progress: number;
  _count: { subjects: number };
}

export interface ClassDetailsEntity {
  id: string;
  name: string;
  grade: string | null;
  section: string | null;
  description: string | null;
  overallProgress: number;
  totalChapters: number;
  completedChapters: number;
  subjects: SubjectDetailsEntity[];
}

export interface DashboardStats {
  totalTeachers: number;
  totalClasses: number;
  totalSubjects: number;
  totalChapters: number;
  completedChapters: number;
  pendingChapters: number;
  overallProgress: number;
  totalTopics?: number;
  completedTopics?: number;
  pendingTopics?: number;
  topicProgress?: number;
  chapterProgress?: number;
}

export interface SuperAdminDashboardStats {
  totalSchools: number;
  activeSchools: number;
  expiredSchools: number;
  monthlyRevenue: number;
  totalTeachers: number;
}

export interface UserEntity {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  schoolId: string | null;
  avatar: string | null;
  status: string;
}

export interface SubscriptionEntity {
  id: string;
  schoolId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
}

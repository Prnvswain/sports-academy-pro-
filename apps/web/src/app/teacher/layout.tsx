import { RoleGuard } from '@/components/auth/role-guard';
import { UserRole } from '@school-syllabus/types';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowed={[UserRole.TEACHER]}>{children}</RoleGuard>;
}

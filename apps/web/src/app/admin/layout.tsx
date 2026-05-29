import { RoleGuard } from '@/components/auth/role-guard';
import { UserRole } from '@school-syllabus/types';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowed={[UserRole.SCHOOL_ADMIN]}>{children}</RoleGuard>;
}

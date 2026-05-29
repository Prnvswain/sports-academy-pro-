import { RoleGuard } from '@/components/auth/role-guard';
import { UserRole } from '@school-syllabus/types';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowed={[UserRole.SUPER_ADMIN]}>{children}</RoleGuard>;
}

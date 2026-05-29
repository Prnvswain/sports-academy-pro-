'use client';

import { useAuthStore } from '@/store/auth-store';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminSettingsPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <DashboardShell title="Settings">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Name:</span> {user?.name}</p>
            <p><span className="text-muted-foreground">Email:</span> {user?.email}</p>
            <p><span className="text-muted-foreground">Role:</span> {user?.role?.replace('_', ' ')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>School</CardTitle>
            <CardDescription>Institution context</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            School ID: {user?.schoolId ?? '—'}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

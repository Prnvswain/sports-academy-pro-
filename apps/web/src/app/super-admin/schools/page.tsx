'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Search } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { api } from '@/services/api-client';
import { toast } from 'sonner';

interface School {
  id: string;
  name: string;
  email: string;
  status: string;
  slug: string;
  _count?: { teachers: number; users: number };
  subscriptions?: { status: string; plan: { name: string } }[];
}

export default function SuperAdminSchoolsPage() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['schools', search],
    queryFn: () => api.getPaginated<School>('/schools', { page: 1, pageSize: 50, search: search || undefined }),
  });

  const createSchool = useMutation({
    mutationFn: () => api.post('/schools', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schools'] });
      toast.success('School created');
      setOpen(false);
      setForm({ name: '', email: '', phone: '' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/schools/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schools'] });
      toast.success('Status updated');
    },
  });

  const schools = data?.items ?? [];

  return (
    <DashboardShell title="Schools">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search schools..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add school
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : schools.length === 0 ? (
        <EmptyState icon={Building2} title="No schools" description="Create your first school tenant." action={{ label: 'Add school', onClick: () => setOpen(true) }} />
      ) : (
        <Card className="divide-y">
          {schools.map((school) => (
            <div key={school.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">{school.name}</p>
                <p className="text-sm text-muted-foreground">{school.email}</p>
                <div className="mt-2 flex gap-2">
                  <Badge variant={school.status === 'ACTIVE' ? 'success' : 'warning'}>{school.status}</Badge>
                  <Badge variant="outline">{school._count?.teachers ?? 0} teachers</Badge>
                  {school.subscriptions?.[0] && (
                    <Badge variant="secondary">{school.subscriptions[0].plan.name}</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {school.status !== 'ACTIVE' && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: school.id, status: 'ACTIVE' })}>
                    Activate
                  </Button>
                )}
                {school.status === 'ACTIVE' && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: school.id, status: 'SUSPENDED' })}>
                    Suspend
                  </Button>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Create school</DialogTitle>
            <DialogDescription>Create a new tenant (school) on the platform.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <Button className="w-full" onClick={() => createSchool.mutate()} disabled={!form.name || !form.email}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

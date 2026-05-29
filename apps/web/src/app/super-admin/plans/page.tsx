'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/services/api-client';
import { toast } from 'sonner';

interface Plan {
  id: string;
  name: string;
  slug: string;
  priceMonthly: string;
  priceYearly: string;
  teacherLimit: number;
  isActive: boolean;
  _count?: { subscriptions: number };
}

export default function SuperAdminPlansPage() {
  const qc = useQueryClient();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get<Plan[]>('/plans'),
  });

  const toggle = useMutation({
    mutationFn: (id: string) => api.patch(`/plans/${id}/toggle`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan updated');
    },
  });

  return (
    <DashboardShell title="Subscription plans">
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.slug}</p>
                </div>
                <Badge variant={plan.isActive ? 'success' : 'secondary'}>{plan.isActive ? 'Active' : 'Inactive'}</Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>${Number(plan.priceMonthly).toFixed(2)}/mo · ${Number(plan.priceYearly).toFixed(2)}/yr</p>
                <p>{plan.teacherLimit} teachers max</p>
                <p className="text-muted-foreground">{plan._count?.subscriptions ?? 0} active subscriptions</p>
                <Button size="sm" variant="outline" onClick={() => toggle.mutate(plan.id)}>
                  {plan.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {!isLoading && plans.length === 0 && (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <CreditCard className="mb-4 h-12 w-12" />
          <p>No plans found. Run database seed.</p>
        </div>
      )}
    </DashboardShell>
  );
}

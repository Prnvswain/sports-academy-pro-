'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { api } from '@/services/api-client';
import { toast } from 'sonner';

interface UpdateMePayload {
  name?: string;
  phone?: string;
  currentPassword?: string;
  newPassword?: string;
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const profileMutation = useMutation({
    mutationFn: (data: UpdateMePayload) =>
      api.patch<{
        id: string;
        name: string;
        email: string;
        phone: string | null;
        role: string;
        schoolId: string | null;
      }>('/auth/me', data),
    onSuccess: (updated) => {
      setUser({ ...user!, name: updated.name, phone: updated.phone ?? undefined });
      toast.success('Profile updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const passwordMutation = useMutation({
    mutationFn: (data: UpdateMePayload) => api.patch('/auth/me', data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleProfileSave = () => {
    if (!name.trim()) return toast.error('Name is required');
    profileMutation.mutate({ name: name.trim(), phone: phone.trim() || undefined });
  };

  const handlePasswordChange = () => {
    if (!currentPassword) return toast.error('Current password is required');
    if (!newPassword) return toast.error('New password is required');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    passwordMutation.mutate({ currentPassword, newPassword });
  };

  return (
    <DashboardShell title="Settings">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Profile info (read-only) */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium">{user?.role?.replace('_', ' ')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Edit profile */}
        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>Update your name and phone number</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1-555-0100"
              />
            </div>
            <Button
              onClick={handleProfileSave}
              disabled={profileMutation.isPending}
              className="w-full"
            >
              {profileMutation.isPending ? 'Saving…' : 'Save profile'}
            </Button>
          </CardContent>
        </Card>

        {/* Change password */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Choose a strong password with uppercase, lowercase, number and special character
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 chars, uppercase, number, symbol"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />
            </div>
            <Button
              onClick={handlePasswordChange}
              disabled={passwordMutation.isPending}
              className="w-full"
              variant="outline"
            >
              {passwordMutation.isPending ? 'Updating…' : 'Change password'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

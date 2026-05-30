'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { api } from '@/services/api-client';
import { toast } from 'sonner';
import { CheckCircle2, Mail, KeyRound } from 'lucide-react';

type PasswordStep = 'idle' | 'otp-sent' | 'done';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');

  const [step, setStep] = useState<PasswordStep>('idle');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const profileMutation = useMutation({
    mutationFn: (data: { name?: string; phone?: string }) =>
      api.patch<{ id: string; name: string; email: string; phone: string | null }>(
        '/auth/me',
        data,
      ),
    onSuccess: (updated) => {
      setUser({ ...user!, name: updated.name, phone: updated.phone ?? undefined });
      toast.success('Profile updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendOtpMutation = useMutation({
    mutationFn: () => api.post<{ message: string }>('/auth/me/send-otp', {}),
    onSuccess: (res) => {
      setStep('otp-sent');
      toast.success(res.message);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const verifyOtpMutation = useMutation({
    mutationFn: (data: { otp: string; newPassword: string }) =>
      api.post('/auth/me/verify-otp', data),
    onSuccess: () => {
      setStep('done');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleProfileSave = () => {
    if (!name.trim()) return toast.error('Name is required');
    profileMutation.mutate({ name: name.trim(), phone: phone.trim() || undefined });
  };

  const handleVerifyOtp = () => {
    if (!otp || otp.length !== 6) return toast.error('Enter the 6-digit code');
    if (!newPassword) return toast.error('New password is required');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    verifyOtpMutation.mutate({ otp, newPassword });
  };

  return (
    <DashboardShell title="Settings">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Account info */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Role</span>
              <Badge variant="secondary">{user?.role?.replace('_', ' ')}</Badge>
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

        {/* Change password — OTP flow */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              We'll send a 6-digit verification code to <strong>{user?.email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 'idle' && (
              <Button
                onClick={() => sendOtpMutation.mutate()}
                disabled={sendOtpMutation.isPending}
                variant="outline"
                className="w-full"
              >
                <Mail className="mr-2 h-4 w-4" />
                {sendOtpMutation.isPending ? 'Sending code…' : 'Send verification code'}
              </Button>
            )}

            {step === 'otp-sent' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span>
                    Code sent to <strong>{user?.email}</strong>. Check your inbox.
                  </span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="otp">6-digit verification code</Label>
                  <Input
                    id="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="text-center font-mono text-lg tracking-widest"
                    maxLength={6}
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

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setStep('idle');
                      setOtp('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleVerifyOtp}
                    disabled={verifyOtpMutation.isPending}
                  >
                    <KeyRound className="mr-2 h-4 w-4" />
                    {verifyOtpMutation.isPending ? 'Verifying…' : 'Confirm & change'}
                  </Button>
                </div>

                <button
                  type="button"
                  onClick={() => sendOtpMutation.mutate()}
                  disabled={sendOtpMutation.isPending}
                  className="text-muted-foreground w-full text-center text-xs underline-offset-2 hover:underline"
                >
                  {sendOtpMutation.isPending ? 'Resending…' : 'Resend code'}
                </button>
              </div>
            )}

            {step === 'done' && (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
                <p className="font-medium text-gray-800">Password changed successfully</p>
                <p className="text-muted-foreground text-sm">Your new password is active.</p>
                <Button variant="outline" onClick={() => setStep('idle')} className="mt-2">
                  Change again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

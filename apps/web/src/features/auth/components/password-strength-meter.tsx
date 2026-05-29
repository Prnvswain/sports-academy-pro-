'use client';

import { cn } from '@/lib/utils';

const checks = [
  { test: (p: string) => p.length >= 8, label: '8+ characters' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'Uppercase' },
  { test: (p: string) => /[a-z]/.test(p), label: 'Lowercase' },
  { test: (p: string) => /\d/.test(p), label: 'Number' },
  { test: (p: string) => /[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/]/.test(p), label: 'Special' },
];

export function PasswordStrengthMeter({ password }: { password: string }) {
  const passed = checks.filter((c) => c.test(password)).length;
  const strength = password.length === 0 ? 0 : (passed / checks.length) * 100;

  const color =
    strength < 40 ? 'bg-red-500' : strength < 80 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="space-y-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full transition-all duration-300', color)}
          style={{ width: `${strength}%` }}
        />
      </div>
      <ul className="grid grid-cols-2 gap-1 text-xs">
        {checks.map((check) => (
          <li
            key={check.label}
            className={cn(
              check.test(password) ? 'text-emerald-600' : 'text-muted-foreground',
            )}
          >
            {check.test(password) ? '✓' : '○'} {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

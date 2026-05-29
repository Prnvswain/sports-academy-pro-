'use client';

import { Sidebar } from './sidebar';
import { Navbar } from './navbar';

export function DashboardShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#EEF2F8] text-gray-800">
      <div className="relative flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Navbar title={title} />
          <main className="flex-1 overflow-auto p-4 sm:p-6 bg-transparent">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

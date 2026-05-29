import Link from 'next/link';
import { Ban } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-0 bg-[#f0f4f8] p-6 text-center">
      {/* Card matching dashboard widget style */}
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-red-100 bg-white shadow-lg">
        {/* Red header bar — same pattern as delete dialog */}
        <div className="bg-gradient-to-r from-[#ea4335] to-[#c62828] px-6 py-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
            <Ban className="h-7 w-7 text-white" />
          </div>
        </div>

        <div className="px-6 py-6">
          <h1 className="text-xl font-bold text-gray-800">Access Denied</h1>
          <p className="mt-2 text-sm text-gray-500">
            You do not have permission to view this resource.
          </p>

          <Link
            href="/"
            className="
              mt-6 inline-flex w-full items-center justify-center
              rounded-lg bg-[#1a73e8] px-4 py-2.5
              text-sm font-semibold text-white shadow
              hover:bg-[#1558b0] active:scale-[0.98] transition-all
            "
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
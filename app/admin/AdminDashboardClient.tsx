'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Users, ImageIcon, Sparkles, Heart, Flag, ScrollText } from 'lucide-react';
import type { Profile, Report, ModerationLog, AppUser } from '@/types/database';
import clsx from 'clsx';

type Stats = {
  totalUsers: number;
  totalProfiles: number;
  activeProfiles: number;
  featuredProfiles: number;
  totalReactions: number;
  pendingReports: number;
};

const TABS = ['Users', 'Profiles', 'Reports', 'Moderation Logs'] as const;

export default function AdminDashboardClient({
  stats,
  reports,
  profiles,
  users,
  logs,
}: {
  stats: Stats;
  reports: Report[];
  profiles: Profile[];
  users: AppUser[];
  logs: ModerationLog[];
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Reports');
  const router = useRouter();

  async function callAction(payload: Record<string, unknown>) {
    const res = await fetch('/api/admin/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Action failed' }));
      toast.error(error ?? 'Action failed');
      return false;
    }
    toast.success('Done');
    router.refresh();
    return true;
  }

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users },
    { label: 'Total Profiles', value: stats.totalProfiles, icon: ImageIcon },
    { label: 'Active Profiles', value: stats.activeProfiles, icon: ImageIcon },
    { label: 'Featured', value: stats.featuredProfiles, icon: Sparkles },
    { label: 'Reactions', value: stats.totalReactions, icon: Heart },
    { label: 'Pending Reports', value: stats.pendingReports, icon: Flag },
  ];

  return (
    <div className="py-10">
      <h1 className="text-2xl font-semibold">Admin Panel</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-xl2 border border-white/5 bg-bg-card p-4">
            <s.icon className="h-4 w-4 text-accent-purple" />
            <p className="mt-2 text-2xl font-semibold">{s.value}</p>
            <p className="text-xs text-zinc-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-2 border-b border-white/5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition',
              tab === t ? 'border-accent-purple text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'Users' && (
          <Table
            headers={['Username', 'Role', 'Banned', 'Joined', 'Actions']}
            rows={users.map((u) => [
              u.username,
              u.role,
              u.is_banned ? 'Yes' : 'No',
              new Date(u.created_at).toLocaleDateString(),
              <div key={u.id} className="flex gap-2">
                {u.is_banned ? (
                  <ActionButton onClick={() => callAction({ action: 'unban_user', user_id: u.id })}>
                    Unban
                  </ActionButton>
                ) : (
                  <ActionButton
                    variant="danger"
                    onClick={() => callAction({ action: 'ban_user', user_id: u.id, notes: 'Banned via admin panel' })}
                  >
                    Ban
                  </ActionButton>
                )}
              </div>,
            ])}
          />
        )}

        {tab === 'Profiles' && (
          <Table
            headers={['Username', 'Status', 'Featured', 'Created', 'Actions']}
            rows={profiles.map((p) => [
              p.username,
              p.status,
              p.featured_until && new Date(p.featured_until) > new Date() ? 'Yes' : 'No',
              new Date(p.created_at).toLocaleDateString(),
              <div key={p.id} className="flex gap-2">
                {p.status === 'active' && (
                  <ActionButton onClick={() => callAction({ action: 'hide_profile', profile_id: p.id })}>
                    Hide
                  </ActionButton>
                )}
                {p.status === 'hidden' && (
                  <ActionButton onClick={() => callAction({ action: 'restore_profile', profile_id: p.id })}>
                    Restore
                  </ActionButton>
                )}
                {p.status !== 'deleted' && (
                  <ActionButton
                    variant="danger"
                    onClick={() => callAction({ action: 'delete_profile', profile_id: p.id })}
                  >
                    Delete
                  </ActionButton>
                )}
              </div>,
            ])}
          />
        )}

        {tab === 'Reports' && (
          <Table
            headers={['Reason', 'Status', 'Description', 'Created', 'Actions']}
            rows={reports.map((r) => [
              r.reason.replace('_', ' '),
              r.status,
              r.description ?? '—',
              new Date(r.created_at).toLocaleDateString(),
              <div key={r.id} className="flex gap-2">
                {r.status === 'pending' && (
                  <>
                    <ActionButton onClick={() => callAction({ action: 'resolve_report', report_id: r.id })}>
                      Resolve
                    </ActionButton>
                    <ActionButton
                      variant="ghost"
                      onClick={() => callAction({ action: 'dismiss_report', report_id: r.id })}
                    >
                      Dismiss
                    </ActionButton>
                  </>
                )}
              </div>,
            ])}
          />
        )}

        {tab === 'Moderation Logs' && (
          <Table
            headers={['Action', 'Target Type', 'Notes', 'When']}
            rows={logs.map((l) => [
              l.action.replace('_', ' '),
              l.target_type,
              l.notes ?? '—',
              new Date(l.created_at).toLocaleString(),
            ])}
          />
        )}
      </div>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl2 border border-white/5 bg-bg-card py-16 text-sm text-zinc-500">
        <ScrollText className="h-4 w-4" /> Nothing here yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl2 border border-white/5 bg-bg-card">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/5 text-xs uppercase text-zinc-500">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5 last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-zinc-300">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  variant = 'default',
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'ghost';
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'rounded-lg px-2.5 py-1 text-xs font-medium transition',
        variant === 'default' && 'bg-accent-purple/20 text-accent-purple hover:bg-accent-purple/30',
        variant === 'danger' && 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
        variant === 'ghost' && 'bg-white/5 text-zinc-400 hover:bg-white/10'
      )}
    >
      {children}
    </button>
  );
}

import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminDashboardClient from './AdminDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    redirect('/');
  }

  const supabase = createClient();

  const [
    { count: totalUsers },
    { count: totalProfiles },
    { count: activeProfiles },
    { count: featuredProfiles },
    { count: totalReactions },
    { count: pendingReports },
    { data: reports },
    { data: profiles },
    { data: users },
    { data: logs },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('status', 'deleted'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gt('featured_until', new Date().toISOString()),
    supabase.from('reactions').select('*', { count: 'exact', head: true }),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('reports').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('users').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('moderation_logs').select('*').order('created_at', { ascending: false }).limit(50),
  ]);

  return (
    <AdminDashboardClient
      stats={{
        totalUsers: totalUsers ?? 0,
        totalProfiles: totalProfiles ?? 0,
        activeProfiles: activeProfiles ?? 0,
        featuredProfiles: featuredProfiles ?? 0,
        totalReactions: totalReactions ?? 0,
        pendingReports: pendingReports ?? 0,
      }}
      reports={reports ?? []}
      profiles={profiles ?? []}
      users={users ?? []}
      logs={logs ?? []}
    />
  );
}

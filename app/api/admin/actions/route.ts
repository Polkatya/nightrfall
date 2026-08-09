import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient, getCurrentUser } from '@/lib/supabase/server';

type ActionBody =
  | { action: 'hide_profile'; profile_id: string; notes?: string }
  | { action: 'restore_profile'; profile_id: string; notes?: string }
  | { action: 'delete_profile'; profile_id: string; notes?: string }
  | { action: 'ban_user'; user_id: string; notes?: string }
  | { action: 'unban_user'; user_id: string; notes?: string }
  | { action: 'resolve_report'; report_id: string; notes?: string }
  | { action: 'dismiss_report'; report_id: string; notes?: string };

export async function POST(req: NextRequest) {
  // Resolve the acting user from the server session, then verify admin role
  // server-side — the client can never grant itself admin.
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as ActionBody | null;
  if (!body || !body.action) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const admin = createAdminClient();
  const notes = 'notes' in body && typeof body.notes === 'string' ? body.notes.slice(0, 500) : null;

  try {
    switch (body.action) {
      case 'hide_profile': {
        await admin.from('profiles').update({ status: 'hidden' }).eq('id', body.profile_id);
        await logAction(admin, currentUser.id, 'hide_profile', 'profile', body.profile_id, notes);
        break;
      }
      case 'restore_profile': {
        await admin.from('profiles').update({ status: 'active' }).eq('id', body.profile_id);
        await logAction(admin, currentUser.id, 'restore_profile', 'profile', body.profile_id, notes);
        break;
      }
      case 'delete_profile': {
        await admin.from('profiles').update({ status: 'deleted' }).eq('id', body.profile_id);
        await logAction(admin, currentUser.id, 'delete_profile', 'profile', body.profile_id, notes);
        break;
      }
      case 'ban_user': {
        await admin
          .from('users')
          .update({ is_banned: true, banned_reason: notes })
          .eq('id', body.user_id);
        await logAction(admin, currentUser.id, 'ban_user', 'user', body.user_id, notes);
        break;
      }
      case 'unban_user': {
        await admin
          .from('users')
          .update({ is_banned: false, banned_reason: null })
          .eq('id', body.user_id);
        await logAction(admin, currentUser.id, 'unban_user', 'user', body.user_id, notes);
        break;
      }
      case 'resolve_report': {
        await admin
          .from('reports')
          .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: currentUser.id })
          .eq('id', body.report_id);
        await logAction(admin, currentUser.id, 'resolve_report', 'report', body.report_id, notes);
        break;
      }
      case 'dismiss_report': {
        await admin
          .from('reports')
          .update({ status: 'dismissed', resolved_at: new Date().toISOString(), resolved_by: currentUser.id })
          .eq('id', body.report_id);
        await logAction(admin, currentUser.id, 'dismiss_report', 'report', body.report_id, notes);
        break;
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

async function logAction(
  admin: ReturnType<typeof createAdminClient>,
  adminId: string,
  action: string,
  targetType: 'profile' | 'user' | 'report',
  targetId: string,
  notes: string | null
) {
  await admin.from('moderation_logs').insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    notes,
  });
}

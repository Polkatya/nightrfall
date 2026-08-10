export type ReportReason =
  | 'inappropriate_content'
  | 'underage'
  | 'impersonation'
  | 'harassment'
  | 'spam'
  | 'other';

export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';
export type ProfileStatus = 'pending' | 'active' | 'hidden' | 'deleted';
export type MediaType = 'image' | 'video';

export interface AppUser {
  id: string;
  username: string;
  role: 'user' | 'admin';
  is_banned: boolean;
  created_at: string;
}

export interface ProfileMedia {
  id: string;
  profile_id: string;
  media_path: string;
  media_type: MediaType;
  position: number;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  bio: string | null;
  image_path: string;
  tags: string[];
  status: ProfileStatus;
  featured_until: string | null;
  age_confirmed: boolean;
  created_at: string;
  updated_at: string;
  reaction_count?: number;
  like_count?: number;
  dislike_count?: number;
  impression_count?: number;
  view_count?: number;
  media_count?: number;
  comment_count?: number;
  is_featured?: boolean;
  reacted_by_me?: boolean;
  my_reaction?: ReactionType | null;
}

export interface Comment {
  id: string;
  profile_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username?: string; // joined in from users when listing
}

export type ReactionType = 'like' | 'dislike';

export interface Reaction {
  id: string;
  profile_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface Report {
  id: string;
  profile_id: string;
  reporter_id: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface ModerationLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: 'profile' | 'user' | 'report';
  target_id: string;
  notes: string | null;
  created_at: string;
}

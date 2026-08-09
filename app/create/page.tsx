'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { UploadCloud, X, Film, Image as ImageIcon, Clock } from 'lucide-react';
import clsx from 'clsx';
import AdBanner from '@/components/ads/AdBanner';
import { compressImage } from '@/lib/image-compress';

const DURATIONS = [
  { value: '0.5', label: '30 minutes' },
  { value: '1', label: '1 hour' },
  { value: '6', label: '6 hours' },
  { value: '12', label: '12 hours' },
  { value: '24', label: '24 hours (max)' },
];

const MAX_ITEMS = 10;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];

type PendingItem = {
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
};

export default function CreateProfilePage() {
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [duration, setDuration] = useState('0.5');
  const [items, setItems] = useState<PendingItem[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedUsername, setSubmittedUsername] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const incoming = Array.from(fileList);

    if (items.length + incoming.length > MAX_ITEMS) {
      toast.error(`You can add up to ${MAX_ITEMS} photos/videos total`);
      return;
    }

    const accepted: PendingItem[] = [];
    for (const file of incoming) {
      if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
        // Compress first, then check size — this lets large-but-compressible
        // photos through instead of rejecting them outright.
        const compressed = await compressImage(file);
        if (compressed.size > MAX_IMAGE_SIZE) {
          toast.error(`${file.name}: still over 5MB after compression`);
          continue;
        }
        accepted.push({ file: compressed, previewUrl: URL.createObjectURL(compressed), type: 'image' });
      } else if (ALLOWED_VIDEO_TYPES.includes(file.type)) {
        if (file.size > MAX_VIDEO_SIZE) {
          toast.error(`${file.name}: videos must be under 50MB`);
          continue;
        }
        accepted.push({ file, previewUrl: URL.createObjectURL(file), type: 'video' });
      } else {
        toast.error(`${file.name}: unsupported file type`);
      }
    }

    setItems((prev) => [...prev, ...accepted]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 8) {
      setTags([...tags, t]);
    }
    setTagInput('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (items.length === 0) return toast.error('Please add at least one photo or video');
    if (!confirmed) return toast.error('You must confirm the 18+ / rights statement');
    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 32 || /[\/\r\n]/.test(trimmedUsername)) {
      return toast.error('Username must be 3-32 characters and can\'t contain "/" or line breaks');
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload every file first, keep track of their storage paths in order.
      const uploaded: { path: string; type: 'image' | 'video' }[] = [];
      for (const item of items) {
        const ext = item.file.name.split('.').pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('profile-images')
          .upload(path, item.file, { contentType: item.file.type, upsert: false });
        if (uploadError) throw uploadError;
        uploaded.push({ path, type: item.type });
      }

      const featured_until = duration
        ? new Date(Date.now() + Number(duration) * 3600 * 1000).toISOString()
        : null;

      // image_path stores the cover (first item) for feed thumbnails.
      const { data: profile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          username: trimmedUsername,
          bio: bio || null,
          image_path: uploaded[0].path,
          tags,
          age_confirmed: true,
          featured_until,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      const { error: mediaError } = await supabase.from('profile_media').insert(
        uploaded.map((u, i) => ({
          profile_id: profile.id,
          media_path: u.path,
          media_type: u.type,
          position: i,
        }))
      );
      if (mediaError) throw mediaError;

      // Best-effort: tell the moderation bot. Failure here shouldn't block
      // the user — the profile still exists as pending either way.
      fetch('/api/telegram/notify-new-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profile.id }),
      }).catch(() => null);

      toast.success('Profile submitted for review');
      setSubmittedUsername(trimmedUsername);
    } catch (err: any) {
      if (/PROFILE_LIMIT_REACHED/.test(err.message ?? '')) {
        toast.error('You already have a profile. Delete it from My Profiles first if you want to create a new one.');
      } else {
        toast.error(err.message ?? 'Could not create profile');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg py-12">
      <h1 className="text-2xl font-semibold">Create your profile</h1>
      <p className="mt-1 text-sm text-zinc-400">This will be visible to the community.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label className="mb-1 block text-xs text-zinc-400">
            Photos & videos ({items.length}/{MAX_ITEMS})
          </label>

          {items.length > 0 && (
            <div className="mb-3 grid grid-cols-3 gap-2">
              {items.map((item, i) => (
                <div
                  key={i}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-bg-card"
                >
                  {item.type === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <video src={item.previewUrl} className="h-full w-full object-cover" muted />
                  )}
                  <div className="absolute left-1 top-1 rounded bg-black/60 p-1">
                    {item.type === 'video' ? (
                      <Film className="h-3 w-3 text-white" />
                    ) : (
                      <ImageIcon className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="absolute right-1 top-1 rounded-full bg-black/70 p-1 opacity-0 transition group-hover:opacity-100"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 rounded bg-accent-purple/80 px-1.5 py-0.5 text-[9px] font-medium text-white">
                      Cover
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {items.length < MAX_ITEMS && (
            <label className="flex aspect-[3/2] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl2 border-2 border-dashed border-white/10 bg-bg-card text-zinc-500 transition hover:border-accent-purple">
              <UploadCloud className="h-6 w-6" />
              <span className="text-sm">JPG, PNG, WebP (5MB) or MP4, WebM (50MB)</span>
              <span className="text-xs text-zinc-600">Up to {MAX_ITEMS} total — first one is the cover</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-400">Username</label>
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-bg-card px-3 py-2.5 text-sm outline-none focus:border-accent-purple"
            placeholder="yourname"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-400">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            rows={4}
            className="w-full resize-none rounded-lg border border-white/10 bg-bg-card px-3 py-2.5 text-sm outline-none focus:border-accent-purple"
            placeholder="Tell the community about yourself…"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-400">Tags (up to 8)</label>
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              className="flex-1 rounded-lg border border-white/10 bg-bg-card px-3 py-2.5 text-sm outline-none focus:border-accent-purple"
              placeholder="Add a tag and press Enter"
            />
            <button
              type="button"
              onClick={addTag}
              className="rounded-lg bg-white/10 px-4 text-sm text-zinc-200 hover:bg-white/20"
            >
              Add
            </button>
          </div>
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-200"
                >
                  {t}
                  <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-400">Featured duration</label>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-bg-card px-3 py-2.5 text-sm outline-none focus:border-accent-purple"
          >
            {DURATIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-start gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-white/20 bg-bg-card accent-accent-purple"
          />
          I confirm that I am 18+ and that I have the right to publish this profile and its media.
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-grad-primary py-3 text-sm font-medium text-white shadow-glow transition hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Publishing…' : 'Publish profile'}
        </button>
      </form>

      {submittedUsername && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-xl2 bg-bg-card p-5 text-center shadow-card">
            <div className="mb-4 flex justify-center">
              <AdBanner />
            </div>

            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent-purple/15">
              <Clock className="h-6 w-6 text-accent-purple" />
            </div>
            <h3 className="text-base font-semibold">Your profile is under review</h3>
            <p className="mt-2 text-sm text-zinc-400">
              It will go live once approved by moderation. This usually takes 2 to 30 minutes.
            </p>

            <button
              onClick={() => {
                router.push(`/profile/${submittedUsername}`);
                router.refresh();
              }}
              className="mt-5 w-full rounded-lg bg-grad-primary py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Got it
            </button>

            <div className="mt-4 flex justify-center">
              <AdBanner />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

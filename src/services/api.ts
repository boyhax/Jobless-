/**
 * ProSync API SDK
 * All server communication goes through this module.
 * Built on top of fetchAPI which handles auth headers and error handling.
 */
import { fetchAPI } from '../lib/utils';

const uid = (id: string | number) => encodeURIComponent(String(id));

// ─── Auth ────────────────────────────────────────────────────────────────────
export const auth = {
  checkEmail: (email: string) =>
    fetchAPI('/api/auth/check-email', { method: 'POST', body: JSON.stringify({ email }) }),

  login: (email: string, password: string) =>
    fetchAPI('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  register: (email: string, password: string, full_name: string) =>
    fetchAPI('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password, full_name }) }),

  forgotPassword: (email: string) =>
    fetchAPI('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  verifyOtp: (email: string, otp: string) =>
    fetchAPI('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) }),

  resetPassword: (email: string, otp: string, newPassword: string) =>
    fetchAPI('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, otp, newPassword }) }),

  me: () =>
    fetchAPI('/api/auth/me'),
};

// ─── Setup ───────────────────────────────────────────────────────────────────
export const setup = {
  status: () =>
    fetchAPI('/api/setup/status'),

  init: (data: { email: string; password: string; fullName: string; seed: boolean }) =>
    fetchAPI('/api/setup/init', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── Posts / Feed ─────────────────────────────────────────────────────────────
export const posts = {
  feed: () =>
    fetchAPI('/api/content'),

  create: (data: {
    user_id: string | number;
    content: string;
    attachment_type?: string | null;
    attachment_id?: string | number | null;
    quiz_data?: any;
    poll_data?: any;
  }) =>
    fetchAPI('/api/posts', { method: 'POST', body: JSON.stringify(data) }),

  update: (postId: string | number, content: string) =>
    fetchAPI(`/api/posts/${postId}`, { method: 'PUT', body: JSON.stringify({ content }) }),

  delete: (postId: string | number) =>
    fetchAPI(`/api/posts/${postId}`, { method: 'DELETE' }),

  respond: (postId: string | number, user_id: string | number, type: 'quiz' | 'poll', response_index: number) =>
    fetchAPI(`/api/posts/${postId}/respond`, { method: 'POST', body: JSON.stringify({ user_id, type, response_index }) }),
};

// ─── Comments ────────────────────────────────────────────────────────────────
export const comments = {
  list: (postId: string | number) =>
    fetchAPI(`/api/posts/${postId}/comments`),

  create: (post_id: string | number, user_id: string | number, content: string) =>
    fetchAPI('/api/comments', { method: 'POST', body: JSON.stringify({ user_id, post_id, content }) }),
};

// ─── Search ───────────────────────────────────────────────────────────────────
export const search = {
  all: (q: string, type?: string) =>
    fetchAPI(`/api/search?q=${encodeURIComponent(q)}&type=${type || 'all'}`),
};

// ─── Jobs ─────────────────────────────────────────────────────────────────────
export const jobs = {
  list: (filters: { q?: string; experience?: string; minSalary?: string; placeId?: string } = {}) => {
    const query = new URLSearchParams();
    if (filters.q) query.set('q', filters.q);
    if (filters.experience && filters.experience !== 'all') query.set('experience', filters.experience);
    if (filters.minSalary) query.set('minSalary', filters.minSalary);
    if (filters.placeId && filters.placeId !== 'all') query.set('placeId', filters.placeId);
    return fetchAPI(`/api/jobs?${query.toString()}`);
  },

  create: (data: { user_id: string | number; company_name: string; title: string; location?: string; description: string; salary_range?: string; experience_level?: string; end_date?: string }) =>
    fetchAPI('/api/jobs', { method: 'POST', body: JSON.stringify(data) }),

  apply: (user_id: string | number, job_id: string | number, attachment_type: string, attachment_id?: string | number | null) =>
    fetchAPI('/api/jobs/apply', { method: 'POST', body: JSON.stringify({ user_id, job_id, attachment_type, attachment_id }) }),

  applicants: (jobId: string | number) =>
    fetchAPI(`/api/jobs/${jobId}/applicants`),

  updateApplicationStatus: (applicationId: number, status: string) =>
    fetchAPI('/api/jobs/applications/status', { method: 'POST', body: JSON.stringify({ applicationId, status }) }),
};

// ─── Profile ──────────────────────────────────────────────────────────────────
export const profile = {
  get: (userId: string | number, viewerId?: string | number) => {
    const id = uid(userId);
    const viewer = viewerId ? `?viewerId=${uid(viewerId)}` : '';
    return fetchAPI(`/api/profile/${id}${viewer}`);
  },

  update: (user_id: string | number, data: { headline?: string; bio?: string; avatar_url?: string; company_name?: string; company_description?: string; company_website?: string }) =>
    fetchAPI('/api/profile', { method: 'PUT', body: JSON.stringify({ user_id, ...data }) }),
};

// ─── CV ───────────────────────────────────────────────────────────────────────
export const cv = {
  add: (user_id: string | number, data: { type: string; title: string; subtitle?: string; description?: string; start_date?: string; end_date?: string; verification_url?: string; keywords?: string }) =>
    fetchAPI('/api/cv', { method: 'POST', body: JSON.stringify({ user_id, ...data }) }),
};

// ─── Skills ───────────────────────────────────────────────────────────────────
export const skills = {
  add: (user_id: string | number, data: { name: string; proficiency?: number; verification_url?: string }) =>
    fetchAPI('/api/skills', { method: 'POST', body: JSON.stringify({ user_id, ...data }) }),

  verify: (user_id: string | number, name: string, verification_url: string) =>
    fetchAPI('/api/skills/verify', { method: 'POST', body: JSON.stringify({ user_id, name, verification_url }) }),
};

// ─── Portfolio ────────────────────────────────────────────────────────────────
export const portfolio = {
  add: (user_id: string | number, data: { title: string; url: string; description?: string; thumbnail_url?: string }) =>
    fetchAPI('/api/portfolio', { method: 'POST', body: JSON.stringify({ user_id, ...data }) }),
};

// ─── Connections ──────────────────────────────────────────────────────────────
export const connections = {
  status: (userId: string | number, targetId: string | number) =>
    fetchAPI(`/api/connections/status/${uid(userId)}/${uid(targetId)}`),

  create: (user_id: string | number, target_id: string | number) =>
    fetchAPI('/api/connections', { method: 'POST', body: JSON.stringify({ user_id, target_id }) }),

  remove: (userId: string | number, targetId: string | number) =>
    fetchAPI(`/api/connections/${uid(userId)}/${uid(targetId)}`, { method: 'DELETE' }),
};

// ─── Messages ─────────────────────────────────────────────────────────────────
export const messages = {
  conversations: (userId: string | number) =>
    fetchAPI(`/api/messages/conversations/${uid(userId)}`),

  thread: (userId: string | number, targetId: string | number) =>
    fetchAPI(`/api/messages/${uid(userId)}/${uid(targetId)}`),

  send: (sender_id: string | number, receiver_id: string | number, content: string) =>
    fetchAPI('/api/messages', { method: 'POST', body: JSON.stringify({ sender_id, receiver_id, content }) }),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = {
  list: () =>
    fetchAPI('/api/notifications'),

  markRead: (notificationId: number | string) =>
    fetchAPI('/api/notifications/read', { method: 'POST', body: JSON.stringify({ notificationId }) }),
};

// ─── Files ────────────────────────────────────────────────────────────────────
export const files = {
  list: (userId: string | number, purpose?: string) => {
    const base = `/api/files/${uid(userId)}`;
    return fetchAPI(purpose ? `${base}?purpose=${encodeURIComponent(purpose)}` : base);
  },

  upload: (user_id: string | number, name: string, url: string, type: string, purpose: string) =>
    fetchAPI('/api/files', { method: 'POST', body: JSON.stringify({ user_id, name, url, type, purpose }) }),

  delete: (fileId: string | number) =>
    fetchAPI(`/api/files/${fileId}`, { method: 'DELETE' }),
};

// ─── Job Alerts ───────────────────────────────────────────────────────────────
export const jobAlerts = {
  list: (userId: string | number) =>
    fetchAPI(`/api/job-alerts/${uid(userId)}`),

  create: (user_id: string | number, data: { keyword: string; experience_level?: string; location?: string }) =>
    fetchAPI('/api/job-alerts', { method: 'POST', body: JSON.stringify({ user_id, ...data }) }),

  delete: (alertId: string | number) =>
    fetchAPI(`/api/job-alerts/${alertId}`, { method: 'DELETE' }),
};

// ─── Candidates & Recommendations ────────────────────────────────────────────
export const candidates = {
  list: (skills?: string) =>
    fetchAPI(`/api/candidates?skills=${encodeURIComponent(skills || '')}`),
};

export const recommendations = {
  get: (userId?: string | number) =>
    fetchAPI(userId ? `/api/recommendations/${uid(userId)}` : '/api/recommendations'),
};

// ─── Places & Topics ──────────────────────────────────────────────────────────
export const places = {
  list: () => fetchAPI('/api/places'),
};

export const topics = {
  list: () => fetchAPI('/api/topics'),
};

// ─── User Preferences ─────────────────────────────────────────────────────────
export const userPrefs = {
  setPlace: (user_id: string | number, place_id: string) =>
    fetchAPI('/api/user/preference/place', { method: 'POST', body: JSON.stringify({ user_id, place_id }) }),
};

// ─── AI ───────────────────────────────────────────────────────────────────────
export const ai = {
  rankJobs: (jobs: any[], query: string) =>
    fetchAPI('/api/ai/rank-jobs', { method: 'POST', body: JSON.stringify({ jobs, query }) }),

  shortlistApplicants: (jobDescription: string, applicants: any[]) =>
    fetchAPI('/api/ai/shortlist-applicants', { method: 'POST', body: JSON.stringify({ jobDescription, applicants }) }),

  generateInteractive: (topic: string, type: 'quiz' | 'poll') =>
    fetchAPI('/api/ai/interactive', { method: 'POST', body: JSON.stringify({ topic, type }) }),

  magicBio: (bio: string, instruction: string) =>
    fetchAPI('/api/ai/magic-bio', { method: 'POST', body: JSON.stringify({ bio, instruction }) }),
};

// ─── Generic Admin-Capable Resources ─────────────────────────────────────────
export const system = {
  analytics: () => fetchAPI('/api/analytics'),

  seed: () => fetchAPI('/api/system/seed', { method: 'POST' }),

  seedJobs: () => fetchAPI('/api/system/seed-jobs', { method: 'POST' }),
};

export const users = {
  list: () => fetchAPI('/api/users'),

  updateSubscription: (userId: string | number, subscription: string) =>
    fetchAPI('/api/users/subscription', { method: 'POST', body: JSON.stringify({ userId, subscription }) }),
};

// Compatibility alias for old callers. Prefer `system` + `users` in new code.
export const admin = {
  analytics: system.analytics,
  users: users.list,
  seed: system.seed,
  seedJobs: system.seedJobs,
  updateSubscription: users.updateSubscription,
};

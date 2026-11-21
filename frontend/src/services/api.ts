import type { ApiDiaryEntry, DashboardApiResponse } from '@/types';
import type { AuthUser } from '@/components/auth-provider';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '');

export class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly requestId?: string, public readonly url?: string) {
    super(message);
  }
}

export type AuthMeResponse = { success: true; data: { user: AuthUser } };
export type Beneficiary = {
  id: string;
  fullName: string;
  email: string;
  relationship: string;
  status: string;
};
export type AccessPolicy = {
  id: string;
  name: string;
  status: string;
  sourceCode: string;
  beneficiary: { id: string; fullName: string; email: string };
};
export type ActivityLog = {
  id: string;
  action: string;
  resourceType: string;
  result: string;
  createdAt: string;
};
export type AssistantCitation = { id: string; title: string; entryDate: string; sourceType?: 'DIARY_ENTRY' | 'LETTER_OF_WISHES' | 'FILE_METADATA'; sourceLabel?: string; href?: string };
export type AssistantReply = {
  conversationId: string;
  message: { id: string; role: 'ASSISTANT'; content: string; citations: AssistantCitation[] };
};
export type NotificationItem = { id: string; type: 'COUNTDOWN' | 'REMINDER' | 'REVISION_READY' | 'SECURITY' | 'SYSTEM'; title: string; body: string; link: string | null; isRead: boolean; readAt: string | null; createdAt: string };
export type Profile = { id: string; fullName: string; email: string; bio: string | null; avatarUrl: string | null; timezone: string; notificationPreferences: { countdown: boolean; reminder: boolean; revision_ready: boolean; system: boolean }; createdAt: string; updatedAt: string };
export type UserFileCategory = 'photo' | 'document' | 'credential';
export type UserFile = { id: string; driveFileId: string; name: string; mime: string; size: string; category: UserFileCategory; createdAt: string };
export type UserPlaylist = { id: string; kind?: 'playlist' | 'video'; youtubePlaylistId: string | null; youtubeVideoId?: string | null; startSeconds?: number | null; title: string; position: number; createdAt: string };
export type LegacyBeneficiary = { id: string; fullName: string; email: string; relationship: string | null; status: string; verifiedAt?: string | null; createdAt?: string };
export type LegacyPolicyResource = { resourceType: 'FILE' | 'PLAYLIST' | 'WISHES'; resourceId: string };
export type LegacyResourceCatalogItem = LegacyPolicyResource & { title: string; detail: string };
export type LegacyPolicy = { id: string; name: string; description: string | null; status: string; beneficiaryId: string; beneficiary: LegacyBeneficiary; scopeType: string; scopeCategories: string[] | null; scopeDateFrom: string | null; scopeDateTo: string | null; excludedEntryIds: string[]; entryLinks: { entryId: string }[]; resources: LegacyPolicyResource[]; releaseMethod: string; releaseAt: string | null; coolingOffDays: number; expiresAt: string | null; releaseReadyAt: string | null };
export type BeneficiaryPortalEntry = { id: string; title: string; category: string; entryDate: string; content: string; photos: { id: string; altText: string | null; thumbnailUrl: string; fullUrl: string }[]; media: { id: string; mediaType: string; fileName: string; mimeType: string; byteSize: string }[] };
export type BeneficiaryPortalPolicy = { id: string; name: string; status: 'PENDING' | 'RELEASED'; releaseMethod: string; releaseAt: string | null; releaseReadyAt: string | null; releasedAt: string | null; entryCount: number; categories: string[]; resourceCounts: { FILE: number; PLAYLIST: number; WISHES: number } };
export type BeneficiaryPortalOverview = { beneficiaries: { id: string; ownerName: string; relationship: string | null; acceptedAt: string | null; policies: BeneficiaryPortalPolicy[] }[] };

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is not configured for this deployment.');
  }
  const headers = new Headers(options?.headers);
  if (!(typeof FormData !== 'undefined' && options?.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const url = `${apiBaseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => undefined) as { error?: { message?: string; requestId?: string } } | undefined;
    if (response.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
      window.location.replace('/login');
    }
    const requestId = payload?.error?.requestId;
    const message = payload?.error?.message ?? `Request failed with status ${response.status}`;
    throw new ApiError(response.status, response.status === 500 && requestId ? `${message} Reference: ${requestId}` : message, requestId, url);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const authService = {
  login: (payload: unknown) => apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  }),
  register: (payload: unknown) => apiRequest('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => apiRequest('/api/auth/logout', { method: 'POST' }),
  me: () => apiRequest<AuthMeResponse>('/api/auth/me'),
};

export type FaceChallenge = { challengeId: string; nonce: string; expiresAt: string };
export const faceAuthService = {
  challenge: (email: string) => apiRequest<{ success: true; data: FaceChallenge }>('/api/auth/face/challenge', { method: 'POST', body: JSON.stringify({ email }) }).then((result) => result.data),
  verify: (payload: { challengeId: string; nonce: string; descriptor: number[] }) => apiRequest<AuthMeResponse>('/api/auth/face/verify', { method: 'POST', body: JSON.stringify(payload) }),
  status: () => apiRequest<{ success: true; data: { enabled: boolean; consentAt: string | null } }>('/api/auth/face/status').then((result) => result.data),
  enroll: (payload: { password: string; descriptor: number[] }) => apiRequest<{ success: true; data: { enabled: boolean } }>('/api/auth/face/enroll', { method: 'POST', body: JSON.stringify(payload) }),
  remove: (password: string) => apiRequest<{ success: true; data: { enabled: boolean } }>('/api/auth/face/enroll', { method: 'DELETE', body: JSON.stringify({ password }) }),
};

export const diaryService = {
  list: (query = '') => apiRequest<{ success: true; data: { entries: ApiDiaryEntry[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } } }>(`/api/diary/entries${query}`, { cache: 'no-store' }).then((result) => result.data),
  create: (payload: unknown) => apiRequest<{ success: true; data: { entry: ApiDiaryEntry } }>('/api/diary/entries', { method: 'POST', body: JSON.stringify(payload) }).then((result) => result.data.entry),
  get: (id: string) => apiRequest<{ success: true; data: { entry: ApiDiaryEntry } }>(`/api/diary/entries/${id}`, { cache: 'no-store' }).then((result) => result.data.entry),
  update: (id: string, payload: unknown) => apiRequest<{ success: true; data: { entry: ApiDiaryEntry } }>(`/api/diary/entries/${id}`, { method: 'PUT', body: JSON.stringify(payload) }).then((result) => result.data.entry),
  setFavorite: (id: string, isFavorite: boolean) => apiRequest<{ success: true; data: { entry: ApiDiaryEntry } }>(`/api/diary/entries/${id}/favorite`, { method: 'PATCH', body: JSON.stringify({ isFavorite }) }).then((result) => result.data.entry),
  archive: (id: string) => apiRequest<{ success: true; data: { entry: ApiDiaryEntry } }>(`/api/diary/entries/${id}/archive`, { method: 'POST', body: '{}' }).then((result) => result.data.entry),
  restore: (id: string) => apiRequest<{ success: true; data: { entry: ApiDiaryEntry } }>(`/api/diary/entries/${id}/restore`, { method: 'POST', body: '{}' }).then((result) => result.data.entry),
  remove: (id: string) => apiRequest(`/api/diary/entries/${id}`, { method: 'DELETE' }),
  photoSignature: (count: number) => apiRequest<{ success: true; data: { cloudName: string; apiKey: string; timestamp: number; folder: string; type: string; transformation: string; signature: string } }>('/api/diary/upload-signature', { method: 'POST', body: JSON.stringify({ count }) }).then((result) => result.data),
  discardPhoto: (publicId: string) => apiRequest(`/api/diary/photos/unattached`, { method: 'DELETE', body: JSON.stringify({ publicId }) }),
  setEmotion: (id: string, emotion: 'JOY' | 'SADNESS' | 'ANGER' | 'FEAR' | 'DISGUST' | 'ANXIETY') => apiRequest<{ success: true; data: { entry: ApiDiaryEntry } }>(`/api/diary/entries/${id}/emotion`, { method: 'PATCH', body: JSON.stringify({ emotion }) }).then((result) => result.data.entry),
  classifyEmotion: (id: string) => apiRequest<{ success: true; data: { entry: ApiDiaryEntry } }>(`/api/diary/entries/${id}/classify-emotion`, { method: 'POST', body: JSON.stringify({}) }).then((result) => result.data.entry),
  classifyUnclassified: () => apiRequest<{ success: true; data: { classified: number; failed: number; remaining: number } }>('/api/diary/classify-unclassified', { method: 'POST', body: '{}' }).then((result) => result.data),
};

export const filesService = {
  list: (category?: UserFileCategory) => apiRequest<{ success: true; data: { files: UserFile[] } }>(`/api/files${category ? `?category=${encodeURIComponent(category)}` : ''}`, { cache: 'no-store' }).then((result) => result.data.files),
  create: (metadata: Omit<UserFile, 'id' | 'createdAt' | 'size'> & { size: number }) => apiRequest<{ success: true; data: { file: UserFile } }>('/api/files', { method: 'POST', body: JSON.stringify(metadata) }).then((result) => result.data.file),
  rename: (id: string, name: string) => apiRequest<{ success: true; data: { file: UserFile } }>(`/api/files/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ name }) }).then((result) => result.data.file),
  remove: (id: string) => apiRequest<void>(`/api/files/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  listPlaylists: () => apiRequest<{ success: true; data: { playlists: UserPlaylist[] } }>('/api/files/playlists', { cache: 'no-store' }).then((result) => result.data.playlists),
  addPlaylist: (url: string, choice: 'playlist' | 'video' = 'playlist') => apiRequest<{ success: true; data: { playlist: UserPlaylist } }>('/api/files/playlists', { method: 'POST', body: JSON.stringify({ url, choice }) }).then((result) => result.data.playlist),
  renamePlaylist: (id: string, title: string) => apiRequest<{ success: true; data: { playlist: UserPlaylist } }>(`/api/files/playlists/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ title }) }).then((result) => result.data.playlist),
  removePlaylist: (id: string) => apiRequest<void>(`/api/files/playlists/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export async function uploadDiaryPhoto(file: Blob, name: string, onProgress: (progress: number) => void) {
  const signature = await diaryService.photoSignature(1);
  const data = new FormData();
  data.append('file', file, name);
  data.append('api_key', signature.apiKey);
  data.append('timestamp', String(signature.timestamp));
  data.append('folder', signature.folder);
  data.append('type', signature.type);
  data.append('transformation', signature.transformation);
  data.append('signature', signature.signature);
  return new Promise<{ public_id: string }>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`);
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)); };
    request.onload = () => { if (request.status >= 200 && request.status < 300) resolve(JSON.parse(request.responseText) as { public_id: string }); else reject(new Error('Cloud photo upload failed.')); };
    request.onerror = () => reject(new Error('Cloud photo upload failed.'));
    request.send(data);
  });
}

export const dashboardService = {
  get: () => apiRequest<DashboardApiResponse>('/api/dashboard').then((result) => result.data),
};

export const assistantService = {
  ask: (payload: { conversationId?: string; question: string }) => apiRequest<{ success: true; data: AssistantReply }>('/api/ai/conversations/messages', { method: 'POST', body: JSON.stringify(payload) }).then((result) => result.data),
  createConversation: (mode: 'AI_BUDDY' | 'DIARY_ASSISTANT', title?: string) => apiRequest<{ success: true; data: { conversation: { id: string; mode: 'AI_BUDDY' | 'DIARY_ASSISTANT'; title: string | null; createdAt: string; updatedAt: string } } }>('/api/ai/conversations', { method: 'POST', body: JSON.stringify({ mode, title }) }).then((result) => result.data.conversation),
  listConversations: (mode?: 'AI_BUDDY' | 'DIARY_ASSISTANT') => apiRequest<{ success: true; data: { conversations: Array<{ id: string; mode: 'AI_BUDDY' | 'DIARY_ASSISTANT'; title: string | null; createdAt: string; updatedAt: string }> } }>(`/api/ai/conversations${mode ? `?mode=${mode}` : ''}`).then((result) => result.data.conversations),
  getConversation: (id: string) => apiRequest<{ success: true; data: { conversation: { id: string; mode: 'AI_BUDDY' | 'DIARY_ASSISTANT'; title: string | null; messages: Array<{ id: string; role: 'USER' | 'ASSISTANT'; content: string; createdAt: string; citations?: AssistantCitation[] }> } } }>(`/api/ai/conversations/${encodeURIComponent(id)}`).then((result) => result.data.conversation),
  send: (id: string, question: string) => apiRequest<{ success: true; data: AssistantReply }>(`/api/ai/conversations/${encodeURIComponent(id)}/messages`, { method: 'POST', body: JSON.stringify({ question }) }).then((result) => result.data),
  removeConversation: (id: string) => apiRequest<void>(`/api/ai/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export const beneficiaryService = {
  list: () => apiRequest<{ success: true; data: { beneficiaries: Beneficiary[] } }>('/api/beneficiaries').then((result) => result.data),
  create: (payload: unknown) => apiRequest<{ success: true; data: { beneficiary: Beneficiary; delivery: string } }>('/api/beneficiaries', { method: 'POST', body: JSON.stringify(payload) }).then((result) => result.data),
  remove: (id: string) => apiRequest(`/api/beneficiaries/${id}`, { method: 'DELETE' }),
};

export const policyService = {
  list: () => apiRequest<{ success: true; data: { policies: AccessPolicy[] } }>('/api/policies').then((result) => result.data),
  validate: (policy: string) => apiRequest('/api/policies/validate', { method: 'POST', body: JSON.stringify({ policy }) }),
  create: (payload: unknown) => apiRequest('/api/policies', { method: 'POST', body: JSON.stringify(payload) }),
};

export const legacyPolicyService = {
  resourceCatalog: () => apiRequest<{ success: true; data: { resources: LegacyResourceCatalogItem[]; partial?: boolean; warning?: string } }>('/api/legacy/resource-catalog').then((r) => r.data),
  confirmVerifier: (token: string) => apiRequest<{ success: true; data: { releaseReadyAt: string } }>('/api/legacy/verifier/confirm', { method: 'POST', body: JSON.stringify({ token }) }).then((r) => r.data),
  listBeneficiaries: () => apiRequest<{ success: true; data: { beneficiaries: LegacyBeneficiary[] } }>('/api/legacy/beneficiaries').then((r) => r.data.beneficiaries),
  createBeneficiary: (payload: unknown) => beneficiaryService.create(payload).then((result) => ({ beneficiary: result.beneficiary as LegacyBeneficiary, delivery: result.delivery })),
  resendInvitation: (id: string) => apiRequest<{ success: true; data: { delivery: string } }>(`/api/legacy/beneficiaries/${id}/invite`, { method: 'POST', body: '{}' }).then((r) => r.data),
  list: () => apiRequest<{ success: true; data: { policies: LegacyPolicy[] } }>('/api/legacy/policies').then((r) => r.data.policies),
  create: (payload: unknown) => apiRequest<{ success: true; data: { policy: LegacyPolicy } }>('/api/legacy/policies', { method: 'POST', body: JSON.stringify(payload) }).then((r) => r.data.policy),
  update: (id: string, payload: unknown) => apiRequest<{ success: true; data: { policy: LegacyPolicy } }>(`/api/legacy/policies/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }).then((r) => r.data.policy),
  activate: (id: string, password: string) => apiRequest<{ success: true; data: { policy: LegacyPolicy } }>(`/api/legacy/policies/${id}/activate`, { method: 'POST', body: JSON.stringify({ password }) }).then((r) => r.data.policy),
  pause: (id: string) => apiRequest<{ success: true; data: { policy: LegacyPolicy } }>(`/api/legacy/policies/${id}/pause`, { method: 'POST' }).then((r) => r.data.policy),
  revoke: (id: string, password: string) => apiRequest<{ success: true; data: { policy: LegacyPolicy } }>(`/api/legacy/policies/${id}/revoke`, { method: 'POST', body: JSON.stringify({ password }) }).then((r) => r.data.policy),
  requestRelease: (id: string, password?: string) => apiRequest<{ success: true; data: { policy?: LegacyPolicy; message?: string } }>(`/api/legacy/policies/${id}/release-request`, { method: 'POST', body: JSON.stringify(password ? { password } : {}) }).then((r) => r.data),
  cancelRelease: (id: string) => apiRequest<{ success: true; data: { policy: LegacyPolicy } }>(`/api/legacy/policies/${id}/release-cancel`, { method: 'POST' }).then((r) => r.data.policy),
  postpone: (id: string, releaseAt: string) => apiRequest<{ success: true; data: { policy: LegacyPolicy } }>(`/api/legacy/policies/${id}/postpone`, { method: 'POST', body: JSON.stringify({ releaseAt }) }).then((r) => r.data.policy),
  remove: (id: string) => apiRequest<void>(`/api/legacy/policies/${id}`, { method: 'DELETE' }),
  audit: (id: string) => apiRequest<{ success: true; data: { logs: { id: string; action: string; actorType: string; createdAt: string; metadata: unknown }[] } }>(`/api/legacy/audit?policy_id=${encodeURIComponent(id)}`).then((r) => r.data.logs),
};

export const legacyVerificationService = {
  verifyInvitation: (token: string, action: 'verify' | 'decline') => apiRequest(`/api/legacy/beneficiaries/verify`, { method: 'POST', body: JSON.stringify({ token, action }) }),
  verifyRelease: (token: string) => apiRequest(`/api/legacy/release/verify`, { method: 'POST', body: JSON.stringify({ token }) }),
};

export const beneficiaryPortalService = {
  invitation: (token: string) => apiRequest<{ success: true; data: { invitation: { fullName: string; email: string; relationship: string | null; ownerName: string; expiresAt: string | null } } }>(`/api/beneficiary-portal/invitations/${encodeURIComponent(token)}`, { cache: 'no-store' }).then((r) => r.data.invitation),
  verifier: (token: string) => apiRequest<{ success: true; data: { verifier: { email: string; verifierName: string; ownerName: string; policyName: string; expiresAt: string } } }>(`/api/beneficiary-portal/verifiers/${encodeURIComponent(token)}`, { cache: 'no-store' }).then((r) => r.data.verifier),
  registerAndAccept: (token: string, password: string, confirmPassword: string) => apiRequest('/api/beneficiary-portal/invitations/register', { method: 'POST', body: JSON.stringify({ token, password, confirmPassword }) }),
  accept: (token: string) => apiRequest('/api/beneficiary-portal/invitations/accept', { method: 'POST', body: JSON.stringify({ token }) }),
  overview: () => apiRequest<{ success: true; data: BeneficiaryPortalOverview }>('/api/beneficiary-portal/portal', { cache: 'no-store' }).then((r) => r.data),
  policy: (id: string, filters: { from?: string; to?: string; category?: string } = {}) => {
    const query = new URLSearchParams(Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString();
    return apiRequest<{ success: true; data: { policy: { id: string; name: string; ownerName: string; relationship: string | null; releasedAt: string | null }; entries: BeneficiaryPortalEntry[]; resources: { playlists: { id: string; title: string; url: string }[]; letters: { id: string; title: string; content: string }[]; files: { id: string; name: string; mime: string; category: string; size: string }[] } } }>(`/api/beneficiary-portal/portal/policies/${encodeURIComponent(id)}${query ? `?${query}` : ''}`, { cache: 'no-store' }).then((r) => r.data);
  },
  ask: (question: string) => apiRequest<{ success: true; data: { answer: string; citations: { id: string; title: string; entryDate: string }[] } }>('/api/beneficiary-portal/portal/assistant', { method: 'POST', body: JSON.stringify({ question }) }).then((r) => r.data),
};

export const writingModeService = {
  process: (payload: { diaryEntryId?: string; mode: 'VERBATIM' | 'LIGHT_FIX' | 'REVIEW'; content?: string; text?: string; instruction?: string; consentToGemini?: boolean; consent?: boolean }, signal?: AbortSignal) => apiRequest<{ success: true; data: { text?: string; version: { processedContent: string; processingNotes: string | null }; persisted?: boolean } }>('/api/diary/writing-modes/process', { method: 'POST', body: JSON.stringify(payload), signal }).then((result) => result.data),
  saveRevision: (entryId: string, payload: { writingMode: 'VERBATIM' | 'LIGHT_FIX' | 'REVIEW'; sourceContent: string; processedContent: string; processingNotes?: string | null }) => apiRequest<{ success: true; data: { version: unknown } }>(`/api/diary/writing-modes/entries/${entryId}/revisions`, { method: 'POST', body: JSON.stringify(payload) }).then((result) => result.data),
};

export const transcriptionService = {
  transcribe: (audio: Blob, durationMs: number, signal?: AbortSignal) => {
    const formData = new FormData();
    const extension = audio.type.includes('mp4') ? 'm4a' : audio.type.includes('mpeg') ? 'mp3' : 'webm';
    formData.append('audio', audio, `voice-entry.${extension}`);
    formData.append('durationMs', String(Math.round(durationMs)));
    return apiRequest<{ success: true; data: { transcription: string; durationSeconds: number } }>('/api/transcribe', { method: 'POST', body: formData, signal }).then((result) => result.data);
  },
};

export const notificationsService = {
  list: (limit = 20) => apiRequest<{ success: true; data: { notifications: NotificationItem[]; nextCursor: string | null } }>(`/api/notifications?limit=${limit}`).then((result) => result.data),
  unreadCount: () => apiRequest<{ success: true; data: { count: number } }>('/api/notifications/unread-count').then((result) => result.data.count),
  markRead: (id: string) => apiRequest<{ success: true; data: { notification: NotificationItem } }>(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }).then((result) => result.data.notification),
  markAllRead: () => apiRequest<{ success: true; data: { updated: number } }>('/api/notifications/read-all', { method: 'POST' }).then((result) => result.data.updated),
};

export const profileService = {
  get: () => apiRequest<{ success: true; data: { profile: Profile } }>('/api/profile').then((result) => result.data.profile),
  update: (payload: { displayName?: string; bio?: string; timezone?: string; notificationPreferences?: Partial<Profile['notificationPreferences']> }) => apiRequest<{ success: true; data: { profile: Profile } }>('/api/profile', { method: 'PATCH', body: JSON.stringify(payload) }).then((result) => result.data.profile),
  uploadAvatar: (avatar: File) => { const form = new FormData(); form.append('avatar', avatar); return apiRequest<{ success: true; data: { profile: Pick<Profile, 'id' | 'fullName' | 'email' | 'avatarUrl'> } }>('/api/profile/avatar', { method: 'POST', body: form }).then((result) => result.data.profile); },
  changePassword: (payload: { currentPassword: string; newPassword: string }) => apiRequest<{ success: true; data: { message: string } }>('/api/profile/change-password', { method: 'POST', body: JSON.stringify(payload) }),
  deleteAccount: (payload: { confirmation: 'DELETE MY ACCOUNT'; currentPassword: string }) => apiRequest<{ success: true; data: { message: string } }>('/api/profile', { method: 'DELETE', body: JSON.stringify(payload) }),
};

export type LifeCountdown = {
  id: string;
  durationDays: number;
  startDate: string;
  expirationDate: string;
  status: 'ACTIVE' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
};
type LifeCountdownResponse = { success: true; data: { countdown: LifeCountdown | null; serverNow: string } };
export const lifeCountdownService = {
  get: () => apiRequest<LifeCountdownResponse>('/api/life-countdown').then((result) => result.data),
  configure: (payload: { durationDays: number; startDate: string }, reset = false) => apiRequest<{ success: true; data: { countdown: LifeCountdown; serverNow: string } }>(reset ? '/api/life-countdown/reset' : '/api/life-countdown', { method: reset ? 'POST' : 'PATCH', body: JSON.stringify(payload) }).then((result) => result.data),
};

export const wishesService = {
  get: () => apiRequest<{ success: true; data: { wishes: { title: string; content: string } | null } }>('/api/letter-of-wishes').then((result) => result.data),
  save: (payload: unknown) => apiRequest<{ success: true; data: { wishes: { title: string; content: string } } }>('/api/letter-of-wishes', { method: 'PUT', body: JSON.stringify(payload) }).then((result) => result.data),
};

export const activityService = {
  list: (query = '') => apiRequest<{ success: true; data: { activities: ActivityLog[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } } }>(`/api/activity-logs${query}`).then((result) => result.data),
};

export const settingsService = {
  getProfile: () => apiRequest<{ success: true; data: { user: AuthUser } }>('/api/settings/profile').then((result) => result.data),
  updateProfile: (payload: unknown) => apiRequest<{ success: true; data: { user: AuthUser } }>('/api/settings/profile', { method: 'PATCH', body: JSON.stringify(payload) }).then((result) => result.data),
  updatePreferences: (payload: unknown) => apiRequest('/api/settings/preferences', { method: 'PATCH', body: JSON.stringify(payload) }),
};

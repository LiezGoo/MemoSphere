export type DiaryCategory = 'Family' | 'Milestones' | 'Reflections' | 'Lessons';

export type DiaryEntry = {
  id: string;
  title: string;
  date: string;
  category: DiaryCategory;
  preview: string;
  access: string;
  media?: string;
};

export type Beneficiary = {
  id: string;
  name: string;
  email: string;
  relationship: string;
  status: 'Verified' | 'Pending';
  permission: string;
};

export type ActivityItem = {
  id: string;
  action: string;
  actor: string;
  resource: string;
  date: string;
  status: 'Completed' | 'Pending' | 'Reviewed';
};

export type Citation = {
  entryId: string;
  title: string;
  date: string;
  excerpt: string;
};

export type ApiDiaryEntry = {
  id: string;
  title: string;
  category: string;
  originalContent: string;
  content: string;
  preview: string;
  entryDate: string;
  status: string;
  access: string;
  mediaCount: number;
  inputMethod?: 'TEXT' | 'VOICE';
  transcript?: string | null;
  emotion?: 'JOY' | 'SADNESS' | 'ANGER' | 'FEAR' | 'DISGUST' | 'ANXIETY' | null;
  photoCount?: number;
  photos?: Array<{ id: string; width: number; height: number; altText: string | null; thumbnailUrl: string; fullUrl?: string }>;
};

export type DashboardData = {
  stats: { entryCount: number; beneficiaryCount: number; activePolicyCount: number; recentActivityCount: number };
  recentEntries: ApiDiaryEntry[];
  recentActivities: Array<{ id: string; action: string; resourceType: string; resourceId: string | null; result: string; createdAt: string }>;
};

export type DashboardApiResponse = {
  success: true;
  data: DashboardData;
};

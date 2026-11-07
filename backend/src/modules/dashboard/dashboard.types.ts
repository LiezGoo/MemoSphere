export type DashboardResponse = {
  stats: {
    entryCount: number;
    beneficiaryCount: number;
    activePolicyCount: number;
    recentActivityCount: number;
  };
  recentEntries: Array<{
    id: string;
    title: string;
    category: string;
    originalContent: string;
    content: string;
    preview: string;
    entryDate: Date;
    status: string;
    access: string;
    mediaCount: number;
  }>;
  recentActivities: Array<{
    id: string;
    action: string;
    resourceType: string;
    resourceId: string | null;
    result: string;
    createdAt: Date;
  }>;
};

export type DashboardApiResponse = {
  success: true;
  data: DashboardResponse;
};

/**
 * TanStack Query Key 팩토리 — 도메인별 캐시 키 관리
 * Parity: APP-001
 */

export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    session: () => [...queryKeys.auth.all, 'session'] as const,
  },
  dogs: {
    all: ['dogs'] as const,
    list: (userId: string) => [...queryKeys.dogs.all, 'list', userId] as const,
    detail: (dogId: string) => [...queryKeys.dogs.all, 'detail', dogId] as const,
    env: (dogId: string) => [...queryKeys.dogs.all, 'env', dogId] as const,
  },
  logs: {
    all: ['logs'] as const,
    list: (dogId: string) => [...queryKeys.logs.all, 'list', dogId] as const,
    detail: (logId: string) => [...queryKeys.logs.all, 'detail', logId] as const,
    daily: (dogId: string, date: string) => [...queryKeys.logs.all, 'daily', dogId, date] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    detail: (dogId: string) => [...queryKeys.dashboard.all, 'detail', dogId] as const,
  },
  coaching: {
    all: ['coaching'] as const,
    list: (dogId: string) => [...queryKeys.coaching.all, 'list', dogId] as const,
    detail: (coachingId: string) => [...queryKeys.coaching.all, 'detail', coachingId] as const,
    latest: (dogId: string) => [...queryKeys.coaching.all, 'latest', dogId] as const,
  },
  training: {
    all: ['training'] as const,
    progress: (dogId: string) => [...queryKeys.training.all, 'progress', dogId] as const,
    detail: (dogId: string, curriculumId: string) =>
      [...queryKeys.training.all, 'detail', dogId, curriculumId] as const,
    feedback: (dogId: string, curriculumId?: string) =>
      curriculumId
        ? ([...queryKeys.training.all, 'feedback', dogId, curriculumId] as const)
        : ([...queryKeys.training.all, 'feedback', dogId] as const),
  },
  subscription: {
    all: ['subscription'] as const,
    current: (userId: string) => [...queryKeys.subscription.all, 'current', userId] as const,
    orders: (userId: string) => [...queryKeys.subscription.all, 'orders', userId] as const,
  },
  settings: {
    all: ['settings'] as const,
    user: (userId: string) => [...queryKeys.settings.all, 'user', userId] as const,
  },
  notification: {
    all: ['notification'] as const,
    history: (userId: string) => [...queryKeys.notification.all, 'history', userId] as const,
  },
  survey: {
    all: ['survey'] as const,
    status: (dogId: string) => [...queryKeys.survey.all, 'status', dogId] as const,
  },
  // B2B 네임스페이스
  org: {
    all: ['org'] as const,
    detail: (orgId: string) => [...queryKeys.org.all, 'detail', orgId] as const,
    members: (orgId: string) => [...queryKeys.org.all, 'members', orgId] as const,
  },
  orgDogs: {
    all: ['orgDogs'] as const,
    list: (orgId: string) => [...queryKeys.orgDogs.all, 'list', orgId] as const,
    detail: (orgDogId: string) => [...queryKeys.orgDogs.all, 'detail', orgDogId] as const,
  },
  assignments: {
    all: ['assignments'] as const,
    byTrainer: (trainerId: string) => [...queryKeys.assignments.all, 'trainer', trainerId] as const,
    byOrg: (orgId: string) => [...queryKeys.assignments.all, 'org', orgId] as const,
  },
  reports: {
    all: ['reports'] as const,
    byOrg: (orgId: string, date?: string) =>
      date
        ? [...queryKeys.reports.all, 'org', orgId, date] as const
        : [...queryKeys.reports.all, 'org', orgId] as const,
    byDog: (dogId: string) => [...queryKeys.reports.all, 'dog', dogId] as const,
    detail: (reportId: string) => [...queryKeys.reports.all, 'detail', reportId] as const,
    byShareToken: (token: string) => [...queryKeys.reports.all, 'share', token] as const,
  },
  orgSubscription: {
    all: ['orgSubscription'] as const,
    current: (orgId: string) => [...queryKeys.orgSubscription.all, 'current', orgId] as const,
    trainerCurrent: (trainerId: string) =>
      [...queryKeys.orgSubscription.all, 'trainer', trainerId] as const,
  },
} as const;

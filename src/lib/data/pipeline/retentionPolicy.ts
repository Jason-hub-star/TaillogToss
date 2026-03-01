import type { RetentionPolicy } from './types';

export function validateRetentionPolicy(policy: RetentionPolicy): void {
  if (policy.raw_delete_days <= policy.raw_retention_days) {
    throw new Error('RETENTION_INVALID_RAW_DELETE_DAYS');
  }

  if (policy.published_hot_versions < 1) {
    throw new Error('RETENTION_INVALID_PUBLISHED_HOT_VERSIONS');
  }

  if (policy.approved_versions_per_curriculum < policy.published_hot_versions) {
    throw new Error('RETENTION_INVALID_APPROVED_VERSIONS_PER_CURRICULUM');
  }
}

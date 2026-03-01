export interface PipelineCounts {
  curriculums: number;
  curriculum_days: number;
  curriculum_steps: number;
  presets: number;
}

export interface RetentionPolicy {
  raw_retention_days: number;
  raw_delete_days: number;
  candidate_rejected_retention_days: number;
  candidate_pending_retention_days: number;
  approved_versions_per_curriculum: number;
  published_hot_versions: number;
}

export interface DataCatalog {
  version: number;
  updated_at: string;
  active_version: string;
  counts: PipelineCounts;
  pipeline: RetentionPolicy;
}

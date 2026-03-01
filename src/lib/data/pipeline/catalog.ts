import type { DataCatalog } from './types';

const DEFAULT_CATALOG_PATH = 'src/lib/data/catalog.json';

function assertPositiveInt(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`CATALOG_INVALID_${field.toUpperCase()}`);
  }
}

export function validateCatalog(catalog: DataCatalog): void {
  if (!catalog.active_version || catalog.active_version.trim().length === 0) {
    throw new Error('CATALOG_INVALID_ACTIVE_VERSION');
  }

  assertPositiveInt(catalog.version, 'version');
  assertPositiveInt(catalog.counts.curriculums, 'counts_curriculums');
  assertPositiveInt(catalog.counts.curriculum_days, 'counts_curriculum_days');
  assertPositiveInt(catalog.counts.curriculum_steps, 'counts_curriculum_steps');
  assertPositiveInt(catalog.counts.presets, 'counts_presets');

  assertPositiveInt(catalog.pipeline.raw_retention_days, 'raw_retention_days');
  assertPositiveInt(catalog.pipeline.raw_delete_days, 'raw_delete_days');
  assertPositiveInt(catalog.pipeline.candidate_rejected_retention_days, 'candidate_rejected_retention_days');
  assertPositiveInt(catalog.pipeline.candidate_pending_retention_days, 'candidate_pending_retention_days');
  assertPositiveInt(catalog.pipeline.approved_versions_per_curriculum, 'approved_versions_per_curriculum');
  assertPositiveInt(catalog.pipeline.published_hot_versions, 'published_hot_versions');
}

export function resolvePublishedManifestPath(catalog: DataCatalog): string {
  validateCatalog(catalog);
  return `src/lib/data/published/${catalog.active_version}/manifest.json`;
}

export function getDefaultCatalogPath(): string {
  return DEFAULT_CATALOG_PATH;
}

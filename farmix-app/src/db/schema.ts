import { sql } from 'drizzle-orm';
import { bigserial, boolean, date, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

const tz = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    fullName: text('full_name').notNull(),
    privacyAcceptedAt: tz('privacy_accepted_at'),
    privacyVersion: text('privacy_version'),
    failedLoginCount: integer('failed_login_count').notNull().default(0),
    lockedUntil: tz('locked_until'),
    deletionRequestedAt: tz('deletion_requested_at'),
    deletionScheduledAt: tz('deletion_scheduled_at'),
    createdAt: tz('created_at').notNull().defaultNow(),
    updatedAt: tz('updated_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('users_email_lower_uq').on(sql`lower(${t.email})`)],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    createdAt: tz('created_at').notNull().defaultNow(),
    lastSeenAt: tz('last_seen_at').notNull().defaultNow(),
    expiresAt: tz('expires_at').notNull(),
    revokedAt: tz('revoked_at'),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

export const passwordResets = pgTable('password_resets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: tz('expires_at').notNull(),
  usedAt: tz('used_at'),
  createdAt: tz('created_at').notNull().defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resource_id'),
  outcome: text('outcome').notNull(),
  requestId: text('request_id'),
  createdAt: tz('created_at').notNull().defaultNow(),
});

export const devMailbox = pgTable('dev_mailbox', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  toEmail: text('to_email').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  createdAt: tz('created_at').notNull().defaultNow(),
});

export const drugstores = pgTable('drugstores', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  city: text('city').notNull().default('Sincelejo'),
  expiryAlertDays: integer('expiry_alert_days').notNull().default(60),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: tz('created_at').notNull().defaultNow(),
  updatedAt: tz('updated_at').notNull().defaultNow(),
  deletedAt: tz('deleted_at'),
});

export const drugstoreMembers = pgTable(
  'drugstore_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    drugstoreId: uuid('drugstore_id').notNull().references(() => drugstores.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    memberRole: text('member_role').notNull().$type<'propietario' | 'administrador' | 'operador'>(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: tz('created_at').notNull().defaultNow(),
    updatedAt: tz('updated_at').notNull().defaultNow(),
    deletedAt: tz('deleted_at'),
  },
  (t) => [index('drugstore_members_user_idx').on(t.userId)],
);

export const expirationProducts = pgTable('expiration_products', {
  id: uuid('id').primaryKey().defaultRandom(),
  drugstoreId: uuid('drugstore_id').notNull().references(() => drugstores.id, { onDelete: 'cascade' }),
  productName: text('product_name').notNull(),
  batch: text('batch').notNull(),
  sanitaryRegistry: text('sanitary_registry'),
  holder: text('holder'),
  expiresOn: date('expires_on', { mode: 'string' }).notNull(),
  quantity: integer('quantity').notNull(),
  unitCost: numeric('unit_cost', { precision: 12, scale: 2 }).notNull().default('0'),
  destination: text('destination').notNull().default('pendiente'),
  managedAt: tz('managed_at'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: tz('created_at').notNull().defaultNow(),
  updatedAt: tz('updated_at').notNull().defaultNow(),
  deletedAt: tz('deleted_at'),
});

export const wasteRecords = pgTable('waste_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  drugstoreId: uuid('drugstore_id').notNull().references(() => drugstores.id, { onDelete: 'cascade' }),
  recordedOn: date('recorded_on', { mode: 'string' }).notNull(),
  classification: text('classification').notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 3 }).notNull(),
  unit: text('unit').notNull(),
  origin: text('origin'),
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: tz('created_at').notNull().defaultNow(),
  updatedAt: tz('updated_at').notNull().defaultNow(),
  deletedAt: tz('deleted_at'),
});

const audit_cols = () => ({
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: tz('created_at').notNull().defaultNow(),
  updatedAt: tz('updated_at').notNull().defaultNow(),
  deletedAt: tz('deleted_at'),
});
const tenantId = () => uuid('drugstore_id').notNull().references(() => drugstores.id, { onDelete: 'cascade' });

export const segregationChecks = pgTable('segregation_checks', {
  id: uuid('id').primaryKey().defaultRandom(),
  drugstoreId: tenantId(),
  checkedOn: date('checked_on', { mode: 'string' }).notNull(),
  itemsReviewed: integer('items_reviewed').notNull(),
  itemsCorrect: integer('items_correct').notNull(),
  location: text('location').notNull(),
  observations: text('observations'),
  ...audit_cols(),
});

export const workers = pgTable('workers', {
  id: uuid('id').primaryKey().defaultRandom(),
  drugstoreId: tenantId(),
  workerCode: text('worker_code').notNull(),
  fullName: text('full_name').notNull(),
  jobTitle: text('job_title'),
  ...audit_cols(),
});

export const trainingTopics = pgTable('training_topics', {
  id: uuid('id').primaryKey().defaultRandom(),
  drugstoreId: tenantId(),
  topicName: text('topic_name').notNull(),
  validityMonths: integer('validity_months').notNull().default(12),
  description: text('description'),
  ...audit_cols(),
});

export const trainings = pgTable('trainings', {
  id: uuid('id').primaryKey().defaultRandom(),
  drugstoreId: uuid('drugstore_id').notNull(),
  workerId: uuid('worker_id').notNull(),
  topicId: uuid('topic_id').notNull(),
  trainedOn: date('trained_on', { mode: 'string' }),
  validUntil: date('valid_until', { mode: 'string' }),
  supportFileId: uuid('support_file_id'),
  ...audit_cols(),
});

export const improvementActions = pgTable('improvement_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  drugstoreId: tenantId(),
  finding: text('finding').notNull(),
  correctiveAction: text('corrective_action').notNull(),
  responsible: text('responsible').notNull(),
  dueOn: date('due_on', { mode: 'string' }).notNull(),
  progressState: text('progress_state').notNull().default('pendiente'),
  closedOn: date('closed_on', { mode: 'string' }),
  ...audit_cols(),
});

export const instrumentVersions = pgTable('instrument_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  versionNumber: integer('version_number').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  isCurrent: boolean('is_current').notNull().default(false),
  publishedAt: tz('published_at').notNull().defaultNow(),
});

export const instrumentItems = pgTable('instrument_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  versionId: uuid('version_id').notNull().references(() => instrumentVersions.id),
  area: text('area').notNull(),
  itemCode: text('item_code').notNull(),
  promptText: text('prompt_text').notNull(),
  position: integer('position').notNull(),
});

export const diagnoses = pgTable('diagnoses', {
  id: uuid('id').primaryKey().defaultRandom(),
  drugstoreId: tenantId(),
  instrumentVersionId: uuid('instrument_version_id').notNull().references(() => instrumentVersions.id),
  performedOn: date('performed_on', { mode: 'string' }).notNull(),
  notes: text('notes'),
  ...audit_cols(),
});

export const diagnosisAnswers = pgTable('diagnosis_answers', {
  id: uuid('id').primaryKey().defaultRandom(),
  diagnosisId: uuid('diagnosis_id').notNull(),
  versionId: uuid('version_id').notNull(),
  itemId: uuid('item_id').notNull(),
  score: integer('score').notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: tz('created_at').notNull().defaultNow(),
  updatedAt: tz('updated_at').notNull().defaultNow(),
});

export const diagnosisAreaScores = pgTable('diagnosis_area_scores', {
  diagnosisId: uuid('diagnosis_id').notNull(),
  area: text('area').notNull(),
  areaScore: numeric('area_score', { precision: 2, scale: 1 }).notNull(),
  answeredCount: integer('answered_count').notNull(),
});

export const supportFiles = pgTable('support_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  drugstoreId: tenantId(),
  originalName: text('original_name').notNull(),
  storedName: text('stored_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  sha256: text('sha256').notNull(),
  ...audit_cols(),
});

export const imports = pgTable('imports', {
  id: uuid('id').primaryKey().defaultRandom(),
  drugstoreId: tenantId(),
  kind: text('kind').notNull(),
  fileName: text('file_name').notNull(),
  phase: text('phase').notNull().default('vista_previa'),
  totalRows: integer('total_rows').notNull(),
  validRows: integer('valid_rows').notNull(),
  invalidRows: integer('invalid_rows').notNull(),
  duplicateRows: integer('duplicate_rows').notNull(),
  rowResults: jsonb('row_results').notNull().$type<unknown[]>(),
  insertedCount: integer('inserted_count'),
  expiresAt: tz('expires_at').notNull(),
  confirmedAt: tz('confirmed_at'),
  ...audit_cols(),
});

export const localMigrations = pgTable('local_migrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  drugstoreId: tenantId(),
  contentHash: text('content_hash').notNull(),
  isDemo: boolean('is_demo').notNull().default(false),
  phase: text('phase').notNull().default('pendiente'),
  payload: jsonb('payload').notNull().$type<Record<string, unknown[]>>(),
  summary: jsonb('summary').notNull().$type<Record<string, unknown>>(),
  insertedIds: jsonb('inserted_ids').$type<Record<string, string[]>>(),
  createdAt: tz('created_at').notNull().defaultNow(),
  updatedAt: tz('updated_at').notNull().defaultNow(),
  confirmedAt: tz('confirmed_at'),
  revertedAt: tz('reverted_at'),
});

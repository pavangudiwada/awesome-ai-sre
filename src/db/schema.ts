import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export type EvidenceState =
  | "unknown"
  | "confirmed"
  | "vendor_claimed"
  | "conflicting"
  | "rejected";

export type EditorialSubmissionType = "correction" | "company_update";
export type EditorialRelationship =
  | "practitioner"
  | "company_employee"
  | "founder"
  | "agency"
  | "other";
export type EditorialSubmissionStatus =
  | "pending"
  | "reviewing"
  | "accepted"
  | "rejected";
export type AnalyticsEventType =
  | "profile_view"
  | "outbound_click"
  | "update_view"
  | "share";
export type AnalyticsSubjectKind = "product" | "company" | "update";

const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const auth = pgSchema("auth");
export const privateSchema = pgSchema("private");

// Minimal mirror of the Supabase-managed table. Application code must never
// create, update, or delete auth.users through Drizzle.
export const authUsers = auth.table("users", {
  id: uuid("id").primaryKey(),
});

export const practitionerProfiles = pgTable("practitioner_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  role: text("role"),
  organization: text("organization"),
  ...timestamps(),
});

export const catalogCompanyRefs = pgTable("catalog_company_refs", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  websiteDomain: text("website_domain"),
  isActive: boolean("is_active").default(true).notNull(),
  lastSyncedAt: timestamp("last_synced_at", {
    withTimezone: true,
    mode: "date",
  })
    .defaultNow()
    .notNull(),
});

export const catalogProductRefs = pgTable(
  "catalog_product_refs",
  {
    slug: text("slug").primaryKey(),
    name: text("name").notNull(),
    url: text("url"),
    companySlug: text("company_slug").references(
      () => catalogCompanyRefs.slug,
    ),
    isActive: boolean("is_active").default(true).notNull(),
    yamlHash: text("yaml_hash"),
    lastSyncedAt: timestamp("last_synced_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("catalog_product_refs_company_slug_idx").on(table.companySlug)],
);

export const savedProducts = pgTable(
  "saved_products",
  {
    practitionerId: uuid("practitioner_id")
      .notNull()
      .references(() => practitionerProfiles.userId, { onDelete: "cascade" }),
    productSlug: text("product_slug")
      .notNull()
      .references(() => catalogProductRefs.slug),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.practitionerId, table.productSlug] }),
    index("saved_products_product_slug_idx").on(table.productSlug),
  ],
);

export const companyFollows = pgTable(
  "company_follows",
  {
    practitionerId: uuid("practitioner_id")
      .notNull()
      .references(() => practitionerProfiles.userId, { onDelete: "cascade" }),
    companySlug: text("company_slug")
      .notNull()
      .references(() => catalogCompanyRefs.slug, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.practitionerId, table.companySlug] }),
    index("company_follows_company_slug_idx").on(table.companySlug),
  ],
);

export const evaluations = pgTable(
  "evaluations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    practitionerId: uuid("practitioner_id")
      .notNull()
      .references(() => practitionerProfiles.userId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    goal: text("goal"),
    requirements: text("requirements"),
    risks: text("risks"),
    decision: text("decision"),
    ...timestamps(),
  },
  (table) => [index("evaluations_practitioner_id_idx").on(table.practitionerId)],
);

export const evaluationProducts = pgTable(
  "evaluation_products",
  {
    evaluationId: uuid("evaluation_id")
      .notNull()
      .references(() => evaluations.id, { onDelete: "cascade" }),
    productSlug: text("product_slug")
      .notNull()
      .references(() => catalogProductRefs.slug),
    position: integer("position"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.evaluationId, table.productSlug] }),
    index("evaluation_products_product_slug_idx").on(table.productSlug),
  ],
);

export const productNotes = pgTable(
  "product_notes",
  {
    practitionerId: uuid("practitioner_id")
      .notNull()
      .references(() => practitionerProfiles.userId, { onDelete: "cascade" }),
    productSlug: text("product_slug")
      .notNull()
      .references(() => catalogProductRefs.slug, { onDelete: "cascade" }),
    body: text("body").default("").notNull(),
    ...timestamps(),
  },
  (table) => [
    primaryKey({ columns: [table.practitionerId, table.productSlug] }),
    index("product_notes_product_slug_idx").on(table.productSlug),
  ],
);

export const companyOptIns = pgTable(
  "company_opt_ins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    practitionerId: uuid("practitioner_id")
      .notNull()
      .references(() => practitionerProfiles.userId, { onDelete: "cascade" }),
    companySlug: text("company_slug")
      .notNull()
      .references(() => catalogCompanyRefs.slug),
    productSlug: text("product_slug").references(() => catalogProductRefs.slug),
    consentText: text("consent_text").notNull(),
    consentedAt: timestamp("consented_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("company_opt_ins_practitioner_id_idx").on(table.practitionerId),
    index("company_opt_ins_company_slug_idx").on(table.companySlug),
    index("company_opt_ins_product_slug_idx").on(table.productSlug),
    uniqueIndex("company_opt_ins_active_unique_idx")
      .on(
        table.practitionerId,
        table.companySlug,
        sql`coalesce(${table.productSlug}, '')`,
      )
      .where(sql`${table.revokedAt} is null`),
  ],
);

export const sourceLinks = pgTable(
  "source_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productSlug: text("product_slug").references(() => catalogProductRefs.slug),
    companySlug: text("company_slug").references(() => catalogCompanyRefs.slug),
    url: text("url").notNull(),
    sourceType: text("source_type").notNull(),
    discoveredBy: text("discovered_by").default("operator").notNull(),
    discoveredAt: timestamp("discovered_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
    lastCheckedAt: timestamp("last_checked_at", {
      withTimezone: true,
      mode: "date",
    }),
    contentHash: text("content_hash"),
    notes: text("notes"),
  },
  (table) => [
    index("source_links_product_slug_idx").on(table.productSlug),
    index("source_links_company_slug_idx").on(table.companySlug),
    index("source_links_url_idx").on(table.url),
    check(
      "source_links_has_subject",
      sql`${table.productSlug} is not null or ${table.companySlug} is not null`,
    ),
  ],
);

export const evidenceCandidates = pgTable(
  "evidence_candidates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceLinkId: uuid("source_link_id").references(() => sourceLinks.id, {
      onDelete: "set null",
    }),
    productSlug: text("product_slug").references(() => catalogProductRefs.slug),
    companySlug: text("company_slug").references(() => catalogCompanyRefs.slug),
    criterion: text("criterion"),
    claimText: text("claim_text").notNull(),
    claimValue: jsonb("claim_value"),
    evidenceState: text("evidence_state")
      .$type<EvidenceState>()
      .default("unknown")
      .notNull(),
    extractedBy: text("extracted_by").default("operator").notNull(),
    extractedAt: timestamp("extracted_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "date" }),
    reviewedBy: uuid("reviewed_by").references(() => practitionerProfiles.userId),
    privateNotes: text("private_notes"),
  },
  (table) => [
    index("evidence_candidates_source_link_id_idx").on(table.sourceLinkId),
    index("evidence_candidates_product_slug_idx").on(table.productSlug),
    index("evidence_candidates_company_slug_idx").on(table.companySlug),
    index("evidence_candidates_criterion_idx").on(table.criterion),
    check(
      "evidence_candidates_state",
      sql`${table.evidenceState} in ('unknown', 'confirmed', 'vendor_claimed', 'conflicting', 'rejected')`,
    ),
    check(
      "evidence_candidates_has_subject",
      sql`${table.productSlug} is not null or ${table.companySlug} is not null`,
    ),
  ],
);

export const publishedUpdates = pgTable(
  "published_updates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    companySlug: text("company_slug").references(() => catalogCompanyRefs.slug, {
      onDelete: "set null",
    }),
    productSlug: text("product_slug").references(() => catalogProductRefs.slug, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    contentPath: text("content_path").notNull(),
    sourceUrl: text("source_url"),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" })
      .notNull(),
    ...timestamps(),
  },
  (table) => [
    index("published_updates_company_published_idx").on(
      table.companySlug,
      table.publishedAt.desc(),
    ),
    index("published_updates_product_published_idx").on(
      table.productSlug,
      table.publishedAt.desc(),
    ),
    index("published_updates_published_at_idx").on(table.publishedAt.desc()),
    check(
      "published_updates_slug_format",
      sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
    check(
      "published_updates_content_path_internal",
      sql`${table.contentPath} ~ '^/updates/[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
  ],
);

export const updateReads = pgTable(
  "update_reads",
  {
    practitionerId: uuid("practitioner_id")
      .notNull()
      .references(() => practitionerProfiles.userId, { onDelete: "cascade" }),
    updateId: uuid("update_id")
      .notNull()
      .references(() => publishedUpdates.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.practitionerId, table.updateId] }),
    index("update_reads_update_id_idx").on(table.updateId),
  ],
);

export const editorialSubmissions = pgTable(
  "editorial_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionType: text("submission_type")
      .$type<EditorialSubmissionType>()
      .notNull(),
    relationship: text("relationship").$type<EditorialRelationship>().notNull(),
    productSlug: text("product_slug").references(() => catalogProductRefs.slug, {
      onDelete: "set null",
    }),
    companySlug: text("company_slug").references(() => catalogCompanyRefs.slug, {
      onDelete: "set null",
    }),
    sourceUrl: text("source_url").notNull(),
    message: text("message").notNull(),
    contactEmail: text("contact_email").notNull(),
    submittedBy: uuid("submitted_by")
      .default(sql`auth.uid()`)
      .references(() => authUsers.id, { onDelete: "set null" }),
    status: text("status")
      .$type<EditorialSubmissionStatus>()
      .default("pending")
      .notNull(),
    submittedAt: timestamp("submitted_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "date" }),
    reviewedBy: uuid("reviewed_by").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    operatorNotes: text("operator_notes"),
  },
  (table) => [
    index("editorial_submissions_status_submitted_idx").on(
      table.status,
      table.submittedAt,
    ),
    index("editorial_submissions_company_slug_idx").on(table.companySlug),
    index("editorial_submissions_product_slug_idx").on(table.productSlug),
    check(
      "editorial_submissions_type",
      sql`${table.submissionType} in ('correction', 'company_update')`,
    ),
    check(
      "editorial_submissions_relationship",
      sql`${table.relationship} in ('practitioner', 'company_employee', 'founder', 'agency', 'other')`,
    ),
    check(
      "editorial_submissions_status",
      sql`${table.status} in ('pending', 'reviewing', 'accepted', 'rejected')`,
    ),
    check(
      "editorial_submissions_has_subject",
      sql`${table.productSlug} is not null or ${table.companySlug} is not null`,
    ),
    check(
      "editorial_submissions_source_url_not_blank",
      sql`length(btrim(${table.sourceUrl})) > 0`,
    ),
    check(
      "editorial_submissions_message_not_blank",
      sql`length(btrim(${table.message})) > 0`,
    ),
    check(
      "editorial_submissions_contact_email_not_blank",
      sql`length(btrim(${table.contactEmail})) > 0`,
    ),
  ],
);

export const analyticsEvents = privateSchema.table(
  "analytics_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    occurredOn: date("occurred_on", { mode: "string" })
      .default(sql`timezone('utc', now())::date`)
      .notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    visitorDayHash: text("visitor_day_hash").notNull(),
    eventType: text("event_type").$type<AnalyticsEventType>().notNull(),
    subjectKind: text("subject_kind").$type<AnalyticsSubjectKind>().notNull(),
    subjectSlug: text("subject_slug").notNull(),
  },
  (table) => [
    index("analytics_events_day_subject_idx").on(
      table.occurredOn,
      table.subjectKind,
      table.subjectSlug,
    ),
    index("analytics_events_day_event_idx").on(
      table.occurredOn,
      table.eventType,
    ),
    index("analytics_events_day_actor_idx").on(
      table.occurredOn,
      table.visitorDayHash,
    ),
    check(
      "analytics_events_visitor_day_hash_format",
      sql`${table.visitorDayHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "analytics_events_event_type",
      sql`${table.eventType} in ('profile_view', 'outbound_click', 'update_view', 'share')`,
    ),
    check(
      "analytics_events_subject_kind",
      sql`${table.subjectKind} in ('product', 'company', 'update')`,
    ),
    check(
      "analytics_events_subject_slug_format",
      sql`${table.subjectSlug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
    check(
      "analytics_events_event_subject_pair",
      sql`(${table.eventType} = 'profile_view' and ${table.subjectKind} in ('product', 'company'))
        or ${table.eventType} = 'outbound_click'
        or (${table.eventType} = 'update_view' and ${table.subjectKind} = 'update')
        or (${table.eventType} = 'share' and ${table.subjectKind} = 'product')`,
    ),
    check(
      "analytics_events_utc_day_matches_timestamp",
      sql`${table.occurredOn} = timezone('utc', ${table.occurredAt})::date`,
    ),
  ],
);

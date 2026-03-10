import { sqliteTable, text, integer, real, primaryKey, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";

// ─── better-auth Tables ───────────────────────────────────────────────────────

export const user = sqliteTable("user", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── Core Tables ───────────────────────────────────────────────────────────────

// Alias for app-level references
export const users = user;

export const groups = sqliteTable("groups", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  description: text("description"),
  visibility: text("visibility", { enum: ["public", "private"] }).default("private").notNull(),
  createdBy: text("created_by").references(() => users.id),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("groups_created_by_idx").on(table.createdBy),
]);

export const groupMembers = sqliteTable("group_members", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  groupId: text("group_id").notNull().references(() => groups.id),
  userId: text("user_id").notNull().references(() => users.id),
  role: text("role", { enum: ["owner", "admin", "member"] }).default("member").notNull(),
  joinedAt: text("joined_at").$defaultFn(() => new Date().toISOString()),
}, (table) => [
  uniqueIndex("group_members_unique").on(table.groupId, table.userId),
  index("group_members_user_idx").on(table.userId),
]);

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  groupId: text("group_id").notNull().references(() => groups.id),
  title: text("title").notNull(),
  description: text("description"),
  weekNumber: integer("week_number"),
  status: text("status", { enum: ["draft", "active", "archived"] }).default("draft").notNull(),
  shareToken: text("share_token"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("sessions_group_idx").on(table.groupId),
  index("sessions_created_by_idx").on(table.createdBy),
  index("sessions_status_idx").on(table.status),
]);

export const items = sqliteTable("items", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  sessionId: text("session_id").notNull().references(() => sessions.id),
  url: text("url").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  ogImage: text("og_image"),
  domain: text("domain"),
  priority: text("priority", { enum: ["low", "medium", "high"] }).default("medium").notNull(),
  discussed: integer("discussed").default(0).notNull(),
  contributorId: text("contributor_id").references(() => users.id),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("items_session_idx").on(table.sessionId),
  index("items_contributor_idx").on(table.contributorId),
  index("items_domain_idx").on(table.domain),
]);

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  name: text("name").notNull().unique(),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

export const itemTags = sqliteTable("item_tags", {
  itemId: text("item_id").notNull().references(() => items.id),
  tagId: text("tag_id").notNull().references(() => tags.id),
}, (table) => [
  primaryKey({ columns: [table.itemId, table.tagId] }),
]);

export const collections = sqliteTable("collections", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  groupId: text("group_id").notNull().references(() => groups.id),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("collections_group_idx").on(table.groupId),
  index("collections_created_by_idx").on(table.createdBy),
]);

export const collectionItems = sqliteTable("collection_items", {
  collectionId: text("collection_id").notNull().references(() => collections.id),
  itemId: text("item_id").notNull().references(() => items.id),
  addedAt: text("added_at").$defaultFn(() => new Date().toISOString()),
}, (table) => [
  primaryKey({ columns: [table.collectionId, table.itemId] }),
]);

// ─── AI Agent Tables ───────────────────────────────────────────────────────────

export const llmKeys = sqliteTable("llm_keys", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => users.id),
  provider: text("provider", { enum: ["openai", "anthropic", "google"] }).notNull(),
  encryptedKey: text("encrypted_key").notNull(),
  iv: text("iv").notNull(),
  authTag: text("auth_tag").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  model: text("model"),
  isValid: integer("is_valid").default(1).notNull(),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("llm_keys_user_idx").on(table.userId),
]);

export const agentConfigs = sqliteTable("agent_configs", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  llmKeyId: text("llm_key_id").notNull().references(() => llmKeys.id),
  schedule: text("schedule", { enum: ["6h", "12h", "daily", "weekly"] }).notNull(),
  status: text("status", { enum: ["active", "paused", "error"] }).default("active").notNull(),
  groupId: text("group_id").notNull().references(() => groups.id),
  maxItemsPerRun: integer("max_items_per_run").default(10).notNull(),
  relevanceThreshold: real("relevance_threshold").default(0.6).notNull(),
  nextRunAt: text("next_run_at"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("agent_configs_user_idx").on(table.userId),
  index("agent_configs_group_idx").on(table.groupId),
  index("agent_configs_status_idx").on(table.status),
]);

export const agentInterests = sqliteTable("agent_interests", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => users.id),
  agentConfigId: text("agent_config_id").notNull().references(() => agentConfigs.id),
  topic: text("topic").notNull(),
  description: text("description"),
  weight: real("weight").default(1.0).notNull(),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("agent_interests_user_idx").on(table.userId),
  index("agent_interests_config_idx").on(table.agentConfigId),
]);

export const monitoredSites = sqliteTable("monitored_sites", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => users.id),
  agentConfigId: text("agent_config_id").notNull().references(() => agentConfigs.id),
  url: text("url").notNull(),
  domain: text("domain").notNull(),
  name: text("name"),
  source: text("source", { enum: ["suggested", "manual"] }).notNull(),
  feedUrl: text("feed_url"),
  enabled: integer("enabled").default(1).notNull(),
  consecutiveFailures: integer("consecutive_failures").default(0).notNull(),
  lastCrawledAt: text("last_crawled_at"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("monitored_sites_user_idx").on(table.userId),
  index("monitored_sites_config_idx").on(table.agentConfigId),
]);

export const agentRuns = sqliteTable("agent_runs", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  agentConfigId: text("agent_config_id").notNull().references(() => agentConfigs.id),
  userId: text("user_id").notNull().references(() => users.id),
  sessionId: text("session_id"),
  status: text("status", { enum: ["pending", "running", "completed", "failed", "cancelled"] }).default("pending").notNull(),
  sitesCrawled: integer("sites_crawled").default(0).notNull(),
  itemsFound: integer("items_found").default(0).notNull(),
  itemsCreated: integer("items_created").default(0).notNull(),
  tokensUsed: integer("tokens_used").default(0).notNull(),
  errorMessage: text("error_message"),
  startedAt: text("started_at").$defaultFn(() => new Date().toISOString()),
  completedAt: text("completed_at"),
}, (table) => [
  index("agent_runs_config_idx").on(table.agentConfigId),
  index("agent_runs_user_idx").on(table.userId),
  index("agent_runs_status_idx").on(table.status),
]);

// ─── Integration Tables ────────────────────────────────────────────────────────

export const integrations = sqliteTable("integrations", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  groupId: text("group_id").notNull().references(() => groups.id),
  provider: text("provider", { enum: ["slack", "discord", "teams", "telegram"] }).notNull(),
  config: text("config").notNull(), // JSON
  mode: text("mode", { enum: ["realtime", "digest"] }).default("realtime").notNull(),
  enabled: integer("enabled").default(1).notNull(),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("integrations_group_idx").on(table.groupId),
]);

export const webhookEndpoints = sqliteTable("webhook_endpoints", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => users.id),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  events: text("events").notNull(), // JSON array
  enabled: integer("enabled").default(1).notNull(),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("webhook_endpoints_user_idx").on(table.userId),
]);

export const webhookDeliveries = sqliteTable("webhook_deliveries", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  endpointId: text("endpoint_id").notNull().references(() => webhookEndpoints.id),
  event: text("event").notNull(),
  payload: text("payload").notNull(), // JSON
  statusCode: integer("status_code"),
  responseBody: text("response_body"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("webhook_deliveries_endpoint_idx").on(table.endpointId),
]);

export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  lastUsedAt: text("last_used_at"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("api_keys_user_idx").on(table.userId),
]);

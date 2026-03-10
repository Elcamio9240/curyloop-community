export type LlmProvider = "openai" | "anthropic" | "google";
export type AgentSchedule = "6h" | "12h" | "daily" | "weekly";
export type AgentStatus = "active" | "paused" | "error";
export type AgentRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface LlmKey {
  id: string;
  userId: string;
  provider: LlmProvider;
  encryptedKey: string;
  iv: string;
  authTag: string;
  keyPrefix: string;
  model: string | null;
  isValid: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentConfig {
  id: string;
  userId: string;
  name: string;
  llmKeyId: string;
  schedule: AgentSchedule;
  status: AgentStatus;
  groupId: string;
  maxItemsPerRun: number;
  relevanceThreshold: number;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentInterest {
  id: string;
  userId: string;
  agentConfigId: string;
  topic: string;
  description: string | null;
  weight: number;
  createdAt: string;
}

export interface MonitoredSite {
  id: string;
  userId: string;
  agentConfigId: string;
  url: string;
  domain: string;
  name: string | null;
  source: "suggested" | "manual";
  feedUrl: string | null;
  enabled: boolean;
  lastCrawledAt: string | null;
  createdAt: string;
}

export interface AgentRun {
  id: string;
  agentConfigId: string;
  userId: string;
  sessionId: string | null;
  status: AgentRunStatus;
  sitesCrawled: number;
  itemsFound: number;
  itemsCreated: number;
  tokensUsed: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface SuggestedSite {
  url: string;
  name: string;
  domain: string;
  reason: string;
}

export interface CrawledContent {
  url: string;
  title: string;
  description: string;
  publishedAt?: string;
}

export interface RelevanceResult {
  url: string;
  title: string;
  description: string;
  score: number;
  matchedTopics: string[];
}

export const PROVIDER_LABELS: Record<LlmProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google AI",
};

export const PROVIDER_MODELS: Record<
  LlmProvider,
  { id: string; label: string }[]
> = {
  openai: [
    { id: "gpt-5-nano", label: "GPT-5 Nano" },
    { id: "gpt-5-mini", label: "GPT-5 Mini" },
    { id: "gpt-5", label: "GPT-5" },
    { id: "gpt-5.4", label: "GPT-5.4" },
    { id: "gpt-5.4-pro", label: "GPT-5.4 Pro" },
    { id: "gpt-4.1", label: "GPT-4.1" },
  ],
  anthropic: [
    { id: "claude-haiku-4-5-20251001", label: "Claude 4.5 Haiku" },
    { id: "claude-sonnet-4-6-20250819", label: "Claude Sonnet 4.6" },
    { id: "claude-opus-4-6-20250819", label: "Claude Opus 4.6" },
  ],
  google: [
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { id: "gemini-3-flash", label: "Gemini 3 Flash" },
    { id: "gemini-3-flash-lite", label: "Gemini 3 Flash-Lite" },
    { id: "gemini-3-pro", label: "Gemini 3 Pro" },
    { id: "gemini-3.1-pro", label: "Gemini 3.1 Pro" },
  ],
};

export const PROVIDER_MODEL_PRIORITY: Record<LlmProvider, string[]> = {
  openai: ["gpt-4.1", "gpt-5-nano", "gpt-5-mini", "gpt-5"],
  anthropic: [
    "claude-haiku-4-5-20251001",
    "claude-sonnet-4-6-20250819",
    "claude-opus-4-6-20250819",
  ],
  google: [
    "gemini-2.5-flash",
    "gemini-3-flash-lite",
    "gemini-3-flash",
    "gemini-3-pro",
  ],
};

export const SCHEDULE_LABELS: Record<AgentSchedule, string> = {
  "6h": "Every 6 hours",
  "12h": "Every 12 hours",
  daily: "Daily",
  weekly: "Weekly",
};

export const SCHEDULE_MS: Record<AgentSchedule, number> = {
  "6h": 6 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

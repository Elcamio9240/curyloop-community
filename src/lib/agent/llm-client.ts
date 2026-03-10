import { generateObject, generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod/v4";
import type {
  LlmProvider,
  SuggestedSite,
  CrawledContent,
  RelevanceResult,
} from "./types";
import { PROVIDER_MODEL_PRIORITY } from "./types";

function getModel(provider: LlmProvider, apiKey: string, modelId: string) {
  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey })(modelId);
    case "anthropic":
      return createAnthropic({ apiKey })(modelId);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(modelId);
  }
}

export async function testLlmKey(
  provider: LlmProvider,
  apiKey: string,
  modelId: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const model = getModel(provider, apiKey, modelId);
    await generateText({
      model,
      prompt: "Say hello in one word.",
      maxOutputTokens: 20,
    });
    return { valid: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { valid: false, error: msg };
  }
}

export async function detectModel(
  provider: LlmProvider,
  apiKey: string
): Promise<{ model: string | null; error?: string }> {
  const models = PROVIDER_MODEL_PRIORITY[provider];
  const errors: string[] = [];

  for (const modelId of models) {
    const result = await testLlmKey(provider, apiKey, modelId);
    if (result.valid) {
      return { model: modelId };
    }
    errors.push(`${modelId}: ${result.error}`);
  }

  return {
    model: null,
    error: `No accessible model found. Tried: ${models.join(", ")}`,
  };
}

export async function suggestSites(
  provider: LlmProvider,
  apiKey: string,
  topics: { topic: string; description?: string | null }[],
  modelId: string,
  maxSites = 15
): Promise<{ sites: SuggestedSite[]; tokensUsed: number }> {
  const model = getModel(provider, apiKey, modelId);
  const topicList = topics
    .map((t) => (t.description ? `${t.topic}: ${t.description}` : t.topic))
    .join("\n");

  const { object, usage } = await generateObject({
    model,
    abortSignal: AbortSignal.timeout(60_000),
    schema: z.object({
      sites: z.array(
        z.object({
          url: z.string(),
          name: z.string(),
          domain: z.string(),
          reason: z.string(),
        })
      ),
    }),
    prompt: `You are a content curator. Given the following topics of interest, suggest up to ${maxSites} high-quality websites, blogs, or news sources that regularly publish content about these topics. Focus on authoritative sources with RSS/Atom feeds when possible.

Topics:
${topicList}

Return sites as JSON with url, name, domain, and a brief reason why it's relevant.`,
  });

  return {
    sites: object.sites,
    tokensUsed: usage?.totalTokens ?? 0,
  };
}

export async function analyzeRelevance(
  provider: LlmProvider,
  apiKey: string,
  topics: { topic: string; description?: string | null }[],
  contents: CrawledContent[],
  modelId: string
): Promise<{ results: RelevanceResult[]; tokensUsed: number }> {
  const model = getModel(provider, apiKey, modelId);
  const topicList = topics.map((t) => t.topic).join(", ");

  const { object, usage } = await generateObject({
    model,
    abortSignal: AbortSignal.timeout(60_000),
    schema: z.object({
      results: z.array(
        z.object({
          url: z.string(),
          title: z.string(),
          description: z.string(),
          score: z.number(),
          matchedTopics: z.array(z.string()),
        })
      ),
    }),
    prompt: `You are a content relevance analyzer. Given the user's topics of interest and a list of articles, score each article's relevance from 0.0 to 1.0.

User's topics: ${topicList}

Articles to analyze:
${JSON.stringify(contents.map((c) => ({ url: c.url, title: c.title, description: c.description?.slice(0, 500) })))}

For each article, return:
- url: the article URL
- title: the article title
- description: a concise 1-2 sentence summary
- score: relevance score 0.0-1.0 (1.0 = highly relevant)
- matchedTopics: which user topics this article matches`,
  });

  return {
    results: object.results,
    tokensUsed: usage?.totalTokens ?? 0,
  };
}

export async function summarizeItem(
  provider: LlmProvider,
  apiKey: string,
  url: string,
  title: string,
  description?: string,
  modelId?: string
): Promise<string> {
  const mid = modelId ?? PROVIDER_MODEL_PRIORITY[provider][0];
  const model = getModel(provider, apiKey, mid);

  const { text } = await generateText({
    model,
    prompt: `Summarize the following article in 2-3 concise sentences. Focus on the key insights and takeaways.

Title: ${title}
URL: ${url}
${description ? `Description: ${description}` : ""}

Summary:`,
    maxOutputTokens: 200,
  });

  return text.trim();
}

export async function summarizeSession(
  provider: LlmProvider,
  apiKey: string,
  items: Array<{ title: string; url: string; description?: string }>,
  modelId?: string
): Promise<string> {
  const mid = modelId ?? PROVIDER_MODEL_PRIORITY[provider][0];
  const model = getModel(provider, apiKey, mid);

  const itemList = items
    .map(
      (i, idx) =>
        `${idx + 1}. ${i.title} (${i.url})${i.description ? ` - ${i.description}` : ""}`
    )
    .join("\n");

  const { text } = await generateText({
    model,
    prompt: `You are given a collection of curated links/articles from a session. Write a concise 3-5 sentence summary that captures the overall themes and key highlights across all items.

Items:
${itemList}

Session Summary:`,
    maxOutputTokens: 300,
  });

  return text.trim();
}

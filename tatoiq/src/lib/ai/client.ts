import 'server-only';

/**
 * client.ts — server-only AI drafting adapter (Phase 2).
 *
 * Mirrors the existing Saggio provider pattern: a plain `fetch` to OpenAI with
 * an offline/mock fallback when no key is configured. NEVER claims success when
 * the provider is unavailable — it returns `mock: true` so callers can label it.
 */

export interface DraftRequest {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}

export interface DraftResponse {
  text: string;
  model: string;
  mock: boolean;
}

export function aiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function draftModel(): string {
  return process.env.AI_DRAFT_MODEL || 'gpt-4o';
}

const MOCK_DRAFT =
  'Hi — this is a development-mode draft. (OPENAI_API_KEY is not configured, so no model was called.) ' +
  'In production, an approved reviewer edits and releases this message.';

/**
 * Generate an outreach draft. Returns mock content (flagged) when the provider
 * is not configured or on any error, so nothing is ever silently faked.
 */
export async function generateDraft(request: DraftRequest): Promise<DraftResponse> {
  const model = draftModel();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { text: MOCK_DRAFT, model: 'mock', mock: true };
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: request.temperature ?? 0.3,
        max_tokens: request.maxTokens ?? 600,
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.user },
        ],
      }),
    });

    if (!res.ok) {
      return { text: MOCK_DRAFT, model: 'mock', mock: true };
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return { text: MOCK_DRAFT, model: 'mock', mock: true };
    return { text, model, mock: false };
  } catch {
    return { text: MOCK_DRAFT, model: 'mock', mock: true };
  }
}

/**
 * provider.ts — SERVER-ONLY LLM adapter for Saggio.
 *
 * Runs only inside the API route. If OPENAI_API_KEY is absent, Saggio stays in
 * offline grounded mode (core.ts) and NEVER calls out. When a key IS present,
 * only REDACTED context + retrieved IRS chunks are sent (see route.ts).
 *
 * The spec requires a data-flow/permissions/contract review before any real
 * taxpayer data reaches OpenAI. Until that review is approved, this adapter is
 * fed synthetic/redacted content only.
 */

export function hasLlmProvider(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function modelName(): string {
  return process.env.SAGGIO_MODEL || 'gpt-4o-mini';
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Ask the model to compose a plain-language answer STRICTLY from the provided
 * IRS chunks. Returns null when no provider is configured or on any error, so
 * the caller falls back to the deterministic grounded answer.
 */
export async function composeGroundedAnswer(
  question: string,
  chunks: Array<{ source: string; section: string; content: string }>,
): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const system =
    'You are Saggio, a tax-education assistant for TatoIQ. Answer ONLY using the ' +
    'provided IRS excerpts. Do not invent rules, citations, or numbers. If the ' +
    'excerpts do not answer the question, say that plainly instead of guessing. ' +
    'Keep a calm, plain-language tone for someone who knows their business but not ' +
    'tax terms. This is federal tax education for tax year 2025, not individualized ' +
    'professional advice, and state or local rules may differ.';

  const context = chunks
    .map((c) => `SOURCE: ${c.source} — ${c.section}\n${c.content}`)
    .join('\n\n');

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: modelName(),
        temperature: 0.1,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: `IRS excerpts:\n${context}\n\nQuestion: ${question}` },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

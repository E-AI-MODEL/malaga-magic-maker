export const MAX_MESSAGES = 12;
export const MAX_USER_MESSAGE_LENGTH = 6000;
export const MAX_ASSISTANT_MESSAGE_LENGTH = 4000;

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** Validate chat history: last 12 messages, last one from the user, assistant turns capped. */
export function normalizeMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value)) return null;
  const out: ChatMessage[] = [];
  for (const message of value.slice(-MAX_MESSAGES)) {
    if (!message || typeof message !== "object") return null;
    const role = (message as Record<string, unknown>).role;
    const content = (message as Record<string, unknown>).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const trimmed = content.trim();
    const max = role === "assistant" ? MAX_ASSISTANT_MESSAGE_LENGTH : MAX_USER_MESSAGE_LENGTH;
    if (!trimmed || trimmed.length > max) return null;
    out.push({ role, content: trimmed });
  }
  if (out.length === 0 || out[out.length - 1].role !== "user") return null;
  return out;
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function getModels() {
  const primary = process.env.OPENROUTER_MODEL || 'openai/gpt-5.2-chat';
  const fallbacks = (process.env.OPENROUTER_FALLBACK_MODELS || '')
    .split(',').map(value => value.trim()).filter(Boolean).slice(0, 3);
  return [primary, ...fallbacks];
}

async function chat({ messages, tools = [], toolChoice = 'auto' }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    const error = new Error('OPENROUTER_API_KEY is not configured');
    error.code = 'OPENROUTER_NOT_CONFIGURED';
    throw error;
  }

  let lastError;
  for (const model of getModels()) {
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          ...(process.env.OPENROUTER_HTTP_REFERER ? { 'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER } : {}),
          ...(process.env.OPENROUTER_X_TITLE ? { 'X-Title': process.env.OPENROUTER_X_TITLE } : {})
        },
        body: JSON.stringify({
          model,
          messages,
          ...(tools.length ? { tools, tool_choice: toolChoice, parallel_tool_calls: false } : {}),
          temperature: 0.2
        }),
        signal: AbortSignal.timeout(Number(process.env.OPENROUTER_TIMEOUT_MS || 20000))
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message || `OpenRouter HTTP ${response.status}`);
      return { model, response: payload };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('OpenRouter request failed');
}

module.exports = { chat, getModels };

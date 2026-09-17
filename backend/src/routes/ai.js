const express = require('express');
const { chat } = require('../ai/openrouter');
const { tools, executeTool } = require('../ai/tools');

const router = express.Router();
const SYSTEM_PROMPT = `You are WeFinance AI, a financial record assistant inside the user's own WeFinance account.
Rules:
- Answer in Indonesian unless the user asks for another language.
- Use tools for factual questions about the user's financial data. Never invent balances, transactions, or totals.
- You are read-only in this first phase. Do not claim to create, edit, delete, pay, or transfer anything.
- Give concise, practical explanations. Show amounts in Indonesian Rupiah when appropriate.
- Do not provide regulated financial advice or guarantee investment outcomes.
- Treat the database/tool result as the source of truth.`;

function safeMessageContent(message) {
  if (typeof message?.content === 'string') return message.content;
  return '';
}

router.post('/chat', async (req, res, next) => {
  const { message, history = [] } = req.body || {};
  const userId = req.user.id;

  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  const normalizedHistory = Array.isArray(history)
    ? history.slice(-8).filter(item => ['user', 'assistant'].includes(item?.role) && typeof item?.content === 'string')
    : [];

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...normalizedHistory,
    { role: 'user', content: message.trim() }
  ];

  try {
    let result = await chat({ messages, tools });
    for (let step = 0; step < 3; step += 1) {
      const assistant = result.response?.choices?.[0]?.message;
      if (!assistant) throw new Error('OpenRouter returned no assistant message');

      const toolCalls = Array.isArray(assistant.tool_calls) ? assistant.tool_calls : [];
      if (!toolCalls.length) {
        return res.json({
          data: {
            message: safeMessageContent(assistant),
            model: result.model,
            readOnly: true
          }
        });
      }

      messages.push({
        role: 'assistant',
        content: assistant.content || null,
        tool_calls: toolCalls
      });

      for (const toolCall of toolCalls) {
        let args;
        try {
          args = JSON.parse(toolCall.function?.arguments || '{}');
        } catch (_error) {
          throw new Error(`Invalid arguments for tool ${toolCall.function?.name || 'unknown'}`);
        }
        const output = await executeTool(toolCall.function?.name, { ...args, userId }, userId);
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(output)
        });
      }

      result = await chat({ messages, tools });
    }

    return res.status(502).json({ error: 'AI tool loop exceeded the safety limit' });
  } catch (error) {
    if (error.code === 'OPENROUTER_NOT_CONFIGURED') {
      return res.status(503).json({ error: 'OpenRouter AI is not configured on the server' });
    }
    next(error);
  }
});

router.get('/status', (_req, res) => {
  res.json({
    configured: Boolean(process.env.OPENROUTER_API_KEY),
    models: process.env.OPENROUTER_MODEL || 'openai/gpt-5.2-chat',
    readOnly: true
  });
});

module.exports = router;

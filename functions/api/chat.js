/**
 * Cloudflare Pages Function: /api/chat
 *
 * Proxies streaming chat requests to Gemini via Google's Generative Language API.
 *
 * Required environment variable (set in Cloudflare dashboard or wrangler secret):
 *   GEMINI_API_KEY  — Google AI Studio API key
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { messages, pageContext } = body;

    if (!messages || !Array.isArray(messages)) {
      return jsonError('messages 参数无效', 400);
    }

    const systemPrompt =
      `你是一位专业的跨境投资分析助手，擅长全球宏观经济、主权财富基金、贸易政策、` +
      `生物医药融资、跨境电商、基础设施M&A及地缘政治风险分析。\n\n` +
      `以下是用户当前正在阅读的《跨境投资日报》全文，请优先基于简报内容回答，` +
      `不足部分可补充背景知识。请用中文回答，保持专业、简洁的风格。\n\n` +
      `【简报内容】\n${pageContext || '（未获取到简报内容）'}`;

    return callGemini(env.GEMINI_API_KEY, systemPrompt, messages);
  } catch (e) {
    return jsonError(e.message || '服务器内部错误', 500);
  }
}

/* ── Gemini (Google Generative Language) ──────────────────────────────────── */

async function callGemini(apiKey, systemPrompt, messages) {
  if (!apiKey) {
    return jsonError(
      'GEMINI_API_KEY 未配置。若当前是分支预览链接，请在 Cloudflare 项目 Settings → Environment variables 中为 **Preview** 添加 GEMINI_API_KEY 并重新部署。',
      500
    );
  }

  // Convert OpenAI-style messages to Gemini contents format
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`;

  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
    }),
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    return jsonError(`Gemini API 错误 (${upstream.status}): ${errText}`, upstream.status);
  }

  // Transform Gemini SSE  →  OpenAI-compatible SSE so the client code stays unified
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  (async () => {
    const reader = upstream.body.getReader();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          await writer.write(enc.encode('data: [DONE]\n\n'));
          break;
        }
        buffer += dec.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === '[DONE]') continue;
          try {
            const geminiChunk = JSON.parse(raw);
            const text = geminiChunk.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              const openAIChunk = { choices: [{ delta: { content: text } }] };
              await writer.write(enc.encode(`data: ${JSON.stringify(openAIChunk)}\n\n`));
            }
          } catch {
            // Ignore malformed JSON chunks
          }
        }
      }
    } catch (err) {
      await writer.abort(err);
      return;
    }
    await writer.close();
  })();

  return new Response(readable, {
    headers: { ...CORS_HEADERS, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function jsonError(message, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

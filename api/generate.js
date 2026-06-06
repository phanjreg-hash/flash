// In-memory rate limiter map: { ip: { tokens, lastRefill } }
const RATE_LIMIT = 60; // requests
const RATE_PERIOD = 60 * 1000; // per minute
const buckets = new Map();

function getClientIp(req) {
  return req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
}

export default async function handler(req, res) {
  // Multi-provider proxy for AI generation. Expects JSON { provider, prompt, options }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { provider = 'openai', prompt, options = {} } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  // Simple token-bucket rate limiting per IP (best-effort on serverless)
  const ip = getClientIp(req);
  const now = Date.now();
  let bucket = buckets.get(ip);
  if (!bucket) {
    bucket = { tokens: RATE_LIMIT, last: now };
    buckets.set(ip, bucket);
  }
  const elapsed = now - bucket.last;
  const refill = Math.floor(elapsed / RATE_PERIOD) * RATE_LIMIT;
  if (refill > 0) {
    bucket.tokens = Math.min(RATE_LIMIT, bucket.tokens + refill);
    bucket.last = now;
  }
  if (bucket.tokens <= 0) {
    console.warn(`Rate limit exceeded for ${ip}`);
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  bucket.tokens -= 1;

  console.log(`Proxy request from ${ip} -> provider=${provider} promptLen=${prompt.length}`);

  try {
    const overrideKey = req.body.overrideKey;
    // OpenAI
    if (provider === 'openai') {
      const key = overrideKey || process.env.OPENAI_KEY;
      if (!key) return res.status(500).json({ error: 'OpenAI key not configured' });

      const payload = {
        model: options.model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.max_tokens || 512
      };

      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify(payload)
      });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    // Google Gemini (Generative Language API)
    if (provider === 'google_gemini') {
      const key = overrideKey || process.env.GOOGLE_GEMINI_KEY;
      if (!key) return res.status(500).json({ error: 'Google Gemini key not configured' });
      const model = options.model || 'models/text-bison-001';
      const body = { prompt: { text: prompt }, temperature: options.temperature || 0.2, maxOutputTokens: options.max_tokens || 512 };
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta2/${model}:generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify(body)
      });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    // Anthropic Claude
    if (provider === 'anthropic_claude') {
      const key = overrideKey || process.env.ANTHROPIC_KEY;
      if (!key) return res.status(500).json({ error: 'Anthropic key not configured' });
      const model = options.model || 'claude-2.1';
      const payload = { model, prompt, max_tokens_to_sample: options.max_tokens || 512 };
      const r = await fetch('https://api.anthropic.com/v1/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key },
        body: JSON.stringify(payload)
      });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    // Hugging Face Inference
    if (provider === 'huggingface') {
      const key = overrideKey || process.env.HUGGINGFACE_KEY;
      if (!key) return res.status(500).json({ error: 'Hugging Face key not configured' });
      const model = options.model || 'gpt2';
      const r = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: prompt })
      });
      const data = await r.json();
      return res.status(r.status || 200).json(data);
    }

    // Together AI
    if (provider === 'together_ai') {
      const key = overrideKey || process.env.TOGETHER_AI_KEY;
      if (!key) return res.status(500).json({ error: 'Together AI key not configured' });
      const model = options.model || 'meta-llama/Llama-2-13b';
      const r = await fetch(`https://api.together.xyz/generative/${model}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${key}` },
        body: JSON.stringify({ input: prompt })
      });
      const data = await r.json();
      return res.status(r.status || 200).json(data);
    }

    // Grok / xAI (best-effort)
    if (provider === 'grok') {
      const key = overrideKey || process.env.GROK_KEY;
      if (!key) return res.status(500).json({ error: 'Grok key not configured' });
      const r = await fetch('https://api.grok.ai/v1/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ prompt, model: options.model || 'grok' })
      });
      const data = await r.json();
      return res.status(r.status || 200).json(data);
    }

    return res.status(400).json({ error: 'Unsupported provider' });
  } catch (err) {
    console.error('Proxy error', err);
    return res.status(500).json({ error: 'Proxy error', detail: String(err) });
  }
}

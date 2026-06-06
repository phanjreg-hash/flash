export default async function handler(req, res) {
  // Simple proxy for AI generation. Expects JSON { provider, prompt, options }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { provider = 'openai', prompt, options = {} } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  try {
    if (provider === 'openai') {
      const key = process.env.OPENAI_KEY;
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

    // Other providers can be added similarly by reading env vars and forwarding
    return res.status(400).json({ error: 'Unsupported provider' });
  } catch (err) {
    console.error('Proxy error', err);
    return res.status(500).json({ error: 'Proxy error', detail: String(err) });
  }
}

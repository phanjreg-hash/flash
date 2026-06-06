export default async function handler(req, res) {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const REPO = process.env.GITHUB_REPO || 'phanjreg-hash/flash';
  const [owner, repo] = REPO.split('/');
  const path = 'api.defaults.json';

  if (!GITHUB_TOKEN) return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });

  const githubHeaders = {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'flash-admin'
  };

  try {
    if (req.method === 'GET') {
      const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        { headers: githubHeaders });
      if (!r.ok) return res.status(r.status).json({ error: 'Failed to fetch defaults from GitHub', detail: await r.text() });
      const data = await r.json();
      const content = Buffer.from(data.content, 'base64').toString('utf8');
      return res.status(200).json({ content: JSON.parse(content), sha: data.sha });
    }

    if (req.method === 'POST') {
      const { password, content } = req.body || {};
      if (!ADMIN_PASSWORD) return res.status(500).json({ error: 'ADMIN_PASSWORD not configured' });
      if (!password || password !== ADMIN_PASSWORD) return res.status(403).json({ error: 'Unauthorized' });
      if (!content) return res.status(400).json({ error: 'Missing content' });

      // Get current file to obtain sha
      const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        { headers: githubHeaders });
      if (!r.ok) return res.status(r.status).json({ error: 'Failed to fetch current file', detail: await r.text() });
      const data = await r.json();
      const sha = data.sha;

      const newContent = JSON.stringify(content, null, 2);
      const payload = {
        message: 'Update api.defaults.json via admin UI',
        content: Buffer.from(newContent, 'utf8').toString('base64'),
        sha,
        branch: 'main'
      };

      const put = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: githubHeaders,
        body: JSON.stringify(payload)
      });
      if (!put.ok) return res.status(put.status).json({ error: 'Failed to update file', detail: await put.text() });
      const resData = await put.json();
      return res.status(200).json({ ok: true, commit: resData.commit });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end('Method not allowed');
  } catch (err) {
    console.error('Admin defaults error', err);
    return res.status(500).json({ error: 'Server error', detail: String(err) });
  }
}

// Simple local development image proxy server
// GET /image?id=<DRIVE_FILE_ID> or /image?url=<URL>

const http = require('http');
const url = require('url');
const fetch = require('node-fetch');

const PORT = process.env.LOCAL_IMAGE_PROXY_PORT ? Number(process.env.LOCAL_IMAGE_PROXY_PORT) : 5050;

function buildTargetUrl(query) {
  const { id, url: rawUrl } = query;
  if (id) return `https://drive.google.com/uc?id=${encodeURIComponent(id)}`;
  if (rawUrl) {
    try {
      const u = new URL(rawUrl);
      const fileMatch = u.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      const extractedId = fileMatch ? fileMatch[1] : (u.searchParams.get('id') || null);
      if (extractedId) return `https://drive.google.com/uc?id=${encodeURIComponent(extractedId)}`;
      return rawUrl;
    } catch {
      return null;
    }
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'method_not_allowed' }));
  }
  if (parsed.pathname !== '/image') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'not_found' }));
  }

  const targetUrl = buildTargetUrl(parsed.query);
  if (!targetUrl) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'missing_id_or_url' }));
  }

  try {
    const response = await fetch(targetUrl, { redirect: 'follow' });
    if (!response.ok) {
      res.writeHead(response.status, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'fetch_failed', status: response.status }));
    }
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const buffer = await response.buffer();
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(buffer);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'internal_error', message: String((err && err.message) || err) }));
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[local-image-proxy] listening on http://localhost:${PORT}/image`);
});
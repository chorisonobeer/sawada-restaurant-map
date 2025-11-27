// Netlify Function: image-proxy
// Usage: /.netlify/functions/image-proxy?id=<DRIVE_FILE_ID>
//        /.netlify/functions/image-proxy?url=<original_url>
// - For Google Drive URLs, extracts id and fetches raw image via uc?id=.
// - Streams binary with correct content-type.

const ALLOWED_HOSTS = new Set([
  'drive.google.com',
  'lh3.googleusercontent.com',
]);

function extractDriveId(inputUrl) {
  try {
    const url = new URL(inputUrl);
    // /file/d/<id>
    const fileMatch = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) return fileMatch[1];
    // open?id=<id>
    const openId = url.searchParams.get('id');
    if (openId) return openId;
    // uc?id=<id>
    const ucId = url.searchParams.get('id');
    if (ucId) return ucId;
  } catch (e) {
    // ignore
  }
  return null;
}

exports.handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const id = params.id;
    const rawUrl = params.url;

    let targetUrl = null;

    if (id) {
      targetUrl = `https://drive.google.com/uc?id=${encodeURIComponent(id)}`;
    } else if (rawUrl) {
      // If it's a Drive URL, convert to uc?id
      const driveId = extractDriveId(rawUrl);
      if (driveId) {
        targetUrl = `https://drive.google.com/uc?id=${encodeURIComponent(driveId)}`;
      } else {
        // Otherwise, allow only specific hosts
        try {
          const u = new URL(rawUrl);
          if (!ALLOWED_HOSTS.has(u.hostname)) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ error: 'host_not_allowed' }),
            };
          }
          targetUrl = rawUrl;
        } catch {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'invalid_url' }),
          };
        }
      }
    } else {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'missing_id_or_url' }),
      };
    }

    // Fetch binary and stream back
    const res = await fetch(targetUrl, { redirect: 'follow' });
    if (!res.ok) {
      return {
        statusCode: res.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'fetch_failed', status: res.status }),
      };
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await res.arrayBuffer();
    const base64Body = Buffer.from(arrayBuffer).toString('base64');

    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800', // 7日間キャッシュ
      },
      body: base64Body,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'internal_error', message: String((err && err.message) || err) }),
    };
  }
};
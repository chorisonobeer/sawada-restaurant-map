/* eslint-env worker */

// Lightweight Haversine distance worker
// Input: { shops: Array<Pwamap.ShopData>, position: [lng, lat] }
// Output: { distances: Array<{ index: number, distance: number }>, error?: string }

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineMeters(lng1, lat1, lng2, lat2) {
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

onmessage = function (e) {
  try {
    const { shops, position } = e.data;
    if (!Array.isArray(shops) || !Array.isArray(position) || position.length !== 2) {
      postMessage({ error: 'Invalid payload' });
      return;
    }
    const [fromLng, fromLat] = position;
    const distances = [];
    for (let i = 0; i < shops.length; i++) {
      const shop = shops[i];
      const lng = parseFloat(shop['経度']);
      const lat = parseFloat(shop['緯度']);
      if (Number.isNaN(lng) || Number.isNaN(lat)) {
        continue;
      }
      const d = haversineMeters(fromLng, fromLat, lng, lat);
      distances.push({ index: shop.index, distance: d });
    }
    postMessage({ distances });
  } catch (err) {
    postMessage({ error: err && err.message ? err.message : 'Unknown error' });
  }
};
import { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import config from '../../config.json';
import { getJSON, setJSON } from '../../utils/idbStore';
import zen2han from '../../lib/zen2han';

// Google Drive 画像URLをプロキシ化
const transformImageUrl = (url?: string): string | undefined => {
  if (!url) return url;

  // すでに許可された形式（相対パスやHTTP(S)以外）ならそのまま返す
  if (url.startsWith('/') || url.startsWith('data:')) return url;

  // Google Driveの各種URLからIDを抽出
  const patterns = [
    /https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /https?:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /https?:\/\/drive\.google\.com\/uc\?(?:export=(?:view|download)&)?id=([a-zA-Z0-9_-]+)/,
    /https?:\/\/drive\.google\.com\/thumbnail\?id=([a-zA-Z0-9_-]+)/
  ];
  let id: string | null = null;
  for (const re of patterns) {
    const m = url.match(re);
    if (m && m[1]) { id = m[1]; break; }
  }

  // IDが取れない場合はそのまま返す（外部ホストやローカル画像など）
  if (!id) return url;

  // 実行環境に応じてプロキシベースURLを決定
  const isLocal = typeof window !== 'undefined' && (/^localhost$|^127\.0\.0\.1$/.test(window.location.hostname) || window.location.hostname === '::1');
  const proxyBase = isLocal
    ? (config.image_proxy_url_dev || config.image_proxy_url)
    : (config.image_proxy_url || '/.netlify/functions/image-proxy');

  // プロキシURLを返す（本番はNetlify Functionsを前提）
  if (proxyBase) {
    return `${proxyBase}?id=${encodeURIComponent(id)}`;
  }

  // フォールバック：サムネイルAPI（主にローカルでの確認用）
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w640`;
};

const sortShopList = (shopList: Pwamap.ShopData[]) => {
  return new Promise<Pwamap.ShopData[]>((resolve) => {
    const sortedList = shopList.sort((item1, item2) => {
      return Date.parse(item2['タイムスタンプ']) - Date.parse(item1['タイムスタンプ']);
    });
    resolve(sortedList);
  });
};

const sanitizeShop = (input: Pwamap.ShopData, index?: number): Pwamap.ShopData => {
  const toStr = (v: any) => (v == null ? '' : String(v));
  const name = toStr(input['スポット名']).trim();
  const latStr = zen2han(toStr(input['緯度'])).trim();
  const lngStr = zen2han(toStr(input['経度'])).trim();
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  const imageUrlBase = toStr(input['画像']).trim();
  const image2UrlBase = toStr(input['画像2']).trim();
  const image3UrlBase = toStr(input['画像3']).trim();
  const image4UrlBase = toStr(input['画像4']).trim();
  const image5UrlBase = toStr(input['画像5']).trim();
  const imageUrl = imageUrlBase ? (transformImageUrl(imageUrlBase) || imageUrlBase) : '';
  const image2Url = image2UrlBase ? (transformImageUrl(image2UrlBase) || image2UrlBase) : '';
  const image3Url = image3UrlBase ? (transformImageUrl(image3UrlBase) || image3UrlBase) : '';
  const image4Url = image4UrlBase ? (transformImageUrl(image4UrlBase) || image4UrlBase) : '';
  const image5Url = image5UrlBase ? (transformImageUrl(image5UrlBase) || image5UrlBase) : '';
  return {
    ...input,
    index: typeof index === 'number' ? index : (input.index ?? 0),
    スポット名: name,
    カテゴリ: toStr(input['カテゴリ']),
    紹介文: toStr(input['紹介文']),
    営業時間: toStr(input['営業時間']),
    定休日: toStr(input['定休日']),
    エリア: toStr(input['エリア']),
    住所: toStr(input['住所']),
    TEL: toStr(input['TEL']),
    Instagram: toStr(input['Instagram']),
    X: toStr(input['X']),
    公式サイト: toStr(input['公式サイト']),
    Facebook: toStr(input['Facebook']),
    予約有無: toStr(input['予約有無']),
    タグ: toStr(input['タグ']),
    画像: imageUrl,
    画像2: image2Url,
    画像3: image3Url,
    画像4: image4Url,
    画像5: image5Url,
    緯度: String(lat),
    経度: String(lng)
  } as Pwamap.ShopData;
};

const useShopData = () => {
  const [shopList, setShopList] = useState<Pwamap.ShopData[]>([]);
  const [error, setError] = useState<string>("");

  const fetchShopData = useCallback(async () => {
    setError("");
    const cacheKey = "shopListCache:v2";

    try {
      const cached = await getJSON<Pwamap.ShopData[]>(cacheKey, 1440); // 24時間
      if (cached && Array.isArray(cached) && cached.length > 0) {
        const sanitized = cached.map((shop, i) => sanitizeShop(shop, i))
          .filter((s) => Boolean(s['スポット名']) && Number.isFinite(parseFloat(String(s['緯度']))) && Number.isFinite(parseFloat(String(s['経度']))));
        setShopList(sanitized);
        // バックグラウンドで最新データ取得
        fetch(config.data_url)
          .then((response) => {
            if (!response.ok) throw new Error("データの取得に失敗しました");
            return response.text();
          })
          .then((data) => {
            Papa.parse(data, {
              header: true,
              complete: (results) => {
                const features = results.data;
                const nextShopList: Pwamap.ShopData[] = [];
                for (let i = 0; i < features.length; i++) {
                  const feature = features[i] as Pwamap.ShopData;
                  const name = (feature['スポット名'] || '').toString().trim();
                  const rawLat = (feature['緯度'] || '').toString();
                  const rawLng = (feature['経度'] || '').toString();
                  const latStr = zen2han(rawLat).trim();
                  const lngStr = zen2han(rawLng).trim();
                  const lat = parseFloat(latStr);
                  const lng = parseFloat(lngStr);
                  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
                  const imageRaw = (feature['画像'] || '').toString().trim();
                  const imageUrl = transformImageUrl(imageRaw) || imageRaw;
                  const image2Raw = (feature['画像2'] || '').toString().trim();
                  const image3Raw = (feature['画像3'] || '').toString().trim();
                  const image4Raw = (feature['画像4'] || '').toString().trim();
                  const image5Raw = (feature['画像5'] || '').toString().trim();
                  const image2Url = transformImageUrl(image2Raw) || image2Raw;
                  const image3Url = transformImageUrl(image3Raw) || image3Raw;
                  const image4Url = transformImageUrl(image4Raw) || image4Raw;
                  const image5Url = transformImageUrl(image5Raw) || image5Raw;
                  const shop = {
                    index: i,
                    ...feature,
                    スポット名: name,
                    カテゴリ: (feature['カテゴリ'] || '').toString(),
                    紹介文: (feature['紹介文'] || '').toString(),
                    営業時間: (feature['営業時間'] || '').toString(),
                    定休日: (feature['定休日'] || '').toString(),
                    エリア: (feature['エリア'] || '').toString(),
                    住所: (feature['住所'] || '').toString(),
                    TEL: (feature['TEL'] || '').toString(),
                    Instagram: (feature['Instagram'] || '').toString(),
                    X: (feature['X'] || '').toString(),
                    公式サイト: (feature['公式サイト'] || '').toString(),
                    Facebook: (feature['Facebook'] || '').toString(),
                    予約有無: (feature['予約有無'] || '').toString(),
                    タグ: (feature['タグ'] || '').toString(),
                    画像: imageUrl,
                    画像2: image2Url,
                    画像3: image3Url,
                    画像4: image4Url,
                    画像5: image5Url,
                    緯度: String(lat),
                    経度: String(lng)
                  } as Pwamap.ShopData;
                  nextShopList.push(shop);
                }
                sortShopList(nextShopList).then(async (sortedShopList) => {
                  setShopList(sortedShopList);
                  await setJSON(cacheKey, sortedShopList);
                });
              },
              error: () => {
                setError("CSVパースエラー");
              }
            });
          })
          .catch((e) => {
            setError(e.message);
          });
      } else {
        // キャッシュがない場合
        fetch(config.data_url)
          .then((response) => {
            if (!response.ok) throw new Error("データの取得に失敗しました");
            return response.text();
          })
          .then((data) => {
            Papa.parse(data, {
              header: true,
              complete: (results) => {
                const features = results.data;
                const nextShopList: Pwamap.ShopData[] = [];
                for (let i = 0; i < features.length; i++) {
                  const feature = features[i] as Pwamap.ShopData;
                  const name = (feature['スポット名'] || '').toString().trim();
                  const rawLat = (feature['緯度'] || '').toString();
                  const rawLng = (feature['経度'] || '').toString();
                  const latStr = zen2han(rawLat).trim();
                  const lngStr = zen2han(rawLng).trim();
                  const lat = parseFloat(latStr);
                  const lng = parseFloat(lngStr);
                  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
                  const imageRaw = (feature['画像'] || '').toString().trim();
                  const imageUrl = transformImageUrl(imageRaw) || imageRaw;
                  const image2Raw = (feature['画像2'] || '').toString().trim();
                  const image3Raw = (feature['画像3'] || '').toString().trim();
                  const image4Raw = (feature['画像4'] || '').toString().trim();
                  const image5Raw = (feature['画像5'] || '').toString().trim();
                  const image2Url = transformImageUrl(image2Raw) || image2Raw;
                  const image3Url = transformImageUrl(image3Raw) || image3Raw;
                  const image4Url = transformImageUrl(image4Raw) || image4Raw;
                  const image5Url = transformImageUrl(image5Raw) || image5Raw;
                  const shop = {
                    index: i,
                    ...feature,
                    スポット名: name,
                    カテゴリ: (feature['カテゴリ'] || '').toString(),
                    紹介文: (feature['紹介文'] || '').toString(),
                    営業時間: (feature['営業時間'] || '').toString(),
                    定休日: (feature['定休日'] || '').toString(),
                    エリア: (feature['エリア'] || '').toString(),
                    住所: (feature['住所'] || '').toString(),
                    TEL: (feature['TEL'] || '').toString(),
                    Instagram: (feature['Instagram'] || '').toString(),
                    X: (feature['X'] || '').toString(),
                    公式サイト: (feature['公式サイト'] || '').toString(),
                    Facebook: (feature['Facebook'] || '').toString(),
                    予約有無: (feature['予約有無'] || '').toString(),
                    タグ: (feature['タグ'] || '').toString(),
                    画像: imageUrl,
                    画像2: image2Url,
                    画像3: image3Url,
                    画像4: image4Url,
                    画像5: image5Url,
                    緯度: String(lat),
                    経度: String(lng)
                  } as Pwamap.ShopData;
                  nextShopList.push(shop);
                }
                sortShopList(nextShopList).then(async (sortedShopList) => {
                  setShopList(sortedShopList);
                  await setJSON(cacheKey, sortedShopList);
                });
              },
              error: () => {
                setError("CSVパースエラー");
              }
            });
          })
          .catch((e) => {
            setError(e.message);
          });
      }
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    fetchShopData();
  }, [fetchShopData]);

  return { shopList, error, refetch: fetchShopData };
};

export default useShopData;

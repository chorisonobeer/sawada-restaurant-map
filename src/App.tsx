/* 
 * /src/App.tsx
 * Last Modified: 2025-02-28 17:45:00
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Papa from 'papaparse';
import { GeolocationProvider } from './context/GeolocationContext';
import Home from './App/Home';
import List from './App/List';
import Category from './App/Category';
import Images from './App/Images';
import AboutUs from './App/AboutUs';
import Events from './App/Events';
import Tabbar from './App/Tabbar';
import LazyMap from './App/LazyMap';
import config from './config.json';
import './App.scss';
import { getJSON, setJSON } from './utils/idbStore';
import Analytics from './utils/analytics';

const App: React.FC = React.memo(() => {
  const [shopList, setShopList] = useState<Pwamap.ShopData[]>([]);
  const [error, setError] = useState<string>("");
  const [selectedShop, setSelectedShop] = useState<Pwamap.ShopData | undefined>(undefined);
  const [filteredShops, setFilteredShops] = useState<Pwamap.ShopData[]>([]);
  const location = useLocation();

  // ホームボタン押下時の処理: 詳細を閉じ、地図を現在位置へ
  const handleHomeClick = useCallback(() => {
    setSelectedShop(undefined);
    try {
      window.dispatchEvent(new Event('map:recenter'));
    } catch {}
  }, []);

  // Google Drive 画像URLをプロキシ化
  const transformImageUrl = useCallback((url?: string): string | undefined => {
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
  }, []);

  const sortShopList = useCallback((shopList: Pwamap.ShopData[]) => {
    return new Promise<Pwamap.ShopData[]>((resolve) => {
      const sortedList = shopList.sort((item1, item2) => {
        return Date.parse(item2['タイムスタンプ']) - Date.parse(item1['タイムスタンプ']);
      });
      resolve(sortedList);
    });
  }, []);


  useEffect(() => {
    setError("");
    const cacheKey = "shopListCache";

    (async () => {
      try {
        const cached = await getJSON<Pwamap.ShopData[]>(cacheKey);
        if (cached && Array.isArray(cached) && cached.length > 0) {
          setShopList(cached);
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
                    const latStr = require('./lib/zen2han').default(rawLat).trim();
                    const lngStr = require('./lib/zen2han').default(rawLng).trim();
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
                    const shop = { index: i, ...feature, 画像: imageUrl, 画像2: image2Url, 画像3: image3Url, 画像4: image4Url, 画像5: image5Url, 緯度: String(lat), 経度: String(lng) };
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
                    const latStr = require('./lib/zen2han').default(rawLat).trim();
                    const lngStr = require('./lib/zen2han').default(rawLng).trim();
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
                    const shop = { index: i, ...feature, 画像: imageUrl, 画像2: image2Url, 画像3: image3Url, 画像4: image4Url, 画像5: image5Url, 緯度: String(lat), 経度: String(lng) };
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
    })();
  }, [sortShopList, transformImageUrl]);

  // 店舗選択ハンドラ
  const handleSelectShop = useCallback((shop: Pwamap.ShopData) => {
    setSelectedShop(shop);
    // 計測: 店舗詳細を開いた
    Analytics.track('view_shop', {
      shop_name: (shop['スポット名'] || '').toString(),
      path: `${location.pathname}${location.hash}`,
    });
  }, [location.pathname, location.hash]);

  // 検索結果を受け取るハンドラ
  const handleSearchResults = useCallback((results: Pwamap.ShopData[]) => {
    setFilteredShops(results);
  }, []);

  // データが更新されたときにフィルタリング結果も更新
  useEffect(() => {
    if (shopList.length > 0) {
      setFilteredShops(shopList);
    }
  }, [shopList]);

  // 永続化されたMapコンポーネント
  const persistentMap = useMemo(() => {
    const isHomePage = location.pathname === '/';
    return (
      <LazyMap 
        data={filteredShops} 
        selectedShop={selectedShop}
        onSelectShop={handleSelectShop}
        initialData={shopList}
        style={{ 
          display: isHomePage ? 'block' : 'none',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: 'calc(100% - 50px)',
          zIndex: isHomePage ? 5 : -1,
          pointerEvents: isHomePage ? 'auto' : 'none'
        }}
      />
    );
  }, [filteredShops, selectedShop, handleSelectShop, shopList, location.pathname]);

  // メモ化されたルートコンポーネント
  const routes = useMemo(() => (
    <Routes>
      <Route path="/" element={
        <Home 
          data={shopList} 
          selectedShop={selectedShop}
          onSelectShop={handleSelectShop}
          onSearchResults={handleSearchResults}
        />
      } />
      <Route path="/list" element={<List data={shopList} />} />
      <Route path="/category" element={<Category data={shopList} />} />
      <Route path="/images" element={<Images data={shopList} />} />
      <Route path="/about" element={<AboutUs />} />
      <Route path="/events" element={<Events />} />
    </Routes>
  ), [shopList, selectedShop, handleSelectShop, handleSearchResults]);

  if (error) return <div className="app-error">{error}</div>;

  return (
    <GeolocationProvider>
      <div className="app">
        <div className="app-body">
          {routes}
        </div>
        {persistentMap}
        <div id="modal-root"></div>
        <div className="app-footer">
          <Tabbar onHomeClick={handleHomeClick} />
        </div>
      </div>
    </GeolocationProvider>
  );
});

App.displayName = 'App';

export default App;

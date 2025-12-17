import React, { useState, useEffect, useCallback, useRef, useContext } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import ShopListItem from './ShopListItem';
import Shop from './Shop';
import './List.scss';
import { useSearchParams, useNavigate } from "react-router-dom";

import { useSwipeable } from "react-swipeable";
import { GeolocationContext } from '../context/GeolocationContext';

// スケルトンローディングコンポーネント
const SkeletonItem = React.memo(() => (
  <div className="shop-list-item skeleton">
    <div className="skeleton-content">
      <div className="skeleton-title"></div>
      <div className="skeleton-text"></div>
    </div>
    <div className="skeleton-image"></div>
  </div>
));

type Props = {
  data: Pwamap.ShopData[];
};

// type ShopDataWithDistance = Pwamap.ShopData & { distance?: number };

// 軽量距離計算（Haversine）
const toRad = (deg: number) => (deg * Math.PI) / 180;
const haversineMeters = (from: [number, number], to: [number, number]) => {
  const [lng1, lat1] = from;
  const [lng2, lat2] = to;
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Worker 経由距離計算
const calculateDistancesWithWorker = (shops: Pwamap.ShopData[], position: number[]) => {
  return new Promise<(Pwamap.ShopData & { distance?: number })[]>((resolve, reject) => {
    try {
      const worker = new Worker('/workers/distance-worker.js');
      const timeout = setTimeout(() => {
        try { worker.terminate(); } catch (_) { }
        reject(new Error('Worker timeout'));
      }, 8000);
      worker.onmessage = (e: MessageEvent) => {
        clearTimeout(timeout);
        const { distances, error } = e.data as { distances?: { index: number, distance: number }[], error?: string };
        if (error) {
          reject(new Error(error));
          return;
        }
        const distanceMap = new Map<number, number>();
        for (const item of distances || []) {
          distanceMap.set(item.index, item.distance);
        }
        const processed = shops.map(shop => {
          const d = distanceMap.get(shop.index);
          return typeof d === 'number' ? { ...shop, distance: d } : shop;
        });
        resolve(processed);
        worker.terminate();
      };
      performance.mark('distance-worker-start');
      worker.postMessage({ shops, position });
    } catch (err) {
      reject(err as Error);
    }
  });
};

// キャッシュ設定
const CACHE_DURATION = 60 * 60 * 1000; // 1時間
const BATCH_SIZE = 50;
const INITIAL_LOAD_SIZE = 20;
const LOAD_MORE_SIZE = 15;

// 位置情報と距離計算のキャッシュ
let positionCache: { coords: { latitude: number; longitude: number }; timestamp: number } | null = null;
const distanceCache = new Map<string, number>();
const dataCache = new Map<string, Pwamap.ShopData[]>();

// キャッシュユーティリティ
const getCachedDistance = (shopId: string, position: number[]) => {
  const cacheKey = `${shopId}-${position.join(',')}`;
  return distanceCache.get(cacheKey) ?? null;
};

const setCachedDistance = (shopId: string, position: number[], distance: number) => {
  const cacheKey = `${shopId}-${position.join(',')}`;
  distanceCache.set(cacheKey, distance);
};

// バッチ処理による距離計算（フォールバック／メインスレッド）
const calculateDistancesInBatches = async (shops: Pwamap.ShopData[], position: number[]) => {
  const results: (Pwamap.ShopData & { distance?: number })[] = [];
  // キャッシュから既存の距離を取得
  const cachedShops = shops.map(shop => {
    const cachedDistance = getCachedDistance(shop.index.toString(), position);
    return cachedDistance !== null ? { ...shop, distance: cachedDistance } : shop;
  });
  // 未計算の店舗のみを抽出
  const uncachedShops = cachedShops.filter(shop => typeof shop.distance !== 'number');
  if (uncachedShops.length === 0) {
    return cachedShops;
  }
  for (let i = 0; i < uncachedShops.length; i += BATCH_SIZE) {
    const batch = uncachedShops.slice(i, i + BATCH_SIZE);
    const batchResults = await new Promise<(Pwamap.ShopData & { distance?: number })[]>((resolve) => {
      setTimeout(() => {
        const processed = batch.map(shop => {
          const lng = parseFloat(shop['経度']);
          const lat = parseFloat(shop['緯度']);
          if (Number.isNaN(lng) || Number.isNaN(lat)) {
            return shop;
          }
          const dist = haversineMeters([position[0], position[1]], [lng, lat]);
          setCachedDistance(shop.index.toString(), position, dist);
          return { ...shop, distance: dist };
        });
        resolve(processed);
      }, 0);
    });
    results.push(...batchResults);
  }
  return [...cachedShops.filter(shop => typeof shop.distance === 'number'), ...results];
};

const sortShopList = async (shopList: Pwamap.ShopData[], contextLocation?: [number, number] | null): Promise<(Pwamap.ShopData & { distance?: number })[]> => {
  const cacheKey = `sorted-${shopList.length}-${contextLocation ? contextLocation.join(',') : 'no-location'}`;
  const cachedData = dataCache.get(cacheKey);
  if (cachedData) {
    return cachedData as (Pwamap.ShopData & { distance?: number })[];
  }
  let currentPosition;
  if (contextLocation) {
    currentPosition = contextLocation;
    positionCache = {
      coords: { latitude: contextLocation[1], longitude: contextLocation[0] },
      timestamp: Date.now()
    };
  } else if (positionCache && Date.now() - positionCache.timestamp < CACHE_DURATION) {
    currentPosition = [positionCache.coords.longitude, positionCache.coords.latitude];
  } else {
    // 位置情報がない場合は UI をブロックせず即返す
    return shopList;
  }
  if (currentPosition) {
    try {
      let sortedData: (Pwamap.ShopData & { distance?: number })[] = [];
      try {
        sortedData = await calculateDistancesWithWorker(shopList, currentPosition);
        performance.mark('distance-worker-end');
        performance.measure('distance-worker', 'distance-worker-start', 'distance-worker-end');
      } catch (e) {
        // Worker が使えない場合はフォールバック
        sortedData = await calculateDistancesInBatches(shopList, currentPosition);
      }
      sortedData.sort((a, b) => {
        if (typeof a.distance !== 'number' || Number.isNaN(a.distance)) {
          return 1;
        } else if (typeof b.distance !== 'number' || Number.isNaN(b.distance)) {
          return -1;
        } else {
          return (a.distance as number) - (b.distance as number);
        }
      });
      dataCache.set(cacheKey, sortedData);
      return sortedData;
    } catch (error) {
      console.warn('距離計算に失敗しました:', error);
      return shopList;
    }
  }
  return shopList;
};

const Content = (props: Props) => {
  const [shop, setShop] = useState<Pwamap.ShopData | undefined>();
  const [data, setData] = useState<Pwamap.ShopData[]>(props.data);
  const [list, setList] = useState<Pwamap.ShopData[]>([]);
  const [displayCount, setDisplayCount] = useState(INITIAL_LOAD_SIZE);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [listParent] = useAutoAnimate<HTMLDivElement>();
  const mountedRef = useRef(true);
  const { location } = useContext(GeolocationContext);
  const initializationRef = useRef<boolean>(false);

  // パフォーマンス測定用
  const renderStartTime = useRef<number | null>(null);

  const [searchParams] = useSearchParams();
  const queryCategory = searchParams.get('category');

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 初期データの設定
  useEffect(() => {
    if (initializationRef.current) {
      return;
    }

    const initializeData = async () => {
      initializationRef.current = true;
      if (!mountedRef.current) return;
      setIsInitializing(true);
      performance.mark('list-init-start');

      try {
        const cacheKey = queryCategory ? `filtered-${queryCategory}` : 'all';
        const sortedCacheKey = `sorted-${queryCategory ? `filtered-${queryCategory}` : 'all'}-${location ? location.join(',') : 'no-location'}`;
        const cachedSortedData = dataCache.get(sortedCacheKey);
        if (
          cachedSortedData &&
          import.meta.env.VITE_ORDERBY === 'distance' &&
          cachedSortedData.length > 0
        ) {
          if (!mountedRef.current) return;
          setData(cachedSortedData);
          setList(cachedSortedData.slice(0, INITIAL_LOAD_SIZE));
          setDisplayCount(INITIAL_LOAD_SIZE);
          performance.mark('list-init-end');
          performance.measure('list-init', 'list-init-start', 'list-init-end');
          return;
        }

        const cachedData = dataCache.get(cacheKey);
        let filteredData;

        if (cachedData && cachedData.length > 0) {
          filteredData = cachedData;
        } else {
          filteredData = props.data || []; // props.dataがundefinedの場合に備えて空配列を設定
          if (queryCategory) {
            filteredData = filteredData.filter((shop) => {
              const shopCategories = shop['カテゴリ']
                ? shop['カテゴリ'].split(/,|、|\s+/).map(cat => cat.trim())
                : [];
              return shopCategories.includes(queryCategory);
            });
          }
          // 非空のみキャッシュ保存
          if (filteredData.length > 0) {
            dataCache.set(cacheKey, filteredData);
          }
        }

        // 未取得の位置情報でも即表示（非ブロッキング）
        if (import.meta.env.VITE_ORDERBY === 'distance') {
          try {
            performance.mark('distance-sort-start');
            const maybeSorted = await sortShopList(filteredData, location);
            if (mountedRef.current) {
              setData(maybeSorted);
              setList(maybeSorted.slice(0, INITIAL_LOAD_SIZE));
              setDisplayCount(INITIAL_LOAD_SIZE);
            }
            performance.mark('distance-sort-end');
            performance.measure('distance-sort', 'distance-sort-start', 'distance-sort-end');
          } catch (error) {
            console.warn('距離ソートに失敗しました:', error);
            if (mountedRef.current) {
              setData(filteredData);
              setList(filteredData.slice(0, INITIAL_LOAD_SIZE));
              setDisplayCount(INITIAL_LOAD_SIZE);
            }
          }
        } else {
          if (mountedRef.current) {
            setData(filteredData);
            setList(filteredData.slice(0, INITIAL_LOAD_SIZE));
            setDisplayCount(INITIAL_LOAD_SIZE);
          }
        }
      } catch (error) {
        console.error('データ初期化エラー:', error);
        // エラー時にも空配列を設定して、リストがundefinedにならないようにする
        if (mountedRef.current) {
          setData([]);
          setList([]);
          setDisplayCount(0);
        }
      } finally {
        if (mountedRef.current) {
          setIsInitializing(false);
        }
        initializationRef.current = false;
        performance.mark('list-init-end');
        performance.measure('list-init', 'list-init-start', 'list-init-end');
      }
    };

    initializeData();
  }, [props.data, queryCategory, location]);

  // レンダリング時間計測
  useEffect(() => {
    if (!isInitializing) {
      renderStartTime.current = performance.now();
      requestAnimationFrame(() => {
        if (renderStartTime.current) {
          const renderTime = performance.now() - renderStartTime.current;
          console.log(`リストレンダリング時間: ${renderTime.toFixed(2)}ms`);
          renderStartTime.current = null;
        }
      });
    }
  }, [list, isInitializing]);

  const popupHandler = useCallback((shop: Pwamap.ShopData) => {
    if (shop) {
      setShop(shop);
    }
  }, []);

  const closeHandler = useCallback(() => {
    setShop(undefined);
  }, []);

  const loadMore = useCallback(() => {
    if (isLoading || displayCount >= data.length) {
      return;
    }

    setIsLoading(true);

    const t = setTimeout(() => {
      try {
        const nextCount = Math.min(displayCount + LOAD_MORE_SIZE, data.length);
        const newItems = data.slice(0, nextCount);

        if (mountedRef.current) {
          setList(newItems);
          setDisplayCount(nextCount);
        }
      } catch (error) {
        console.error('追加読み込みエラー:', error);
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    }, 100);
    return () => clearTimeout(t);
  }, [data, displayCount, isLoading]);

  // スクロール監視はVirtuosoのendReachedで代替

  // スワイプハンドラーの設定
  const swipeHandlers = useSwipeable({
    onSwiped: (eventData) => {
      if (Math.abs(eventData.deltaX) > Math.abs(eventData.deltaY) && Math.abs(eventData.deltaX) > 50) {
        navigate(-1);
      }
    },
    trackMouse: false,
    preventScrollOnSwipe: false,
  });

  // スクロール監視は IntersectionObserver を使用

  useEffect(() => {
    const root = document.querySelector('.app-body') as HTMLDivElement | null;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (isInitializing || isLoading) return;
      if (displayCount >= data.length) return;
      for (const entry of entries) {
        if (entry.isIntersecting) {
          loadMore();
          break;
        }
      }
    }, { root, rootMargin: '120px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isInitializing, isLoading, displayCount, data.length, loadMore]);

  const skeletonLoader = (
    <div className="skeleton-container">
      {Array(3).fill(0).map((_, index) => (
        <SkeletonItem key={`skeleton-${index}`} />
      ))}
    </div>
  );

  return (
    <div id="shop-list" className="shop-list no-pull-refresh" {...swipeHandlers} ref={listRef}>
      {queryCategory && <div className="shop-list-category">{`カテゴリ：「${queryCategory}」`}</div>}

      <div className="shop-list-content" style={{ height: '100%', overflow: 'visible', paddingTop: '10px' }}>
        {isInitializing ? skeletonLoader : (
          <div style={{ paddingBottom: '80px' }} ref={listParent}>
            {list.slice(0, displayCount).map((item, index) => (
              <ItemBoundary key={`plain-${item.index || index}`} item={item} index={index}>
                <div className="shop-item-wrapper">
                  <ShopListItem
                    data={item as Pwamap.ShopData}
                    popupHandler={popupHandler}
                    queryCategory={queryCategory}
                    safeMode={true}
                  />
                </div>
              </ItemBoundary>
            ))}
            <div ref={sentinelRef} style={{ height: 1 }} />
            {/* 手動読み込みボタン（スクロール内） */}
            {!isInitializing && displayCount < data.length && (
              <div className="load-more-container">
                <button
                  className="load-more-button"
                  onClick={loadMore}
                  disabled={isLoading}
                >
                  {isLoading ? '読み込み中...' : `さらに${Math.min(LOAD_MORE_SIZE, data.length - displayCount)}件表示`}
                </button>
              </div>
            )}
            {/* ゼロ件メッセージ（スクロール内） */}
            {!isInitializing && list.length === 0 && (
              <div className="end-message">
                <p>該当する店舗がありません</p>
              </div>
            )}

            {/* 読み込み完了メッセージ（スクロール内） */}
            {!isInitializing && displayCount >= data.length && list.length > 0 && (
              <div className="end-message">
                <p>すべての店舗を表示しました（{data.length}件）</p>
              </div>
            )}
          </div>
        )}
      </div>

      {shop && <Shop shop={shop} close={closeHandler} />}
    </div>
  );
};

export default React.memo(Content);
class ItemBoundary extends React.Component<{ children: React.ReactNode; item?: Pwamap.ShopData; index?: number }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode; item?: Pwamap.ShopData; index?: number }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    try {
      const it = this.props.item as any;
      const name = typeof it?.['スポット名'] === 'string' ? it['スポット名'] : '';
      const cat = typeof it?.['カテゴリ'] === 'string' ? it['カテゴリ'] : '';
      console.error('List item render error', { index: this.props.index, name, category: cat, error });
    } catch { }
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children as React.ReactElement;
  }
}

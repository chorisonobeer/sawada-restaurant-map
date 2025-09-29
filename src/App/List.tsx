import React, { useState, useEffect, useCallback, useRef, useContext } from "react";
import ShopListItem from './ShopListItem';
import Shop from './Shop';
import './List.scss';
import { useSearchParams, useNavigate } from "react-router-dom";
import { askGeolocationPermission } from '../geolocation';
import * as turf from "@turf/turf";
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

type ShopDataWithDistance = Pwamap.ShopData & { distance?: number };

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

// バッチ処理による距離計算
const calculateDistancesInBatches = async (shops: Pwamap.ShopData[], position: number[]) => {
  const from = turf.point(position);
  const results: ShopDataWithDistance[] = [];
  
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

  // バッチ処理
  for (let i = 0; i < uncachedShops.length; i += BATCH_SIZE) {
    const batch = uncachedShops.slice(i, i + BATCH_SIZE);
    
    const batchResults = await new Promise<ShopDataWithDistance[]>((resolve) => {
      setTimeout(() => {
        const processed = batch.map(shop => {
          const lng = parseFloat(shop['経度']);
          const lat = parseFloat(shop['緯度']);
          if (Number.isNaN(lng) || Number.isNaN(lat)) {
            return shop;
          }
          
          const to = turf.point([lng, lat]);
          const distance = turf.distance(from, to, { units: 'meters' });
          setCachedDistance(shop.index.toString(), position, distance);
          return { ...shop, distance };
        });
        resolve(processed);
      }, 0);
    });
    
    results.push(...batchResults);
  }

  return [...cachedShops.filter(shop => typeof shop.distance === 'number'), ...results];
};

const sortShopList = async (shopList: Pwamap.ShopData[], contextLocation?: [number, number] | null): Promise<ShopDataWithDistance[]> => {
  const cacheKey = `sorted-${shopList.length}-${contextLocation ? contextLocation.join(',') : 'no-location'}`;
  const cachedData = dataCache.get(cacheKey);
  
  if (cachedData) {
    return cachedData as ShopDataWithDistance[];
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
    try {
      const position = await askGeolocationPermission();
      if (position) {
        positionCache = {
          coords: { latitude: position[1], longitude: position[0] },
          timestamp: Date.now()
        };
        currentPosition = position;
      }
    } catch (error) {
      console.warn('位置情報の取得に失敗しました:', error);
      return shopList;
    }
  }

  if (currentPosition) {
    try {
      const sortedData = await calculateDistancesInBatches(shopList, currentPosition);
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
  const { location } = useContext(GeolocationContext);
  const initializationRef = useRef<boolean>(false);

  const [searchParams] = useSearchParams();
  const queryCategory = searchParams.get('category');

  // 初期データの設定
  useEffect(() => {
    if (initializationRef.current) {
      return;
    }

    const initializeData = async () => {
      initializationRef.current = true;
      setIsInitializing(true);
      
      try {
        const cacheKey = queryCategory ? `filtered-${queryCategory}` : 'all';
        const sortedCacheKey = `sorted-${queryCategory ? `filtered-${queryCategory}` : 'all'}-${location ? location.join(',') : 'no-location'}`;
        
        // 距離計算済みデータがキャッシュにある場合
        const cachedSortedData = dataCache.get(sortedCacheKey);
        if (cachedSortedData && process.env.REACT_APP_ORDERBY === 'distance') {
          setData(cachedSortedData);
          setList(cachedSortedData.slice(0, INITIAL_LOAD_SIZE));
          setDisplayCount(INITIAL_LOAD_SIZE);
          return;
        }
        
        // フィルタリング済みデータのキャッシュ確認
        const cachedData = dataCache.get(cacheKey);
        let filteredData;
        
        if (cachedData) {
          filteredData = cachedData;
        } else {
          filteredData = props.data;
          
          if (queryCategory) {
            filteredData = props.data.filter((shop) => {
              const shopCategories = shop['カテゴリ']
                ? shop['カテゴリ'].split(/,|、|\s+/).map(cat => cat.trim())
                : [];
              return shopCategories.includes(queryCategory);
            });
          }
          
          dataCache.set(cacheKey, filteredData);
        }
        
        if (process.env.REACT_APP_ORDERBY === 'distance') {
          try {
            const sortedData = await sortShopList(filteredData, location);
            setData(sortedData);
            setList(sortedData.slice(0, INITIAL_LOAD_SIZE));
            setDisplayCount(INITIAL_LOAD_SIZE);
          } catch (error) {
            console.warn('距離ソートに失敗しました:', error);
            setData(filteredData);
            setList(filteredData.slice(0, INITIAL_LOAD_SIZE));
            setDisplayCount(INITIAL_LOAD_SIZE);
          }
        } else {
          setData(filteredData);
          setList(filteredData.slice(0, INITIAL_LOAD_SIZE));
          setDisplayCount(INITIAL_LOAD_SIZE);
        }
      } catch (error) {
        console.error('データ初期化エラー:', error);
        setData(props.data);
        setList(props.data.slice(0, INITIAL_LOAD_SIZE));
        setDisplayCount(INITIAL_LOAD_SIZE);
      } finally {
        setIsInitializing(false);
        initializationRef.current = false;
      }
    };
    
    initializeData();
  }, [props.data, queryCategory, location]);

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
    
    setTimeout(() => {
      try {
        const nextCount = displayCount + LOAD_MORE_SIZE;
        const newItems = data.slice(0, nextCount);
        
        setList(newItems);
        setDisplayCount(nextCount);
      } catch (error) {
        console.error('追加読み込みエラー:', error);
      } finally {
        setIsLoading(false);
      }
    }, 100);
  }, [data, displayCount, isLoading]);

  // スクロール監視（自動読み込み）
  useEffect(() => {
    const handleScroll = () => {
      if (isLoading || displayCount >= data.length || isInitializing) {
        return;
      }

      const scrollElement = listRef.current;
      if (!scrollElement) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

      // 80%スクロールしたら自動読み込み
      if (scrollPercentage > 0.8) {
        loadMore();
      }
    };

    const scrollElement = listRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll, { passive: true });
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, [loadMore, isLoading, displayCount, data.length, isInitializing]);

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

      <div className="shop-list-content">
        {isInitializing ? skeletonLoader : 
          list.map((item) => (
            <div key={item.index} className="shop">
              <ShopListItem
                data={item}
                popupHandler={popupHandler}
                queryCategory={queryCategory}
              />
            </div>
          ))
        }
        
        {/* 手動読み込みボタン */}
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
        
        {/* 読み込み完了メッセージ */}
        {!isInitializing && displayCount >= data.length && list.length > 0 && (
          <div className="end-message">
            <p>すべての店舗を表示しました（{data.length}件）</p>
          </div>
        )}
      </div>
      
      {shop && <Shop shop={shop} close={closeHandler} />}
    </div>
  );
};

export default React.memo(Content);

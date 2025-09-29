/* 
Full Path: /src/context/GeolocationContext.tsx
Last Modified: 2025-01-20 10:00:00
変更概要: 現在地取得の並行処理化とキャッシュ機能を追加
*/

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { askGeolocationPermission } from '../geolocation';

export type LngLat = [number, number] | null;

interface GeolocationContextType {
  location: LngLat;
  isLoading: boolean;
  error: string | null;
  refreshLocation: () => Promise<void>;
}

export const GeolocationContext = createContext<GeolocationContextType>({
  location: null,
  isLoading: false,
  error: null,
  refreshLocation: async () => {}
});

// 位置情報キャッシュの管理
const CACHE_KEY = 'geolocation_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5分

interface LocationCache {
  location: LngLat;
  timestamp: number;
}

// キャッシュから位置情報を取得
const getCachedLocation = (): LngLat => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { location, timestamp }: LocationCache = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return location;
      }
    }
  } catch (error) {
    console.warn('Failed to read location cache:', error);
  }
  return null;
};

// 位置情報をキャッシュに保存
const setCachedLocation = (location: LngLat): void => {
  try {
    const cache: LocationCache = {
      location,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('Failed to cache location:', error);
  }
};

export const GeolocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<LngLat>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 位置情報取得関数
  const fetchLocation = useCallback(async (): Promise<LngLat> => {
    try {
      const pos = await askGeolocationPermission();
      if (pos) {
        setCachedLocation(pos);
        return pos;
      }
      return null;
    } catch (error) {
      console.warn('Failed to get geolocation:', error);
      throw error;
    }
  }, []);

  // 位置情報の更新
  const refreshLocation = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const newLocation = await fetchLocation();
      setLocation(newLocation);
    } catch (error) {
      setError('位置情報の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [fetchLocation]);

  useEffect(() => {
    // 初期化時の処理
    const initializeLocation = async () => {
      // まずキャッシュから読み込み（即座に表示）
      const cachedLocation = getCachedLocation();
      if (cachedLocation) {
        setLocation(cachedLocation);
      }

      // 並行して新しい位置情報を取得（バックグラウンド更新）
      setIsLoading(true);
      try {
        const freshLocation = await fetchLocation();
        if (freshLocation) {
          setLocation(freshLocation);
        }
      } catch (error) {
        // キャッシュがない場合のみエラーを設定
        if (!cachedLocation) {
          setError('位置情報の取得に失敗しました');
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeLocation();
  }, [fetchLocation]);

  const contextValue: GeolocationContextType = {
    location,
    isLoading,
    error,
    refreshLocation
  };

  return (
    <GeolocationContext.Provider value={contextValue}>
      {children}
    </GeolocationContext.Provider>
  );
};

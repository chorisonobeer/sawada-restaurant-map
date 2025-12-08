/** 
 * /src/App/Map.tsx
 * 2025-05-02T10:00+09:00
 * 変更概要: Props型をShopData/EventData両対応に統一し、型エラー修正
 */

import React, { useCallback, useState, useEffect, useContext, useRef } from "react";
// @ts-ignore
import geojsonExtent from '@mapbox/geojson-extent';
import toGeoJson from './toGeoJson';
import setCluster from './setCluster';
import { GeolocationContext } from '../context/GeolocationContext';
import LoadingSpinner from './LoadingSpinner';

// 共通プロパティ型
export type MapPointBase = {
  index: number;
  緯度: string;
  経度: string;
  [key: string]: any;
};

export type MapProps<T extends MapPointBase = MapPointBase> = {
  data: T[];
  selectedShop?: T;
  onSelectShop: (shop: T) => void;
  initialData?: T[];
  isEventMode?: boolean;
};

// 佐渡島中心の座標（初期表示用フォールバック）
const SADO_CENTER: [number, number] = [138.3, 38.0];
const DEFAULT_ZOOM = 8;

const CSS: React.CSSProperties = {
  width: '100%',
  height: '100%',
  position: 'relative',
  // 地図の彩度を控えめに調整（自然な印象を保ちつつ、UIを際立たせる）
  filter: 'saturate(0.92) brightness(0.976)',
  // GPU加速を明示的に有効化（パフォーマンス最適化）
  transform: 'translateZ(0)',
};




const categoryColors: { [key: string]: string } = {
  'ブルワリー': '#007bff',
  'ボトルショップ': '#28a745',
  'ビアバー': '#ffc107',
  'その他': '#6c757d',
};

const matchPairs: (string | string)[] = Object.entries(categoryColors)
  .flatMap(([category, color]) => {
    // 'その他' カテゴリはデフォルト値として使用するため、matchPairs から除外
    if (category === 'その他') return [];
    return [category, color];
  });



const hidePoiLayers = (map: any) => {
  const hideLayers = [
    'poi',
    'poi-primary',
    'poi-r0-r9',
    'poi-r10-r24',
    'poi-r25',
    'poi-bus',
    'poi-entrance',
  ];

  for (let i = 0; i < hideLayers.length; i++) {
    const layerId = hideLayers[i];
    map.setLayoutProperty(layerId, 'visibility', 'none');
  }
};

function Map<T extends MapPointBase = MapPointBase>(props: MapProps<T>) {
  const { onSelectShop } = props;
  const { location } = useContext(GeolocationContext);
  const mapNode = React.useRef<HTMLDivElement>(null);
  const [mapObject, setMapObject] = React.useState<any>();
  const [isLoadingMarkers, setIsLoadingMarkers] = useState(false);
  const [isLayerInitialized, setIsLayerInitialized] = useState(false);
  const geolocateRef = useRef<any>(null);

  // マーカーを更新する関数（setData方式）
  const updateMarkers = useCallback((map: any, data: T[]) => {
    if (!map) return;
    setIsLoadingMarkers(true);
    const geojson = toGeoJson(data);
    if (map.getSource('shops') && isLayerInitialized) {
      map.getSource('shops').setData(geojson);
      setIsLoadingMarkers(false);
      return;
    }
    if (!map.getSource('shops')) {
      map.addSource('shops', {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 25,
      });
    }
    if (!isLayerInitialized) {
      // 既存の単一レイヤーを2レイヤー構成に変更（視認性を高める）
      map.addLayer({
        id: 'shop-points-outer',
        type: 'circle',
        source: 'shops',
        filter: ['all', ['==', '$type', 'Point']],
        paint: {
          'circle-radius': 16,
          'circle-color': [
            'match',
            ['get', 'カテゴリ'],
            ...matchPairs,
            categoryColors['その他'],
          ],
          'circle-opacity': 0.35,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-opacity': 1,
          'circle-blur': 0.4,
        },
      });
      map.addLayer({
        id: 'shop-points-inner',
        type: 'circle',
        source: 'shops',
        filter: ['all', ['==', '$type', 'Point']],
        paint: {
          'circle-radius': 8,
          'circle-color': [
            'match',
            ['get', 'カテゴリ'],
            ...matchPairs,
            categoryColors['その他'],
          ],
          'circle-opacity': 0.95,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-opacity': 1,
        },
      });
      // ラベル（ズームによるサイズ変化で可読性を確保）
      map.addLayer({
        id: 'shop-symbol',
        type: 'symbol',
        source: 'shops',
        filter: ['all', ['==', '$type', 'Point']],
        paint: {
          'text-color': '#222222',
          'text-halo-color': '#FFFFFF',
          'text-halo-width': 2,
        },
        layout: {
          'text-field': '{スポット名}',
          'text-font': ['Noto Sans Regular'],
          'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
          'text-radial-offset': 0.6,
          'text-justify': 'auto',
          'text-size': [
            'interpolate', ['linear'], ['zoom'],
            10, 10,
            12, 12,
            14, 14
          ],
          'text-anchor': 'top',
          'text-max-width': 14,
          'text-allow-overlap': false,
        },
      });
      const layers = ['shop-points-outer', 'shop-points-inner', 'shop-symbol'];
      layers.forEach(layer => {
        map.on('mouseenter', layer, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', layer, () => {
          map.getCanvas().style.cursor = '';
        });
        map.on('click', layer, (event: any) => {
          if (!event.features[0].properties.cluster) {
            onSelectShop(event.features[0].properties as T);
          }
        });
      });
      setCluster(map);
      setIsLayerInitialized(true);
    }
    setIsLoadingMarkers(false);
  }, [onSelectShop, isLayerInitialized]);

  useEffect(() => {
    if (!mapObject) return;
    updateMarkers(mapObject, props.data);
  }, [mapObject, props.data, updateMarkers]);

  // 前回のデータ長を記録するためのref
  const prevDataLengthRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mapObject || props.data.length === 0) {
      return;
    }
    
    // データ長が変化した場合、または位置情報がない場合は自動ズーム
    const dataLengthChanged = prevDataLengthRef.current !== null && prevDataLengthRef.current !== props.data.length;
    const isFiltered = props.initialData && props.data.length !== props.initialData.length;
    
    if (dataLengthChanged || isFiltered || !location) {
      const geojson = toGeoJson(props.data);
      const bounds = geojsonExtent(geojson);
      if (bounds) {
        mapObject.fitBounds(bounds, {
          padding: 50
        });
      }
    }
    
    // 現在のデータ長を記録
    prevDataLengthRef.current = props.data.length;
  }, [mapObject, props.data, location, props.initialData]);

  useEffect(() => {
    if (!mapObject || !props.selectedShop) {
      return;
    }
    const lat = parseFloat(props.selectedShop['緯度']);
    const lng = parseFloat(props.selectedShop['経度']);
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      // 緯度・経度が不正な場合は地図移動をスキップ
      return;
    }
    mapObject.flyTo({
      center: [lng, lat],
      zoom: 17,
      essential: true
    });
  }, [mapObject, props.selectedShop]);

  useEffect(() => {
    if (!mapNode.current || mapObject) {
      return;
    }
    // @ts-ignore
    const { geolonia } = window;
    
    // GeolocationContextから位置情報を取得して初期位置を決定
    const initialCenter = location || SADO_CENTER;
    const initialZoom = location ? 15 : DEFAULT_ZOOM;
    
    const map = new geolonia.Map({
      container: mapNode.current,
      style: 'geolonia/basic',
      center: initialCenter,
      zoom: initialZoom,
      interactive: true,
      trackResize: true,
    });
    const onMapLoad = () => {
      hidePoiLayers(map);
      setMapObject(map);
      
      // 地図読み込み後にfilterを確実に適用（親要素に直接適用）
      if (mapNode.current) {
        mapNode.current.style.filter = 'saturate(0.85) brightness(1.02)';
        mapNode.current.style.transform = 'translateZ(0)';
      }
      
      try {
        const geolocateControl = new geolonia.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true,
            timeout: 2000,
            maximumAge: 0
          },
          trackUserLocation: true,
          showUserLocation: true
        });
        map.addControl(geolocateControl, 'top-right');
        geolocateRef.current = geolocateControl;
        // 現在地を自動取得
        setTimeout(() => {
          geolocateControl.trigger();
        }, 100);
        geolocateControl.on('error', () => {
          console.warn('位置情報の取得に失敗しましたが、地図は使用できます');
        });
      } catch (error) {
        console.warn('位置情報コントロールの初期化に失敗しましたが、地図は使用できます', error);
      }
    };
    const orientationChangeHandler = () => {
      map.resize();
    };
    map.on('load', onMapLoad);
    window.addEventListener('orientationchange', orientationChangeHandler);
    return () => {
      window.removeEventListener('orientationchange', orientationChangeHandler);
      map.off('load', onMapLoad);
    };
  }, [mapObject, location]);

  // ホーム押下時の現在位置への再中心化イベント
  useEffect(() => {
    const handler = () => {
      try {
        geolocateRef.current?.trigger();
      } catch (e) {
        // no-op
      }
    };
    window.addEventListener('map:recenter', handler);
    return () => {
      window.removeEventListener('map:recenter', handler);
    };
  }, []);

  // attribution control（著作権表示）の位置を動的に調整
  // シンプルに親要素のbottomを調整するだけ
  useEffect(() => {
    if (!mapObject || !mapNode.current) return;
    
    const adjustAttributionPosition = () => {
      // Y方向の上移動を0にする（位置調整を無効化）
      const bottomValue = 0;
      
      // 親要素のbottomを調整
      const parentSelectors = [
        '.maplibregl-ctrl-bottom-left',
        '.maplibregl-ctrl-bottom-right'
      ];
      
      parentSelectors.forEach(parentSelector => {
        const parentElement = mapNode.current?.querySelector(parentSelector) as HTMLElement;
        if (parentElement) {
          parentElement.style.setProperty('bottom', `${bottomValue}px`, 'important');
          parentElement.style.setProperty('z-index', '50', 'important');
        }
      });
      
      // attribution control自体のmarginを調整（重要！）
      // marginが位置に影響しているため、margin-bottomを調整する
      const attributionSelectors = [
        '.maplibregl-ctrl-attrib.maplibregl-compact',
        'details.maplibregl-ctrl-attrib.maplibregl-compact'
      ];
      
      attributionSelectors.forEach(selector => {
        const element = mapNode.current?.querySelector(selector) as HTMLElement;
        if (element) {
          // marginを0にして、親要素のbottom調整が効くようにする
          element.style.setProperty('margin', '0', 'important');
          element.style.setProperty('margin-bottom', '0', 'important');
        }
      });
    };
    
    // マップ読み込み後に実行
    const onMapLoadHandler = () => {
      setTimeout(adjustAttributionPosition, 200);
    };
    
    mapObject.on('load', onMapLoadHandler);
    
    // 即座に実行（既に読み込み済みの場合）
    setTimeout(adjustAttributionPosition, 300);
    
    // MutationObserverで親要素の追加を監視
    const observer = new MutationObserver(() => {
      setTimeout(adjustAttributionPosition, 100);
    });
    
    observer.observe(mapNode.current, {
      childList: true,
      subtree: true
    });
    
    // リサイズ時にも再調整
    const resizeHandler = () => {
      setTimeout(adjustAttributionPosition, 100);
    };
    window.addEventListener('resize', resizeHandler);
    
    return () => {
      mapObject.off('load', onMapLoadHandler);
      observer.disconnect();
      window.removeEventListener('resize', resizeHandler);
    };
  }, [mapObject]);

  return (
    <div style={CSS}>
      {isLoadingMarkers && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000 }}>
          <LoadingSpinner variant="pulse" size="sm" text="マーカーを読み込み中..." />
        </div>
      )}
      <div
        ref={mapNode}
        style={CSS}
        data-geolocate-control="off"
        data-marker="off"
        data-gesture-handling="on"
        data-loader="off"
      ></div>
    </div>
  );
}

export default Map;
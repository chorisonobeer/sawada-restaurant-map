/** 
 * /src/App/LazyMap.tsx
 * 2025-01-20T10:00+09:00
 * 変更概要: 新規追加 - 地図コンポーネントの遅延読み込み対応
 */

import React, { Suspense } from 'react';
import { MapProps, MapPointBase } from './Map';

// 地図コンポーネントを遅延読み込み
const Map = React.lazy(() => import('./Map'));

// 軽量なローディング用のスケルトンコンポーネント
const MapSkeleton: React.FC = () => (
  <div 
    style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#f5f5f5',
      position: 'relative',
      minHeight: '400px'
    }}
  />
);

// 遅延読み込み対応のMapコンポーネント
function LazyMap<T extends MapPointBase = MapPointBase>(props: MapProps<T> & { style?: React.CSSProperties }) {
  const { style, ...mapProps } = props;
  return (
    <div style={style}>
      <Suspense fallback={<MapSkeleton />}>
        <Map {...mapProps} />
      </Suspense>
    </div>
  );
}

export default LazyMap;
export type { MapProps, MapPointBase };
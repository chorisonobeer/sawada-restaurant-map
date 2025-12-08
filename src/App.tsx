/* 
 * /src/App.tsx
 * Last Modified: 2025-02-28 17:45:00
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { GeolocationProvider } from './context/GeolocationContext';
import Home from './App/Home';
import List from './App/List';
import Category from './App/Category';
import Images from './App/Images';
import AboutUs from './App/AboutUs';
import Events from './App/Events';
import Tabbar from './App/Tabbar';
import LazyMap from './App/LazyMap';
import './App.scss';
import useShopData from './App/hooks/useShopData';

const App: React.FC = React.memo(() => {
  const { shopList, error } = useShopData();
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

  useEffect(() => {
    // データが更新されたときにフィルタリング結果も更新
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
        onSelectShop={setSelectedShop}
        initialData={shopList}
        style={{ 
          display: isHomePage ? 'block' : 'none',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: 'calc(100% - 70px - env(safe-area-inset-bottom))',
          zIndex: isHomePage ? 5 : -1,
          pointerEvents: isHomePage ? 'auto' : 'none'
        }}
      />
    );
  }, [filteredShops, selectedShop, shopList, location.pathname]);

  // メモ化されたルートコンポーネント
  const routes = useMemo(() => (
    <Routes>
      <Route path="/" element={
        <Home 
          data={shopList} 
          selectedShop={selectedShop}
          onSelectShop={setSelectedShop}
          onSearchResults={setFilteredShops}
        />
      } />
      <Route path="/list" element={<List data={shopList} />} />
      <Route path="/category" element={<Category data={shopList} />} />
      <Route path="/images" element={<Images data={shopList} />} />
      <Route path="/about" element={<AboutUs />} />
      <Route path="/events" element={<Events />} />
    </Routes>
  ), [shopList, selectedShop]);

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
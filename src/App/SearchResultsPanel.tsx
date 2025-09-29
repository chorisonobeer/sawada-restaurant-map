import React, { useEffect, useRef } from 'react';
import SearchResultItem from './SearchResultItem';
import './SearchResultsPanel.scss';

type SearchResultsPanelProps = {
  results: Pwamap.ShopData[];
  visible: boolean;
  onSelectShop: (shop: Pwamap.ShopData) => void;
};

const SearchResultsPanel: React.FC<SearchResultsPanelProps> = ({ 
  results, 
  visible, 
  onSelectShop 
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  
  // 検索バーの幅と位置に合わせる
  useEffect(() => {
    if (!panelRef.current || !visible) return;
    
    const searchBarContainer = document.querySelector('.search-bar-container');
    if (!searchBarContainer) return;
    
    // 検索バーのスタイルを取得して同期
    const searchBarRect = searchBarContainer.getBoundingClientRect();
    const panelElement = panelRef.current;
    
    // 検索バーと同じ幅と左位置を確保
    panelElement.style.width = `${searchBarRect.width}px`;
    panelElement.style.left = `${searchBarRect.left}px`;
  }, [visible, results]);
  
  if (!visible) return null;
  
  return (
    <div 
      className="search-results-panel" 
      ref={panelRef}
    >
      {results.length === 0 ? (
        <div className="no-results">該当する店舗がありません</div>
      ) : (
        <div className="results-list">
          {results.map((shop, index) => (
            <SearchResultItem 
              key={index} 
              shop={shop} 
              onClick={() => onSelectShop(shop)} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchResultsPanel;
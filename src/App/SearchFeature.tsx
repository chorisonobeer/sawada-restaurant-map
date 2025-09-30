import React, { useState, useEffect, useCallback, useRef } from 'react';
import './SearchFeature.scss';

type SearchFeatureProps = {
  data: Pwamap.ShopData[];
  onSearchResults: (results: Pwamap.ShopData[]) => void;
  onSelectShop: (shop: Pwamap.ShopData) => void;
};

const SearchFeature: React.FC<SearchFeatureProps> = ({ data, onSearchResults, onSelectShop }) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [isOpenNow, setIsOpenNow] = useState(false);
  const [hasParking, setHasParking] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [filteredResults, setFilteredResults] = useState<Pwamap.ShopData[]>([]);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  // クリック外のイベントを監視して、ドロップダウンを閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setShowTagDropdown(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // カテゴリ一覧を作成
  useEffect(() => {
    if (data.length > 0) {
      const allCategories = data
        .map(shop => shop['カテゴリ'])
        .filter(Boolean)
        .flatMap(category => category.split(/,|、|\s+/))
        .map(category => category.trim())
        .filter(category => category !== '');
      
      const uniqueCategories = Array.from(new Set(allCategories))
        .sort();
      
      setCategories(uniqueCategories);
    }
  }, [data]);

  // カテゴリごとの件数を計算
  const getCategoryCount = (category: string): number => {
    return data.filter(shop => {
      if (!shop['カテゴリ']) return false;
      const shopCategories = shop['カテゴリ']
        .split(/,|、|\s+/)
        .map(cat => cat.trim())
        .filter(cat => cat !== '');
      return shopCategories.includes(category);
    }).length;
  };

  // タグごとの件数を計算
  const getTagCount = (tag: string): number => {
    return data.filter(shop => {
      if (!shop['タグ']) return false;
      const shopTags = shop['タグ']
        .split(/,|、|\s+/)
        .map(t => t.trim())
        .filter(t => t !== '');
      return shopTags.includes(tag);
    }).length;
  };

  // タグ一覧を作成
  useEffect(() => {
    if (data.length > 0) {
      const allTags = data
        .map(shop => shop['タグ'])
        .filter(Boolean)
        .flatMap(tag => tag.split(/,|、|\s+/))
        .map(tag => tag.trim())
        .filter(tag => tag !== '');
      
      const uniqueTags = Array.from(new Set(allTags))
        .sort();
      
      setTags(uniqueTags);
    }
  }, [data]);

  // 営業時間の判定
  const isShopOpen = (shop: Pwamap.ShopData): boolean => {
    if (!shop['営業時間']) return false;

    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const jstNow = new Date(utc + 9 * 60 * 60000);
    const currentHour = jstNow.getHours();
    const currentMinute = jstNow.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][jstNow.getDay()];

    // 定休日チェック
    if (shop['定休日']) {
      const closedDays = shop['定休日']
        .split(/,|、|\s+/)
        .map(day => day.trim())
        .filter(day => day !== '');
      if (closedDays.some(day => day.includes(dayOfWeek))) {
        return false;
      }
    }

    // 営業時間チェック
    const timeRangeMatch = shop['営業時間'].match(/(\d{1,2}):(\d{2})\s*[-～]\s*(\d{1,2}):(\d{2})/);
    if (!timeRangeMatch) return false;

    const [, startHourStr, startMinuteStr, endHourStr, endMinuteStr] = timeRangeMatch;
    const startHour = parseInt(startHourStr, 10);
    const startMinute = parseInt(startMinuteStr, 10);
    const endHour = parseInt(endHourStr, 10);
    const endMinute = parseInt(endMinuteStr, 10);
    const startTimeMinutes = startHour * 60 + startMinute;
    const endTimeMinutes = endHour * 60 + endMinute;

    if (endTimeMinutes < startTimeMinutes) {
      // 深夜営業の場合（例：22:00-02:00）
      return currentTimeMinutes >= startTimeMinutes || currentTimeMinutes <= endTimeMinutes;
    } else {
      // 通常営業の場合
      return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes;
    }
  };

  // 駐車場の判定
  const hasParkingSpace = (shop: Pwamap.ShopData): boolean => {
    if (!shop['駐車場']) return false;
    const parkingStr = shop['駐車場'].trim();
    const parkingCountMatch = parkingStr.match(/(\d+)/);
    if (parkingCountMatch) {
      const parkingCount = parseInt(parkingCountMatch[1], 10);
      return parkingCount >= 1;
    }
    return parkingStr.includes('有') || parkingStr.includes('あり');
  };

  // フィルタリング処理
  const filterShops = useCallback(() => {
    const filtered = data.filter(shop => {
      // テキスト検索
      if (query.trim() !== '') {
        const matchesQuery = Object.entries(shop).some(([_, value]) => {
          if (typeof value === 'string') {
            return value.toLowerCase().includes(query.toLowerCase());
          }
          return false;
        });
        if (!matchesQuery) return false;
      }

      // カテゴリフィルター
      if (selectedCategory) {
        const shopCategories = shop['カテゴリ']
          ? shop['カテゴリ'].split(/,|、|\s+/).map(cat => cat.trim())
          : [];
        if (!shopCategories.includes(selectedCategory)) return false;
      }

      // タグフィルター
      if (selectedTag) {
        const shopTags = shop['タグ']
          ? shop['タグ'].split(/,|、|\s+/).map(tag => tag.trim())
          : [];
        if (!shopTags.includes(selectedTag)) return false;
      }

      // 営業時間フィルター
      if (isOpenNow && !isShopOpen(shop)) return false;

      // 駐車場フィルター
      if (hasParking && !hasParkingSpace(shop)) return false;

      return true;
    });

    setFilteredResults(filtered);
    onSearchResults(filtered);
  }, [data, query, selectedCategory, selectedTag, isOpenNow, hasParking, onSearchResults]);

  // フィルター条件が変わったら再フィルタリング
  useEffect(() => {
    filterShops();
  }, [filterShops]);

  // コンポーネントマウント時にフィルタリング結果を初期化
  useEffect(() => {
    setFilteredResults(data);
  }, [data]);

  // 検索入力ハンドラー
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setShowResults(newQuery.trim() !== '');
  };

  // カテゴリ選択ハンドラー
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setShowCategoryDropdown(false);
    
    // 「すべて」選択時は全てのフィルター条件をリセット
    if (category === '') {
      setSelectedTag('');
      setIsOpenNow(false);
      setHasParking(false);
      setQuery('');
      setShowResults(false);
      // 全データを表示するためにonSearchResultsを呼び出し
      onSearchResults(data);
    }
  };

  // タグ選択ハンドラー
  const handleTagSelect = (tag: string) => {
    setSelectedTag(tag);
    setShowTagDropdown(false);
    
    // 「すべて」選択時は全てのフィルター条件をリセット
    if (tag === '') {
      setSelectedCategory('');
      setIsOpenNow(false);
      setHasParking(false);
      setQuery('');
      setShowResults(false);
      // 全データを表示するためにonSearchResultsを呼び出し
      onSearchResults(data);
    }
  };

  // 結果アイテムクリックハンドラー
  const handleResultClick = (shop: Pwamap.ShopData) => {
    onSelectShop(shop);
    setShowResults(false);
  };

  return (
    <div className="search-feature">
      <div className="search-input-container">
        <input
          type="text"
          placeholder="スポットを検索..."
          value={query}
          onChange={handleInputChange}
          className="search-input"
        />
        {query && (
          <button 
            className="clear-button" 
            onClick={() => {
              setQuery('');
              setShowResults(false);
              setFilteredResults(data);
              onSearchResults(data);
            }}
            aria-label="入力をクリア"
          >
            ✕
          </button>
        )}
      </div>

      <div className="filter-container">
        <div className="filter-row first-row">
          {/* カテゴリドロップダウン */}
          <div className="filter-item category-filter" ref={categoryDropdownRef}>
            <div 
              className={`custom-dropdown-header ${selectedCategory !== '' ? 'active' : ''}`}
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            >
              {selectedCategory === '' ? 'カテゴリ' : selectedCategory}
              <span className="dropdown-icon">▼</span>
            </div>
            {showCategoryDropdown && (
              <div className="custom-dropdown-list">
                <div 
                  className="custom-dropdown-item"
                  onClick={() => handleCategorySelect('')}
                >
                  <span className="dropdown-item-text">すべて</span>
                  <span className="dropdown-item-count">{data.length}</span>
                </div>
                {categories.map((category) => (
                  <div
                    key={category}
                    className="custom-dropdown-item"
                    onClick={() => handleCategorySelect(category)}
                  >
                    <span className="dropdown-item-text">{category}</span>
                    <span className="dropdown-item-count">{getCategoryCount(category)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* タグドロップダウン */}
          <div className="filter-item tag-filter" ref={tagDropdownRef}>
            <div 
              className={`custom-dropdown-header ${selectedTag !== '' ? 'active' : ''}`}
              onClick={() => setShowTagDropdown(!showTagDropdown)}
            >
              {selectedTag === '' ? 'タグ' : selectedTag}
              <span className="dropdown-icon">▼</span>
            </div>
            {showTagDropdown && (
              <div className="custom-dropdown-list">
                <div 
                  className="custom-dropdown-item"
                  onClick={() => handleTagSelect('')}
                >
                  <span className="dropdown-item-text">すべて</span>
                  <span className="dropdown-item-count">{data.length}</span>
                </div>
                {tags.map((tag) => (
                  <div
                    key={tag}
                    className="custom-dropdown-item"
                    onClick={() => handleTagSelect(tag)}
                  >
                    <span className="dropdown-item-text">{tag}</span>
                    <span className="dropdown-item-count">{getTagCount(tag)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="filter-row second-row">
          {/* 現在営業中ボタン */}
          <div className="filter-item operation-filter">
            <button
              className={`filter-button ${isOpenNow ? 'active' : ''}`}
              onClick={() => setIsOpenNow(!isOpenNow)}
            >
              現在営業中
            </button>
          </div>

          {/* 駐車場有りボタン */}
          <div className="filter-item parking-filter">
            <button
              className={`filter-button ${hasParking ? 'active' : ''}`}
              onClick={() => setHasParking(!hasParking)}
            >
              駐車場有り
            </button>
          </div>
        </div>
      </div>

      {showResults && (
        <div className="search-results">
          {filteredResults.length === 0 ? (
            <div className="no-results">該当する店舗がありません</div>
          ) : (
            <div className="results-list">
              {filteredResults.map((shop, index) => (
                <div
                  key={`shop-result-${index}`}
                  className="result-item"
                  onClick={() => handleResultClick(shop)}
                >
                  <div className="result-info">
                    <div className="result-name" style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                      {shop['スポット名']}
                    </div>
                    <div className="result-hours" style={{ fontSize: '8pt', fontWeight: '600' }}>
                      営業時間： {shop['営業時間'] ? shop['営業時間'] : '営業時間不明'}
                    </div>
                    <div className="result-closed" style={{ fontSize: '8pt', fontWeight: '600' }}>
                      定休日：{shop['定休日'] ? shop['定休日'] : '定休日不明'}
                    </div>
                    <div className="result-address" style={{ fontSize: '8pt', fontWeight: '600' }}>
                      住所： {shop['住所'] ? shop['住所'] : '住所不明'}
                    </div>
                  </div>
                  <div className="result-image">
                    {shop['画像'] ? (
                      <img
                        src={shop['画像'].startsWith('http') ? shop['画像'] : `/${shop['画像']}`}
                        alt={shop['スポット名']}
                        style={{ width: 'auto', height: '100%', margin: 0, display: 'block' }}
                      />
                    ) : (
                      <div style={{ width: 'auto', height: '100%', background: '#ccc' }}></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchFeature;
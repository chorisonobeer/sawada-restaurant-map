import React, { useState, useEffect, useCallback, useRef } from 'react';
import './SearchFeature.scss';
import zen2han from '../lib/zen2han';

// 営業時間から曜日表記を取り除き、時間のみを返す
const removeWeekdaysFromHours = (hours: string): string => {
  if (!hours) return hours;
  return hours
    .replace(/[月火水木金土日]\s*-\s*[月火水木金土日]\s*/g, '')
    .replace(/[月火水木金土日]\s*,\s*/g, '')
    .replace(/[月火水木金土日]\s+/g, '')
    .replace(/^\s*,\s*/, '')
    .replace(/\s*,\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
};

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

  // 検索結果表示中は地図のズームボタン等を隠すためのクラスをボディに付与
  useEffect(() => {
    document.body.classList.toggle('search-open', showResults);
    return () => {
      document.body.classList.remove('search-open');
    };
  }, [showResults]);

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

  // 営業時間の判定（曜日セグメント・複数時間帯・正規化対応）
  const isShopOpen = (shop: Pwamap.ShopData): boolean => {
    if (!shop['営業時間']) return false;

    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const jstNow = new Date(utc + 9 * 60 * 60000);
    const currentHour = jstNow.getHours();
    const currentMinute = jstNow.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    const dayLetters = ['日', '月', '火', '水', '木', '金', '土'];
    const todayIndex = jstNow.getDay();
    const prevDayIndex = (todayIndex + 6) % 7;

    // 文字列正規化（全角→半角、区切り統一）
    const raw = shop['営業時間'].toString();
    const normalized = zen2han(raw).trim()
      .replace(/[〜～]/g, '-')
      .replace(/[、，]/g, ',');

    // 先頭に曜日セグメントがあれば抽出（例: "月-土 18:00-22:00" や "火,水-日 19:00-00:00"）
    const weekdayMatch = normalized.match(/^\s*((?:毎日|[日月火水木金土](?:\s*(?:-|,)\s*[日月火水木金土])*(?:\s*,\s*[日月火水木金土](?:\s*(?:-|,)\s*[日月火水木金土])*)*))\s+(.+)$/);

    // 曜日セグメントのパース
    const allDaysSet = new Set([0,1,2,3,4,5,6]);
    const parseWeekdaySpec = (spec: string): Set<number> => {
      const s = spec.replace(/\s+/g, '').replace(/[、，]/g, ',');
      if (s === '毎日') return new Set(allDaysSet);
      const result = new Set<number>();
      const tokens = s.split(',').filter(t => t.length > 0);
      for (const token of tokens) {
        if (token.includes('-')) {
          const [startChar, endChar] = token.split('-');
          const si = dayLetters.indexOf(startChar);
          const ei = dayLetters.indexOf(endChar);
          if (si !== -1 && ei !== -1) {
            if (si <= ei) {
              for (let i = si; i <= ei; i++) result.add(i);
            } else {
              for (let i = si; i <= 6; i++) result.add(i);
              for (let i = 0; i <= ei; i++) result.add(i);
            }
          }
        } else {
          // 連結表記（例: 水木）対応のため1文字ずつ評価
          for (const ch of token.split('')) {
            const idx = dayLetters.indexOf(ch);
            if (idx !== -1) result.add(idx);
          }
        }
      }
      return result.size > 0 ? result : new Set(allDaysSet);
    };

    const allowedDays: Set<number> | undefined = weekdayMatch ? parseWeekdaySpec(weekdayMatch[1]) : undefined;
    const timesStr = weekdayMatch ? weekdayMatch[2] : normalized; // 曜日セグメントがなければ全文を時間抽出対象に

    // 時間帯抽出（複数レンジ対応）
    const timeRanges: Array<{ start: number; end: number }> = [];
    const regex = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(timesStr)) !== null) {
      const [, sh, sm, eh, em] = m;
      const startHour = parseInt(sh, 10);
      const startMinute = parseInt(sm, 10);
      const endHour = parseInt(eh, 10);
      const endMinute = parseInt(em, 10);
      let startTotal = startHour * 60 + startMinute;
      let endTotal = endHour * 60 + endMinute;
      // 24:00を00:00扱い
      if (endHour === 24 && endMinute === 0) {
        endTotal = 0;
      }
      timeRanges.push({ start: startTotal, end: endTotal });
    }

    if (timeRanges.length === 0) return false;

    // 判定：曜日セグメントを考慮し、深夜跨ぎは前日・当日を切り分けて評価
    const allowed = allowedDays ?? allDaysSet;
    const isOpen = timeRanges.some(({ start, end }) => {
      if (start <= end) {
        // 通常レンジ（同日内）
        if (!allowed.has(todayIndex)) return false;
        return currentTimeMinutes >= start && currentTimeMinutes <= end;
      } else {
        // 深夜跨ぎ（例: 18:00-03:00）
        if (currentTimeMinutes >= start) {
          // 当日深夜前（start..24:00）→ 当日曜日適用
          if (!allowed.has(todayIndex)) return false;
          return currentTimeMinutes >= start;
        } else {
          // 翌日早朝（0:00..end）→ 前日曜日適用
          if (!allowed.has(prevDayIndex)) return false;
          return currentTimeMinutes <= end;
        }
      }
    });

    return isOpen;
  };

  // 営業状況の判定
  const getShopStatus = (shop: Pwamap.ShopData): 'open' | 'closed' | 'unknown' => {
    if (!shop['営業時間']) return 'unknown';
    return isShopOpen(shop) ? 'open' : 'closed';
  };

  // 営業状況バッジのテキスト
  const getStatusBadgeText = (status: 'open' | 'closed' | 'unknown'): string => {
    switch (status) {
      case 'open': return '営業中';
      case 'closed': return '閉店中';
      case 'unknown': return '営業時間不明';
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
    <div className={`search-feature ${showResults ? 'results-open' : ''}`}>
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
              {filteredResults.map((shop, index) => {
                const status = getShopStatus(shop);
                return (
                  <div
                    key={`shop-result-${index}`}
                    className={`result-item status-${status}`}
                    onClick={() => handleResultClick(shop)}
                  >
                    <div className="result-info">
                      <div className="result-header">
                        <div className="result-name">
                          {shop['スポット名']}
                        </div>
                        <span className={`status-badge ${status}`}>
                          {getStatusBadgeText(status)}
                        </span>
                      </div>
                      {(() => {
                        const cats = shop['カテゴリ']
                          ? shop['カテゴリ']
                              .split(/,|、|\s+/)
                              .map(c => c.trim())
                              .filter(c => c !== '')
                          : [];
                        return cats.length > 0 ? (
                          <div className="result-categories">
                            {cats.map((cat, idx) => (
                              <span className="category-tag" key={`cat-${idx}`}>{cat}</span>
                            ))}
                          </div>
                        ) : null;
                      })()}
                    <div className="result-line result-hours">
                      営業時間： {(() => {
                        const hoursRaw = shop['営業時間'] ? String(shop['営業時間']) : '営業時間不明';
                        const hours = removeWeekdaysFromHours(hoursRaw);
                        const hourRanges = hours.split(/\s*,\s*/).filter(Boolean);
                        return hourRanges.length > 0
                          ? hourRanges.map((range, idx) => (
                              <span key={`hr-${idx}`}>
                                {range}
                                {idx < hourRanges.length - 1 && <br />}
                              </span>
                            ))
                          : hours;
                      })()}
                    </div>
                    <div className="result-line result-closed">
                      定休日：{shop['定休日'] ? shop['定休日'] : '定休日不明'}
                    </div>
                    <div className="result-line result-address">
                      住所： {shop['住所'] ? shop['住所'] : '住所不明'}
                    </div>
                  </div>
                  <div className="result-image">
                    {shop['画像'] ? (
                      <img
                        src={(shop['画像'] && (shop['画像'].startsWith('http') || shop['画像'].startsWith('/'))) ? shop['画像'] : (shop['画像'] ? `/${shop['画像']}` : '')}
                        alt={shop['スポット名']}
                        loading="lazy"
                        decoding="async"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div style={{ width: 'auto', height: '100%', background: '#ccc' }}></div>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchFeature;
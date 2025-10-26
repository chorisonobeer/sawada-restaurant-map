import React from 'react';
import './SearchResultItem.scss';
import zen2han from '../lib/zen2han';

type SearchResultItemProps = {
  shop: any; // TypeScriptの警告を回避するためにany型を使用
  onClick: () => void;
};

const SearchResultItem: React.FC<SearchResultItemProps> = ({ shop, onClick }) => {
  // 画像URLの取得と正規化（一覧/詳細と同じロジックに合わせる）
  const rawImage: string = (shop && shop['画像']) ? String(shop['画像']).trim() : '';
  const image = rawImage ? (rawImage.startsWith('http') || rawImage.startsWith('/')) ? rawImage : `/${rawImage}` : '';
  
  // 営業時間の判定（SearchFeatureと同じロジック）
  const isShopOpen = (shop: any): boolean => {
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

    // 先頭に曜日セグメントがあれば抽出
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
          for (const ch of token.split('')) {
            const idx = dayLetters.indexOf(ch);
            if (idx !== -1) result.add(idx);
          }
        }
      }
      return result.size > 0 ? result : new Set(allDaysSet);
    };

    const allowedDays: Set<number> | undefined = weekdayMatch ? parseWeekdaySpec(weekdayMatch[1]) : undefined;
    const timesStr = weekdayMatch ? weekdayMatch[2] : normalized;

    // 時間帯抽出
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
      if (endHour === 24 && endMinute === 0) {
        endTotal = 0;
      }
      timeRanges.push({ start: startTotal, end: endTotal });
    }

    if (timeRanges.length === 0) return false;

    const allowed = allowedDays ?? allDaysSet;
    const isOpen = timeRanges.some(({ start, end }) => {
      if (start <= end) {
        if (!allowed.has(todayIndex)) return false;
        return currentTimeMinutes >= start && currentTimeMinutes <= end;
      } else {
        if (currentTimeMinutes >= start) {
          if (!allowed.has(todayIndex)) return false;
          return currentTimeMinutes >= start;
        } else {
          if (!allowed.has(prevDayIndex)) return false;
          return currentTimeMinutes <= end;
        }
      }
    });

    return isOpen;
  };

  // 営業状況の判定
  const getShopStatus = (shop: any): 'open' | 'closed' | 'unknown' => {
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

  const status = getShopStatus(shop);
  
  return (
    <div className={`search-result-item status-${status}`} onClick={onClick}>
      <div className="item-content">
        <div className="item-header">
          <div className="item-name">{shop['スポット名'] || '名称なし'}</div>
          <span className={`status-badge ${status}`}>
            {getStatusBadgeText(status)}
          </span>
        </div>
        <div className="item-detail">営業時間: {shop['営業時間'] || '情報なし'}</div>
        <div className="item-detail">定休日: {shop['定休日'] || '情報なし'}</div>
        <div className="item-detail">{shop['住所'] || '住所情報なし'}</div>
      </div>
      {image && (
        <div className="item-image-container">
          <img 
            src={image} 
            alt={shop['スポット名'] || '画像'} 
            className="item-image" 
            loading="lazy"
            decoding="async"
            width={70}
            height={70}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
    </div>
  );
};

export default SearchResultItem;
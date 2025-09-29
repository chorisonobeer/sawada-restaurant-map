import React from 'react';
import './SearchResultItem.scss';

type SearchResultItemProps = {
  shop: any; // TypeScriptの警告を回避するためにany型を使用
  onClick: () => void;
};

const SearchResultItem: React.FC<SearchResultItemProps> = ({ shop, onClick }) => {
  // 画像URLの取得
  const image = shop['画像'] || '';
  
  return (
    <div className="search-result-item" onClick={onClick}>
      <div className="item-content">
        <div className="item-name">{shop['スポット名'] || '名称なし'}</div>
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
          />
        </div>
      )}
    </div>
  );
};

export default SearchResultItem;
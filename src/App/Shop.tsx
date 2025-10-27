import React, { useEffect, useRef, useState, useContext, useMemo } from "react";
import Links from "./Links";
import "./Shop.scss";
import { AiOutlineClose } from "react-icons/ai";
import { Link } from "react-router-dom";
import { makeDistanceLabelText } from "./distance-label";
import { GeolocationContext } from "../context/GeolocationContext";
import * as turf from "@turf/turf";
import ZoomableImage from "./ZoomableImage";
import zen2han from "../lib/zen2han";

type Props = {
  shop: Pwamap.ShopData;
  close: () => void;
};

const SWIPE_THRESHOLD = 80;

const Shop: React.FC<Props> = (props) => {
  const [isClosing, setIsClosing] = useState(false);
  const [loaded, setLoaded] = useState<boolean[]>([]);
  const [localDistance, setLocalDistance] = useState<number | undefined>(undefined);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { location } = useContext(GeolocationContext);

  // アニメーション用: マウント時に .slide-in クラスを付与して右側からスライドイン
  useEffect(() => {
    if (containerRef.current) {
      setTimeout(() => {
        containerRef.current?.classList.add("slide-in");
      }, 10);
    }
  }, []);

  // もしprops.shop.distanceが未定義なら、現在位置からの距離を計算
  useEffect(() => {
    if (localDistance === undefined && location) {
      const from = turf.point(location);
      const lng = parseFloat(props.shop["経度"]);
      const lat = parseFloat(props.shop["緯度"]);
      if (!Number.isNaN(lng) && !Number.isNaN(lat)) {
        const to = turf.point([lng, lat]);
        const distance = turf.distance(from, to, { units: 'meters' as 'meters' });
        setLocalDistance(distance);
      } else {
        setLocalDistance(Infinity);
      }
    }
  }, [localDistance, location, props.shop]);

  // タッチイベント用の座標管理
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchEndX.current = null;
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    touchEndX.current = e.changedTouches[0].clientX;
    handleSwipeGesture();
  };

  // スワイプ判定: 一定以上の横スワイプで閉じる（閉じるボタンと同じ動作）
  const handleSwipeGesture = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const deltaX = touchStartX.current - touchEndX.current;
    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    // アニメーション完了後に実際のclose処理を実行
    setTimeout(() => {
      props.close();
    }, 300); // CSSのtransition時間と合わせる
  };

  const distanceTipText =
    localDistance !== undefined && localDistance !== Infinity
      ? makeDistanceLabelText(localDistance)
      : "距離不明";

  // カテゴリの分割処理
  const categories = props.shop["カテゴリ"] 
    ? props.shop["カテゴリ"].split(/,|、|\s+/).map(cat => cat.trim()).filter(cat => cat !== '')
    : [];
  
  const content = props.shop["紹介文"] || "";
  const spotName = props.shop["スポット名"] || "店名不明";

  // 営業時間から曜日を削除する関数
  const removeWeekdaysFromHours = (hours: string): string => {
    if (!hours) return hours;
    
    // 曜日パターンを削除（月-土、日,月,火など）
    return hours
      .replace(/[月火水木金土日]\s*-\s*[月火水木金土日]\s*/g, '') // 月-土 形式
      .replace(/[月火水木金土日]\s*,\s*/g, '') // 月, 火, 形式
      .replace(/[月火水木金土日]\s+/g, '') // 単独の曜日
      .replace(/^\s*,\s*/, '') // 先頭のカンマを削除
      .replace(/\s*,\s*$/, '') // 末尾のカンマを削除
      .replace(/\s+/g, ' ') // 複数のスペースを1つに
      .trim();
  };

  const hours = removeWeekdaysFromHours(props.shop["営業時間"] || "営業時間不明");
  const closed = props.shop["定休日"] || "定休日不明";
  const address = props.shop["住所"] || "住所不明";
  // TELのフォールバックと正規化
  const telCandidate = props.shop["TEL"] || props.shop["Tel"] || props.shop["ＴＥＬ"] || props.shop["電話番号"];
  const tel = typeof telCandidate === 'string' ? telCandidate.trim() : telCandidate;
  const site = props.shop["公式サイト"];
  const parking = props.shop["駐車場"];
  const foundedDate = props.shop["創業年月"];
  const payment = props.shop["支払い方法"];

  // 予約有無の正規化（全角→半角、前後空白除去）
  const reserveRawCandidate = props.shop["予約有無"] || props.shop["予約"] || props.shop["予約可"] || '';
  const reserveRaw = reserveRawCandidate != null ? reserveRawCandidate.toString() : '';
  const reserveNormalized = zen2han(reserveRaw).trim();
  const canReserveByPhone = !!(tel && (typeof tel !== 'string' || tel !== '')) && reserveNormalized === '有';

  // Google Mapsのルート検索URLを生成
  const getGoogleMapsDirectionsUrl = () => {
    const destination = encodeURIComponent(address);
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  };

  // 画像拡大表示のハンドラー
  const handleImageClick = (imageUrl: string) => {
    setExpandedImage(imageUrl);
  };

  const closeExpandedImage = () => {
    setExpandedImage(null);
  };

  // 画像データの処理
  const images = useMemo(() => {
    const imageKeys = ['画像', '画像2', '画像3', '画像4', '画像5'];
    return imageKeys
      .map(key => props.shop[key])
      .map(img => (img || '').trim())
      .filter(img => img !== '')
      .map(img => (img.startsWith('http') || img.startsWith('/')) ? img : `/${img}`);
  }, [props.shop]);

    const handleImageLoad = (idx: number) => {
      setLoaded(prev => {
        const next = [...prev];
        next[idx] = true;
        return next;
      });
    };

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, idx: number) => {
      (e.currentTarget as HTMLImageElement).style.display = 'none';
      setLoaded(prev => {
        const next = [...prev];
        next[idx] = true;
        return next;
      });
    };

    return (
      <div
        className={`shop-single ${isClosing ? 'closing' : ''}`}
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="head">
          <button onClick={handleClose}>
            <AiOutlineClose size="16px" color="#FFFFFF" /> 閉じる
          </button>
        </div>
        <div className="container">
          <h2 className="shop-title-large">{spotName}</h2>

          <div className="tag-box">
            {categories.map((category, index) => (
              <Link key={`cat-${index}`} to={`/list?category=${category}`}>
                <span className="category">{category}</span>
              </Link>
            ))}
            {distanceTipText && (
              <span className="distance">現在位置から {distanceTipText}</span>
            )}
          </div>

          <Links data={props.shop} />

          <div className="shop-route">
            <a 
              href={getGoogleMapsDirectionsUrl()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="route-link"
            >
              この場所に行くルート
            </a>
          </div>

          <div className="shop-info-box">
            <div className="info-item">
              <span className="info-label">営業時間:</span> {hours}
            </div>
            <div className="info-item">
              <span className="info-label">定休日:</span> {closed}
            </div>
            {payment && (
              <div className="info-item">
                <span className="info-label">支払い方法:</span> {payment}
              </div>
            )}
            {parking && (
              <div className="info-item">
                <span className="info-label">駐車場:</span> {parking}
              </div>
            )}
            {tel && (
              <div className="info-item">
                <span className="info-label">電話番号:</span> 
                <a href={`tel:${tel}`} className="phone-link">{tel}</a>
              </div>
            )}
            {foundedDate && (
              <div className="info-item">
                <span className="info-label">創業年月:</span> {foundedDate}
              </div>
            )}
                        <div className="info-item">
              <span className="info-label">住所:</span> {address}
            </div>
          </div>

          {images.length > 0 && (
            <div className="shop-images-grid">
              {images.map((imgUrl, index) => (
                <div
                  key={`image-${index}`}
                  className={`shop-image-item ${loaded[index] ? 'loaded' : 'loading'}`}
                >
                  {!loaded[index] && <div className="skeleton" />}
                  <img
                    src={imgUrl}
                    alt={`${props.shop['スポット名']}の写真${index+1}`}
                    className="shop-image"
                    loading={index === 0 ? 'eager' : 'lazy'}
                    onClick={() => handleImageClick(imgUrl)}
                    style={{ cursor: 'pointer' }}
                    onLoad={() => handleImageLoad(index)}
                    onError={(e) => handleImageError(e, index)}
                  />
                </div>
              ))}
            </div>
          )}

          {content && (
            <div className="shop-content">
              <p>{content}</p>
            </div>
          )}
        </div>

        {/* 画像拡大表示モーダル */}
        {expandedImage && (
          <div className="image-modal" onClick={closeExpandedImage}>
            <div className="image-modal-content" onClick={e => e.stopPropagation()}>
-              <img src={expandedImage} alt="拡大画像" />
+              <div style={{ width: '90vw', height: '70vh' }}>
+                <ZoomableImage src={expandedImage} alt="拡大画像" />
+              </div>
               <button className="close-modal" onClick={closeExpandedImage}>
                 <AiOutlineClose size="24px" color="#FFFFFF" />
               </button>
            </div>
          </div>
        )}

          <div className="action-buttons">
            {canReserveByPhone && (
              <a href={`tel:${tel}`} className="action-button phone-button">
                電話で予約する
              </a>
            )}
            {site && (
              <a
                href={site}
                target="_blank"
                rel="noopener noreferrer"
                className="action-button web-button"
              >
                ネットで予約する
              </a>
            )}
          </div>
        </div>
    );
};

export default Shop;
import React, { useState, useCallback, useMemo } from 'react'
import { ImageList, ImageListItem } from '@material-ui/core'
import Shop from './Shop'
import './Images.scss'
import config from '../config.json'

type Props = {
  data: Pwamap.ShopData[];
}

// Google Drive 画像URLをプロキシ化する関数
const transformImageUrl = (url?: string): string | undefined => {
  if (!url) return url;

  // すでに許可された形式（相対パスやHTTP(S)以外）ならそのまま返す
  if (url.startsWith('/') || url.startsWith('data:')) return url;

  // Google Driveの各種URLからIDを抽出
  const patterns = [
    /https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /https?:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /https?:\/\/drive\.google\.com\/uc\?(?:export=(?:view|download)&)?id=([a-zA-Z0-9_-]+)/,
    /https?:\/\/drive\.google\.com\/thumbnail\?id=([a-zA-Z0-9_-]+)/
  ];
  let id: string | null = null;
  for (const re of patterns) {
    const m = url.match(re);
    if (m && m[1]) { id = m[1]; break; }
  }

  // IDが取れない場合はそのまま返す（外部ホストやローカル画像など）
  if (!id) return url;

  // 実行環境に応じてプロキシベースURLを決定
  const isLocal = typeof window !== 'undefined' && (/^localhost$|^127\.0\.0\.1$/.test(window.location.hostname) || window.location.hostname === '::1');
  const proxyBase = isLocal
    ? (config.image_proxy_url_dev || config.image_proxy_url)
    : (config.image_proxy_url || '/.netlify/functions/image-proxy');

  // プロキシURLを返す（本番はNetlify Functionsを前提）
  if (proxyBase) {
    return `${proxyBase}?id=${encodeURIComponent(id)}`;
  }

  // フォールバック：サムネイルAPI（主にローカルでの確認用）
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w640`;
};

// 画像URLから一意なキーを生成する関数
const generateImageKey = (shopIndex: number, imageKey: string, imageUrl: string): string => {
  // URLのハッシュを計算（簡易版）
  const urlHash = imageUrl.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  return `img-${shopIndex}-${imageKey}-${Math.abs(urlHash)}`;
};

// 画像コンポーネント（メモ化）
const ImageItem = React.memo(({ 
  shop, 
  imageUrl,
  imageKey,
  itemKey,
  idx,
  onClick
}: { 
  shop: Pwamap.ShopData; 
  imageUrl: string;
  imageKey: string;
  itemKey: string;
  idx: number;
  onClick: (shop: Pwamap.ShopData) => void;
}) => {
  const transformedUrl = transformImageUrl(imageUrl);
  const src = transformedUrl || (imageUrl.startsWith('http') || imageUrl.startsWith('/')) ? imageUrl : `/${imageUrl}`;
  
  return (
    <ImageListItem
      key={itemKey}
      className="mui-image-list-item"
    >
      <img
        src={src}
        alt={`${shop['スポット名'] || ''}の写真${idx + 1}`}
        loading="lazy"
        decoding="async"
        width={400}
        height={300}
        onClick={() => onClick(shop)}
        onError={(e) => {
          // 画像読み込みエラー時に代替画像を設定
          const target = e.currentTarget as HTMLImageElement;
          target.src = '/logo.svg'; // 代替画像としてロゴを使用
          target.alt = '画像読み込みエラー';
          target.style.opacity = '0.5';
        }}
      />
    </ImageListItem>
  );
});

const Content = (props: Props) => {
  const { data } = props;
  const [shop, setShop] = useState<Pwamap.ShopData | undefined>()

  const popupHandler = useCallback((shop: Pwamap.ShopData) => {
    if (shop) {
      setShop(shop)
    }
  }, [])

  const closeHandler = useCallback(() => {
    setShop(undefined)
  }, [])

  // 画像リストをメモ化（重複排除対応）
  const imageList = useMemo(() => {
    const items: JSX.Element[] = [];
    const seenUrls = new Set<string>(); // 重複チェック用
    const imageKeys = ['画像', '画像2', '画像3', '画像4', '画像5'];

    for (let i = 0; i < data.length; i++) {
      const shop = data[i];

      imageKeys.forEach((key, idx) => {
        const raw = (shop[key] || '').toString().trim();
        if (!raw) return;
        
        // 画像URLを正規化（プロキシ化前のURLで比較）
        const normalizedUrl = raw;
        
        // 重複チェック: 既に表示済みの画像URLはスキップ
        if (seenUrls.has(normalizedUrl)) {
          return;
        }
        seenUrls.add(normalizedUrl);
        
        // 一意なキーを生成（URLを含める）
        const itemKey = generateImageKey(i, key, normalizedUrl);
        
        items.push(
          <ImageItem 
            key={itemKey}
            shop={shop} 
            imageUrl={raw}
            imageKey={key}
            itemKey={itemKey}
            idx={idx}
            onClick={popupHandler}
          />
        );
      });
    }

    return items;
  }, [data, popupHandler]);

  return (
    <>
      <div className="head"></div>
      <div className="images">
        <div className="container">
          <ImageList id="mui-image-list" sx={{ width: "100%", height: "100%" }} cols={2} rowHeight={164}>
            {imageList}
          </ImageList>
          {shop ?
            <Shop shop={shop} close={closeHandler} />
            :
            <></>
          }
        </div>
      </div>
    </>
  );
};

export default Content;
/** 
 * /src/App/AboutUs.tsx
 * 2025-09-17T11:00+09:00
 * 変更概要: 新しいバージョン管理システムに対応、バージョン表示機能を追加
 */
import React, { useEffect, useState } from 'react';
import './AboutUs.scss';
import config from '../config.json';
import { FaPlus } from 'react-icons/fa';

// スポンサー企業情報の型定義
type Sponsor = {
  name: string;
  imageUrl: string;
  linkUrl: string;
};

// スポンサー企業のサンプルデータ
const sponsors: Sponsor[] = [
  { name: 'スポンサー1', imageUrl: '/sponsors/sponsor1.png', linkUrl: 'https://example.com/sponsor1' },
  { name: 'スポンサー2', imageUrl: '/sponsors/sponsor2.png', linkUrl: 'https://example.com/sponsor2' },
  { name: 'スポンサー3', imageUrl: '/sponsors/sponsor3.png', linkUrl: 'https://example.com/sponsor3' },
  { name: 'スポンサー4', imageUrl: '/sponsors/sponsor4.png', linkUrl: 'https://example.com/sponsor4' },
  { name: 'スポンサー5', imageUrl: '/sponsors/sponsor5.png', linkUrl: 'https://example.com/sponsor5' },
  { name: 'スポンサー6', imageUrl: '/sponsors/sponsor6.png', linkUrl: 'https://example.com/sponsor6' },
  { name: 'スポンサー7', imageUrl: '/sponsors/sponsor7.png', linkUrl: 'https://example.com/sponsor7' },
  { name: 'スポンサー8', imageUrl: '/sponsors/sponsor8.png', linkUrl: 'https://example.com/sponsor8' },
  { name: 'スポンサー9', imageUrl: '/sponsors/sponsor9.png', linkUrl: 'https://example.com/sponsor9' },
  { name: 'スポンサー10', imageUrl: '/sponsors/sponsor10.png', linkUrl: 'https://example.com/sponsor10' },
  { name: 'スポンサー11', imageUrl: '/sponsors/sponsor11.png', linkUrl: 'https://example.com/sponsor11' },
  { name: 'スポンサー12', imageUrl: '/sponsors/sponsor12.png', linkUrl: 'https://example.com/sponsor12' },
];

const Content = () => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // コンポーネントがマウントされた後にアニメーションのためのクラスを追加
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const clickHandler = () => {
    if (config.form_url) {
      window.location.href = config.form_url;
    }
  };



  return (
    <div className="about-us">
      <div className={`hero-image ${isVisible ? 'visible' : ''}`}>
        <div className="hero-content">
          <h1>佐和田料飲店マップ2025</h1>
          <p>佐渡島の美味しいお店を探そう</p>
        </div>
      </div>

      <div className="container">
        <h2>このマップについて</h2>
        <p>
          「佐和田料飲店マップ2025」は、新潟県佐渡市佐和田町の料飲店組合が制作した
          オリジナルデジタルマップです。佐和田町の魅力ある飲食店を紹介し、地域の飲食店への
          利用促進を目的としています。
        </p>
        <p>
          佐渡市佐和田町には多くの個性的な飲食店があり、島内外からの観光客や地元の方々に
          様々な料理やお酒を楽しんでいただけます。このマップを使って、ぜひお気に入りのお店を
          見つけてください。
        </p>

        <h2>マップの使い方</h2>
        <p>このマップでは以下の方法でお店を探すことができます：</p>
        <ul>
          <li><strong>ホーム画面</strong>：地図上でお店の位置を確認できます。マーカーをタップするとお店の詳細が表示されます。</li>
          <li><strong>一覧画面</strong>：すべてのお店をリスト形式で表示します。現在地からの距離順に並んでいます。</li>
          <li><strong>写真から探す</strong>：お店の写真を一覧で見ることができます。気になる写真をタップするとお店の詳細が表示されます。</li>
          <li><strong>検索機能</strong>：画面上部の検索ボックスからキーワードでお店を検索できます。</li>
        </ul>
        <p>
          各お店の詳細ページでは、営業時間、定休日、住所、写真などの情報を確認できます。
          また、電話やウェブサイトへのリンクから直接予約も可能です。
        </p>

        <h2>スポンサー企業</h2>
        <p>このマップは以下の企業・団体様のご支援により制作されました。</p>
        
        <div className="sponsors-grid">
          {sponsors.map((sponsor, index) => (
            <div key={index} className="sponsor-item">
              <a href={sponsor.linkUrl} target="_blank" rel="noopener noreferrer">
                <img 
                  src={sponsor.imageUrl} 
                  alt={sponsor.name}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    // 画像読み込みエラー時の代替表示
                    (e.target as HTMLImageElement).src = '/sponsors/placeholder.png';
                  }}
                />
                <span className="sponsor-name">{sponsor.name}</span>
              </a>
            </div>
          ))}
        </div>

        <h2>佐和田町料飲店組合について</h2>
        <p>
          佐和田町料飲店組合は、佐渡市佐和田町にある飲食店の組合組織です。
          地域の飲食文化の発展と、お客様に安心して楽しんでいただける環境づくりを
          目指して活動しています。
        </p>

        {config.form_url ? (
          <>
            <h2>データの更新について</h2>
            <p>このアプリのデータを更新するには下の「 + 」ボタンを押してフォームに必要な情報を入力してください。</p>
            <div className="goto-form">
              <button>
                <FaPlus color="#FFFFFF" onClick={clickHandler} />
              </button>
            </div>
          </>
        ) : null}


      </div>
    </div>
  );
};

export default Content;

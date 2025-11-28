/** 
 * /src/App/AboutUs.tsx
 * 2025-11-28T10:00+09:00
 * 変更概要: リッチUI化 - ヒーロー強化/季節ギャラリー/CTAカード/控えめモーション
 */
import React, { useEffect, useState } from 'react';
import './AboutUs.scss';
import config from '../config.json';
import { Link } from 'react-router-dom';
import { FaHome, FaList, FaCamera, FaCalendarAlt } from 'react-icons/fa';

// スポンサー企業情報の型定義
type Sponsor = {
  name: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
};

// スポンサー企業のデータ
const sponsors: Sponsor[] = [
  { 
    name: '尾畑酒造', 
    description: '尾畑酒造は1892年の創業以来、世界農業遺産の島で米、水、人にそれらを育む佐渡を加えた四つの宝を和して醸す「四宝和醸」を掲げ、廃校を酒蔵に再生した学校蔵も含め、佐渡と共に歩み続けています', 
    imageUrl: '/sponsors/尾畑酒造＿バナー.png', 
    linkUrl: '#' // 実際のURLに置き換える必要があります
  },
  { 
    name: '加藤酒造店', 
    description: '代表銘柄は「金鶴」。「質実な佐渡の地酒」の姿勢を大切に、地元の米と水で佐渡の人々のくらしに根ざした地酒をつくっています。', 
    imageUrl: '/sponsors/金鶴.png', 
    linkUrl: 'https://example.com/加藤酒造店' // 実際のURLに置き換える必要があります
  },
  //{ name: 'スポンサー3', description: '', imageUrl: '/sponsors/sponsor3.png', linkUrl: 'https://example.com/sponsor3' },
  // { name: 'スポンサー4', description: '', imageUrl: '/sponsors/sponsor4.png', linkUrl: 'https://example.com/sponsor4' },
  // { name: 'スポンサー5', description: '', imageUrl: '/sponsors/sponsor5.png', linkUrl: 'https://example.com/sponsor5' },
  // { name: 'スポンサー6', description: '', imageUrl: '/sponsors/sponsor6.png', linkUrl: 'https://example.com/sponsor6' },
  // { name: 'スポンサー7', description: '', imageUrl: '/sponsors/sponsor7.png', linkUrl: 'https://example.com/sponsor7' },
   //{ name: 'スポンサー8', description: '', imageUrl: '/sponsors/sponsor8.png', linkUrl: 'https://example.com/sponsor8' },
   //{ name: 'スポンサー9', description: '', imageUrl: '/sponsors/sponsor9.png', linkUrl: 'https://example.com/sponsor9' },
   //{ name: 'スポンサー10', description: '', imageUrl: '/sponsors/sponsor10.png', linkUrl: 'https://example.com/sponsor10' },
   //{ name: 'スポンサー11', description: '', imageUrl: '/sponsors/sponsor11.png', linkUrl: 'https://example.com/sponsor11' },
   //{ name: 'スポンサー12', description: '', imageUrl: '/sponsors/sponsor12.png', linkUrl: 'https://example.com/sponsor12' },
];

const Content = () => {
  const [isVisible, setIsVisible] = useState(false);
  const seasons = [
    { key: 'spring', title: '春の佐渡', image: '/about/season-spring.webp', copy: '鮮やかな花の色と香り' },
    { key: 'summer', title: '夏の佐渡', image: '/about/season-summer.webp', copy: '雲と海のコントラスト' },
    { key: 'autumn', title: '秋の佐渡', image: '/about/season-autumn.webp', copy: '紅葉が織りなす極彩色' },
    { key: 'winter', title: '冬の佐渡', image: '/about/season-winter.webp', copy: '食材が最も旨くなる季節' },
  ];
  
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
          <div className="hero-scroll-cue" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M12 16l-5-5h10z" /></svg>
          </div>
        </div>
      </div>

      <div className="container">
        <section className="season-gallery">
          <h2>季節の佐渡</h2>
          <div className="season-row">
            {seasons.map((s) => (
              <div className="season-card" key={s.key}>
                <div className="season-image" style={{ backgroundImage: `url('${s.image}')` }} />
                <div className="season-caption">
                  <strong>{s.title}</strong>
                  <span>{s.copy}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

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
        <div className="usage-grid" role="list">
          <div className="usage-card usage-home" role="listitem">
            <div className="usage-icon" aria-hidden="true"><FaHome /></div>
            <div className="usage-text">
              <strong>ホーム</strong>
              <span>地図でお店を探す。マーカーをタップで詳細。</span>
            </div>
            <Link className="usage-link" to="/" aria-label="ホームへ移動" />
          </div>
          <div className="usage-card usage-list" role="listitem">
            <div className="usage-icon" aria-hidden="true"><FaList /></div>
            <div className="usage-text">
              <strong>一覧</strong>
              <span>距離順に並べ替え、カテゴリで絞り込み。</span>
            </div>
            <Link className="usage-link" to="/list" aria-label="一覧へ移動" />
          </div>
          <div className="usage-card usage-search" role="listitem">
            <div className="usage-icon" aria-hidden="true"><FaCamera /></div>
            <div className="usage-text">
              <strong>写真から探す</strong>
              <span>雰囲気で直感的に選べます。</span>
            </div>
            <Link className="usage-link" to="/search" aria-label="写真検索へ移動" />
          </div>
          <div className="usage-card usage-events" role="listitem">
            <div className="usage-icon" aria-hidden="true"><FaCalendarAlt /></div>
            <div className="usage-text">
              <strong>イベント</strong>
              <span>季節の催しや特集情報。</span>
            </div>
            <Link className="usage-link" to="/events" aria-label="イベントへ移動" />
          </div>
        </div>

        <h2>スポンサー企業</h2>
        <p>このマップは以下の企業・団体様のご支援により制作されました。</p>
        
        <div className="sponsors-grid">
          {sponsors.map((sponsor, index) => (
            <div key={index} className="sponsor-card">
              <div className="sponsor-info">
                <h3 className="sponsor-name">{sponsor.name}</h3>
                {sponsor.description && (
                  <p className="sponsor-description">{sponsor.description}</p>
                )}
              </div>
              <a href={sponsor.linkUrl} target="_blank" rel="noopener noreferrer" className="sponsor-link">
                <img 
                  src={sponsor.imageUrl} 
                  alt={sponsor.name}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/sponsors/placeholder.png';
                  }}
                />
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
              <button onClick={clickHandler} aria-label="データ更新フォームへ">
                <span className="plus-icon" aria-hidden="true">+</span>
              </button>
            </div>
          </>
        ) : null}


      </div>
    </div>
  );
};

export default Content;

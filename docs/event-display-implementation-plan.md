# イベント情報表示機能 実装計画書

## 概要

Pending.mdに記載されているイベント情報表示機能を実装するための計画書です。この機能は、マップとは別ページでイベント情報を表示し、別のGoogleスプレッドシート（CSV）からデータを取得する仕様となります。

## ブランチ管理

機能実装は `feature/event-display` ブランチで行います。

```bash
# ローカル環境でのブランチ操作
# ブランチの作成と切り替え（すでに実行済み）
git checkout -b feature/event-display

# 変更をコミットする際
git add .
git commit -m "イベント情報表示機能の実装"

# リモートにプッシュする際
git push origin feature/event-display

# 開発完了後、マスターブランチにマージする際はプルリクエストを作成
```

## 実装手順

### 1. 設定ファイルの変更

#### config.yml の変更

```yaml
title: NIIGATA CRAFT BEER MAP2025
description: 新潟のクラフトビールが飲める・買える・楽しめるMAPです。新潟をもっと楽しもう！！
data_url: https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5q83Qk_jPl1J5YEY9s1D-aGySypqiFuJf8QIDzYr-3W2a2RIrk3g0d6QlRgHj8NzbF3xEjLjfRIfj/pub?gid=208511176&single=true&output=csv
form_url:
logo_image_url: /logo.svg
background_image_url: /back.jpg
primary_color: "#00A0E6"
orderby: distance
# 以下を追加
event_data_url: https://docs.google.com/spreadsheets/d/e/XXXX/pub?gid=XXXX&single=true&output=csv
```

#### src/config.json の変更

```json
{
  "title": "NIIGATA CRAFT BEER MAP2025",
  "description": "新潟のクラフトビールが飲める・買える・楽しめるMAPです。新潟をもっと楽しもう！！",
  "data_url": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5q83Qk_jPl1J5YEY9s1D-aGySypqiFuJf8QIDzYr-3W2a2RIrk3g0d6QlRgHj8NzbF3xEjLjfRIfj/pub?gid=208511176&single=true&output=csv",
  "form_url": null,
  "logo_image_url": "/logo.svg",
  "background_image_url": "/back.jpg",
  "primary_color": "#00A0E6",
  "orderby": "distance",
  "event_data_url": null
}
```

### 2. 型定義の追加

#### src/types.d.ts の変更

```typescript
declare namespace Pwamap {
  // 既存の型定義
  type ShopData = ...

  // イベント情報の型定義を追加
  type EventData = {
    index: number;
    タイムスタンプ?: string;
    イベント名: string;
    開催期間: string;
    開始時間: string;
    終了時間: string;
    場所: string;
    説明文: string;
    画像URL1?: string;
    画像URL2?: string;
    画像URL3?: string;
    画像URL4?: string;
    画像URL5?: string;
    画像URL6?: string;
    主催者名: string;
    タグ?: string;
    非公開?: string;
    緯度?: string;
    経度?: string;
  }
}
```

### 3. イベントデータ取得処理の追加

#### src/App.tsx の変更

```typescript
// イベントデータの状態管理を追加
const [eventList, setEventList] = React.useState<Pwamap.EventData[]>([]);

// イベントデータのソート関数
const sortEventList = async (eventList: Pwamap.EventData[]) => {
  // 開催日順にソート
  return eventList.sort((item1, item2) => {
    return Date.parse(item1['開催期間']) - Date.parse(item2['開催期間']);
  });
}

// イベントデータの取得処理を追加
React.useEffect(() => {
  if (!config.event_data_url) return;
  
  fetch(config.event_data_url)
    .then((response) => {
      return response.ok ? response.text() : Promise.reject(response.status);
    })
    .then((data) => {
      Papa.parse(data, {
        header: true,
        complete: (results) => {
          const features = results.data;
          const nextEventList: Pwamap.EventData[] = [];
          for (let i = 0; i < features.length; i++) {
            const feature = features[i] as Pwamap.EventData;
            if (!feature['イベント名'] || !feature['開催期間']) continue;
            // 非公開フラグがある場合はスキップ
            if (feature['非公開'] && feature['非公開'].trim() !== '') continue;
            const event = { index: i, ...feature };
            nextEventList.push(event);
          }
          sortEventList(nextEventList).then((sortedEventList) => {
            setEventList(sortedEventList);
          });
        },
      });
    });
}, []);
```

### 4. イベント情報ページコンポーネントの作成

#### src/App/Events.tsx の新規作成

```typescript
/* 
Full Path: /src/App/Events.tsx
Last Modified: 2025-05-01 10:00:00
*/

import React from 'react';
import './Events.scss';
import { useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';

type Props = {
  eventList: Pwamap.EventData[];
}

const Events = (props: Props) => {
  const { eventList } = props;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedEvent, setSelectedEvent] = React.useState<Pwamap.EventData | undefined>(undefined);

  React.useEffect(() => {
    const eventId = searchParams.get('id');
    if (eventId) {
      const event = eventList.find(event => event.index === parseInt(eventId));
      setSelectedEvent(event);
    }
  }, [eventList, searchParams]);

  const showEventDetail = (event: Pwamap.EventData) => {
    navigate(`/events?id=${event.index}`);
    setSelectedEvent(event);
  }

  const closeEventDetail = () => {
    navigate('/events');
    setSelectedEvent(undefined);
  }

  // イベント詳細表示
  if (selectedEvent) {
    return (
      <div className="event-detail">
        <div className="event-detail-header">
          <button onClick={closeEventDetail} className="back-button">一覧に戻る</button>
          <h2>{selectedEvent['イベント名']}</h2>
        </div>
        <div className="event-detail-content">
          <div className="event-images">
            {selectedEvent['画像URL1'] && <img src={selectedEvent['画像URL1']} alt={selectedEvent['イベント名']} />}
            {selectedEvent['画像URL2'] && <img src={selectedEvent['画像URL2']} alt={selectedEvent['イベント名']} />}
            {selectedEvent['画像URL3'] && <img src={selectedEvent['画像URL3']} alt={selectedEvent['イベント名']} />}
            {selectedEvent['画像URL4'] && <img src={selectedEvent['画像URL4']} alt={selectedEvent['イベント名']} />}
            {selectedEvent['画像URL5'] && <img src={selectedEvent['画像URL5']} alt={selectedEvent['イベント名']} />}
            {selectedEvent['画像URL6'] && <img src={selectedEvent['画像URL6']} alt={selectedEvent['イベント名']} />}
          </div>
          <div className="event-info">
            <div className="event-info-item">
              <h3>開催期間</h3>
              <p>{selectedEvent['開催期間']}</p>
            </div>
            <div className="event-info-item">
              <h3>開始時間</h3>
              <p>{selectedEvent['開始時間']}</p>
            </div>
            <div className="event-info-item">
              <h3>終了時間</h3>
              <p>{selectedEvent['終了時間']}</p>
            </div>
            <div className="event-info-item">
              <h3>場所</h3>
              <p>{selectedEvent['場所']}</p>
            </div>
            <div className="event-info-item">
              <h3>主催者</h3>
              <p>{selectedEvent['主催者名']}</p>
            </div>
            {selectedEvent['タグ'] && (
              <div className="event-info-item">
                <h3>タグ</h3>
                <div className="event-tags">
                  {selectedEvent['タグ'].split(',').map((tag, index) => (
                    <span key={index} className="event-tag">{tag.trim()}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="event-info-item">
              <h3>説明</h3>
              <p>{selectedEvent['説明文']}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // イベント一覧表示
  return (
    <div className="events-container">
      <h1>イベント情報</h1>
      {eventList.length === 0 ? (
        <div className="no-events">イベント情報はありません</div>
      ) : (
        <div className="event-list">
          {eventList.map((event) => (
            <div key={event.index} className="event-card" onClick={() => showEventDetail(event)}>
              <div className="event-card-image">
                {event['画像URL1'] ? (
                  <img src={event['画像URL1']} alt={event['イベント名']} />
                ) : (
                  <div className="no-image">No Image</div>
                )}
              </div>
              <div className="event-card-content">
                <h3>{event['イベント名']}</h3>
                <p className="event-date">{event['開催期間']}</p>
                <p className="event-place">{event['場所']}</p>
                {event['タグ'] && (
                  <div className="event-card-tags">
                    {event['タグ'].split(',').slice(0, 3).map((tag, index) => (
                      <span key={index} className="event-tag">{tag.trim()}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Events;
```

#### src/App/Events.scss の新規作成

```scss
.events-container {
  padding: 16px;
  max-width: 1200px;
  margin: 0 auto;

  h1 {
    margin-bottom: 24px;
    text-align: center;
  }
}

.event-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.event-card {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-4px);
  }

  .event-card-image {
    height: 180px;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .no-image {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f0f0f0;
      color: #999;
    }
  }

  .event-card-content {
    padding: 16px;

    h3 {
      margin: 0 0 8px;
      font-size: 18px;
    }

    .event-date, .event-place {
      margin: 4px 0;
      font-size: 14px;
      color: #666;
    }

    .event-card-tags {
      margin-top: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
  }
}

.event-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  background-color: #f0f0f0;
  font-size: 12px;
  color: #666;
}

.no-events {
  text-align: center;
  padding: 48px 0;
  color: #999;
  font-size: 16px;
}

.event-detail {
  padding: 16px;
  max-width: 1200px;
  margin: 0 auto;

  .event-detail-header {
    margin-bottom: 24px;

    .back-button {
      margin-bottom: 16px;
      padding: 8px 16px;
      background-color: #f0f0f0;
      border: none;
      border-radius: 4px;
      cursor: pointer;

      &:hover {
        background-color: #e0e0e0;
      }
    }

    h2 {
      margin: 0;
      font-size: 24px;
    }
  }

  .event-detail-content {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;

    @media (min-width: 768px) {
      grid-template-columns: 1fr 1fr;
    }
  }

  .event-images {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;

    img {
      width: 100%;
      height: 200px;
      object-fit: cover;
      border-radius: 8px;
    }
  }

  .event-info {
    .event-info-item {
      margin-bottom: 16px;

      h3 {
        margin: 0 0 8px;
        font-size: 16px;
        color: #666;
      }

      p {
        margin: 0;
        font-size: 16px;
      }
    }

    .event-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  }
}

@media (max-width: 767px) {
  .event-list {
    grid-template-columns: 1fr;
  }
}
```

### 5. ルーティングの追加

#### src/App.tsx の変更（ルーティング部分）

```typescript
// Eventsコンポーネントのインポートを追加
import Events from './App/Events';

// Routesコンポーネント内にイベントページのルートを追加
<Routes>
  <Route path="/" element={<Home data={shopList} />} />
  <Route path="/list" element={<List data={shopList} />} />
  <Route path="/about" element={<AboutUs />} />
  <Route path="/category" element={<Category data={shopList} />} />
  <Route path="/images" element={<Images data={shopList} />} />
  {/* イベントページのルートを追加 */}
  {config.event_data_url && <Route path="/events" element={<Events eventList={eventList} />} />}
</Routes>
```

### 6. タブバーへのイベントタブ追加

#### src/App/Tabbar.tsx の変更

```typescript
// イベントタブを追加
<div className="tabbar">
  <Link to="/" className={pathname === '/' ? 'active' : ''}>
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
    <div>Map</div>
  </Link>
  <Link to="/list" className={pathname === '/list' ? 'active' : ''}>
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
    <div>List</div>
  </Link>
  <Link to="/category" className={pathname === '/category' ? 'active' : ''}>
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
    <div>Category</div>
  </Link>
  <Link to="/images" className={pathname === '/images' ? 'active' : ''}>
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
    <div>Images</div>
  </Link>
  {/* イベントタブを追加（event_data_urlがある場合のみ表示） */}
  {config.event_data_url && (
    <Link to="/events" className={pathname === '/events' ? 'active' : ''}>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
      <div>Events</div>
    </Link>
  )}
  <Link to="/about" className={pathname === '/about' ? 'active' : ''}>
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
    <div>About</div>
  </Link>
</div>
```

## テスト方法

1. 開発環境での動作確認
   ```bash
   npm start
   ```

2. イベント情報CSVの準備
   - 以下の項目を含むCSVファイルを作成し、Google Spreadsheetで公開
     - イベント名
     - 開催期間
     - 開始時間
     - 終了時間
     - 場所（住所）
     - 説明文
     - 画像URL1〜6
     - 主催者名
     - タグ（カンマ区切り）
     - 非公開（空白でない場合は非表示）
     - 緯度・経度（地図表示用）

3. config.ymlとconfig.jsonにevent_data_urlを設定

4. 以下の機能をテスト
   - イベント一覧表示
   - イベント詳細表示
   - タグによる分類表示
   - 非公開フラグによる表示/非表示
   - レスポンシブデザイン（スマートフォン・タブレット対応）

## デプロイ方法

1. 変更をコミット・プッシュ
   ```bash
   git add .
   git commit -m "イベント情報表示機能の実装"
   git push origin feature/event-display
   ```

2. GitHub上でプルリクエストを作成
   - base: master ← compare: feature/event-display

3. コードレビィー後、マージしてデプロイ

## 注意事項

- イベント情報CSVのフォーマットは厳密に守る必要があります
- 画像URLは外部サービスのURLを直接使用します
- 非公開フラグが空白でない場合は表示されません
- event_data_urlが設定されていない場合はイベントページは表示されません

---

【次のステップ】

1. イベント情報管理用のGoogleスプレッドシート（CSV）を新規作成してください。
   - 必須カラム：イベント名、開催期間、開始時間、終了時間、場所（住所）、説明文、画像URL1〜6、主催者名、タグ（カンマ区切り）、非公開（空白でない場合は非表示）、緯度・経度
2. スプレッドシートを「ウェブに公開」し、CSV形式で取得できるURLを発行してください。
3. 発行したCSVの公開URLをこちらにご提示ください。

※このURLが決まり次第、config.ymlおよびsrc/config.jsonへの設定作業に進みます。
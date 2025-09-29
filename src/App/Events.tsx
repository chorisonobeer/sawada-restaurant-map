/** 
 * /src/App/Events.tsx
 * 2025-09-17T10:00+09:00
 * 変更概要: 参加ブルワリータグ表示機能を追加（4つ以上の場合は展開表示）
 */

import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import config from "../config.json";
import LoadingSpinner from "./LoadingSpinner";
import "./Events.scss";

type EventData = Pwamap.EventData & {
  "参加ブルワリー"?: string;
};

const Events: React.FC = () => {
  // sessionStorageキャッシュを同期的にチェックして初期状態を設定
  const getCachedData = () => {
    try {
      const cached = sessionStorage.getItem("eventListCache");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  };

  const [eventList, setEventList] = useState<EventData[]>(() => getCachedData());
  const [selectedEvent, setSelectedEvent] = useState<EventData | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(() => {
    // キャッシュがある場合は初期ローディングをスキップ
    const cached = sessionStorage.getItem("eventListCache");
    return !cached;
  });
  const [error, setError] = useState<string | null>(null);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [expandedBreweries, setExpandedBreweries] = useState<{[key: number]: boolean}>({});

  useEffect(() => {
    // sessionStorageキャッシュ確認
    const cacheKey = "eventListCache";
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // キャッシュがある場合はローディング状態を即座に解除
        if (loading) {
          setLoading(false);
        }
        // バックグラウンドで最新データ取得
        fetch(config.event_data_url)
          .then((response) => {
            if (!response.ok) throw new Error("イベントデータの取得に失敗しました");
            return response.text();
          })
          .then((csv) => {
            Papa.parse(csv, {
              header: true,
              dynamicTyping: true,
              complete: (results) => {
                const features = results.data as EventData[];
                const nextEventList: EventData[] = [];
                const urlKeys: (keyof EventData)[] = ["公式サイト", "Instagram", "Facebook", "X"];
                for (let i = 0; i < features.length; i++) {
                  const feature = { ...features[i] };
                  if (!feature["イベント名"] || !feature["開催期間"]) continue;
                  urlKeys.forEach(key => {
                    let value = feature[key] as string | undefined;
                    if (value && typeof value === 'string') {
                      value = value.trim();
                      if (value.startsWith('"') && value.endsWith('"')) {
                        value = value.substring(1, value.length - 1);
                      }
                      if (value.startsWith("'") && value.endsWith("'")) {
                        value = value.substring(1, value.length - 1);
                      }
                      if (value.startsWith('`') && value.endsWith('`')) {
                        value = value.substring(1, value.length - 1);
                      }
                      (feature[key] as string) = value.trim();
                    }
                  });
                  const event = { index: i, ...feature };
                  nextEventList.push(event);
                }
                // 差分があればキャッシュ・state更新
                if (JSON.stringify(parsed) !== JSON.stringify(nextEventList)) {
                  setEventList(nextEventList);
                  sessionStorage.setItem(cacheKey, JSON.stringify(nextEventList));
                }
              },
              error: () => {},
            });
          })
          .catch(() => {});
        return;
      } catch (e) {
        // パース失敗時は通常フロー
      }
    }
    // キャッシュなし時は通常取得（loadingは既にtrueに設定済み）
    fetch(config.event_data_url)
      .then((response) => {
        if (!response.ok) throw new Error("イベントデータの取得に失敗しました");
        return response.text();
      })
      .then((csv) => {
        Papa.parse(csv, {
          header: true,
          dynamicTyping: true,
          complete: (results) => {
            const features = results.data as EventData[];
            const nextEventList: EventData[] = [];
            const urlKeys: (keyof EventData)[] = ["公式サイト", "Instagram", "Facebook", "X"];
            for (let i = 0; i < features.length; i++) {
              const feature = { ...features[i] };
              if (!feature["イベント名"] || !feature["開催期間"]) continue;
              urlKeys.forEach(key => {
                let value = feature[key] as string | undefined;
                if (value && typeof value === 'string') {
                  value = value.trim();
                  if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.substring(1, value.length - 1);
                  }
                  if (value.startsWith("'") && value.endsWith("'")) {
                    value = value.substring(1, value.length - 1);
                  }
                  if (value.startsWith('`') && value.endsWith('`')) {
                    value = value.substring(1, value.length - 1);
                  }
                  (feature[key] as string) = value.trim();
                }
              });
              const event = { index: i, ...feature };
              nextEventList.push(event);
            }
            setEventList(nextEventList);
            sessionStorage.setItem(cacheKey, JSON.stringify(nextEventList));
            setLoading(false);
          },
          error: () => {
            setError("CSVパースエラー");
            setLoading(false);
          }
        });
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [loading]);

  const showEventDetail = (event: EventData) => {
    setSelectedEvent(event);
  };

  const closeDetail = () => {
    setSelectedEvent(undefined);
  };

  const toggleBreweriesExpansion = (eventIndex: number) => {
    setExpandedBreweries(prev => ({
      ...prev,
      [eventIndex]: !prev[eventIndex]
    }));
  };

  // 参加ブルワリータグを表示するコンポーネント
  const BreweriesDisplay: React.FC<{ 
    breweries: string; 
    eventIndex: number; 
    isExpanded: boolean; 
    onToggle: () => void;
    maxVisible?: number;
  }> = ({ breweries, eventIndex, isExpanded, onToggle, maxVisible = 3 }) => {
    const breweryList = breweries.split(/[,、\s]+/).map(b => b.trim()).filter(b => b);
    
    if (breweryList.length <= maxVisible) {
      return (
        <div className="breweries-container">
          {breweryList.map((brewery, index) => (
            <span key={index} className="brewery-tag">{brewery}</span>
          ))}
        </div>
      );
    }

    const visibleBreweries = isExpanded ? breweryList : breweryList.slice(0, maxVisible);
    const hiddenCount = breweryList.length - maxVisible;

    return (
      <div className="breweries-container">
        {visibleBreweries.map((brewery, index) => (
          <span key={index} className="brewery-tag">{brewery}</span>
        ))}
        {!isExpanded && (
          <button 
            className="expand-breweries-btn" 
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            +{hiddenCount}個
          </button>
        )}
        {isExpanded && (
          <button 
            className="collapse-breweries-btn" 
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            ▲
          </button>
        )}
      </div>
    );
  };

  if (loading) return <LoadingSpinner variant="circular" size="md" text="イベント情報を読み込み中..." />;
  if (error) return <div className="events-error">{error}</div>;

  return (
    <div className="events-page">
      <h1 className="events-title">イベント一覧</h1>
      <div className="events-list">
        {eventList.length === 0 && <div>イベント情報がありません</div>}
        {eventList.map((event) => {
          const imageUrl = event["画像URL1"] as string | undefined;
          const breweries = event["参加ブルワリー"] as string | undefined;
          const isBreweriesExpanded = expandedBreweries[event.index] || false;
          
          return (
            <div key={event.index} className="event-card" onClick={() => showEventDetail(event)}>
              {imageUrl && (
                <div className="event-card-image-wrapper">
                  <img src={imageUrl} alt={event["イベント名"]} className="event-card-image" />
                </div>
              )}
              <div className="event-card-content">
                <div className="event-card-header">
                  <span className="event-name">{event["イベント名"]}</span>
                  <span className="event-date">{event["開催期間"]}</span>
                </div>
                <div className="event-place">{event["場所"]?.replace(/〒\d{3}-\d{4}\s*/, '')}</div>
                
                {/* 参加ブルワリー表示 */}
                {breweries && (
                  <div className="event-breweries-section">
                    <strong className="breweries-label">参加ブルワリー:</strong>
                    <BreweriesDisplay
                      breweries={breweries}
                      eventIndex={event.index}
                      isExpanded={isBreweriesExpanded}
                      onToggle={() => toggleBreweriesExpansion(event.index)}
                    />
                  </div>
                )}
                
                {/* <div className="event-description">{event["説明文"]?.slice(0, 60)}...</div> */}
              </div>
            </div>
          );
        })}
      </div>
      {selectedEvent && (
        <div className="event-detail-modal" onClick={closeDetail}>
          <div className="event-detail" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={closeDetail}>×</button>
            <h2 className="event-detail-title">{selectedEvent["イベント名"]}</h2>
            <div className="event-detail-section event-detail-date"><strong>開催期間:</strong> {selectedEvent["開催期間"]}</div>
            <div className="event-detail-section event-detail-place"><strong>場所:</strong> {selectedEvent["場所"] && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((selectedEvent["場所"] as string).replace(/〒\d{3}-\d{4}\s*/, ''))}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#1976d2', fontWeight: 'bold', textDecoration: 'underline' }}
              >{(selectedEvent["場所"] as string).replace(/〒\d{3}-\d{4}\s*/, '')}</a>
            )}</div>
            <div className="event-detail-section event-detail-time">
              <strong>開催時間：</strong> 
              <span className="event-time-value">
                {selectedEvent["開始/終了時間"] && (selectedEvent["開始/終了時間"] as string).split(' / ').map((time, index) => <React.Fragment key={index}>{time}{index < (selectedEvent["開始/終了時間"] as string).split(' / ').length - 1 && <br />}</React.Fragment>)}
              </span>
            </div>
            <div className="event-detail-section event-detail-description">{selectedEvent["説明文"]}</div>
            
            {/* 参加ブルワリー詳細表示 */}
            {selectedEvent["参加ブルワリー"] && (
              <div className="event-detail-section event-detail-breweries">
                <strong>参加ブルワリー:</strong>
                <div className="breweries-detail-container">
                  {(selectedEvent["参加ブルワリー"] as string).split(/[,、\s]+/).map((brewery, index) => (
                    brewery.trim() && <span key={index} className="brewery-tag-detail">{brewery.trim()}</span>
                  ))}
                </div>
              </div>
            )}
            
            {/* 公式サイト・SNSリンク */}
            <div className="event-detail-section event-detail-links">
              {selectedEvent["公式サイト"] && (
                <a href={selectedEvent["公式サイト"]} target="_blank" rel="noopener noreferrer" className="event-link official-site-link">
                  公式サイト
                </a>
              )}
              {selectedEvent["Instagram"] && (
                <a href={selectedEvent["Instagram"].startsWith('http') ? selectedEvent["Instagram"] : `https://instagram.com/${selectedEvent["Instagram"]}`} target="_blank" rel="noopener noreferrer" title="Instagram" className="event-link social-link">
                  <i className="fab fa-instagram"></i>
                </a>
              )}
              {selectedEvent["Facebook"] && (
                <a href={selectedEvent["Facebook"].startsWith('http') ? selectedEvent["Facebook"] : `https://www.facebook.com/${selectedEvent["Facebook"]}`} target="_blank" rel="noopener noreferrer" title="Facebook" className="event-link social-link">
                  <i className="fab fa-facebook"></i>
                </a>
              )}
              {selectedEvent["X"] && (
                <a href={selectedEvent["X"].startsWith('http') ? selectedEvent["X"] : `https://twitter.com/${selectedEvent["X"]}`} target="_blank" rel="noopener noreferrer" title="X (旧Twitter)" className="event-link social-link">
                  <i className="fab fa-x-twitter"></i>
                </a>
              )}
            </div>
            <div className="event-detail-section event-detail-organizer"><strong>主催:</strong> {selectedEvent["主催者名"]}</div>
            {selectedEvent["タグ"] && (
              <div className="event-detail-section event-detail-tags">
                <strong>タグ:</strong>
                <div className="tags-container">
                  {(selectedEvent["タグ"] as string).split(/[,、\s]+/).map((tag, index) => (
                    tag.trim() && <span key={index} className="tag-item">{tag.trim()}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="event-detail-images">
              {[1,2,3,4,5,6].map(n => {
                const url = selectedEvent[`画像URL${n}` as keyof EventData] as string | undefined;
                return url ? (
                  <img
                    key={n}
                    src={url}
                    alt={`イベント画像${n}`}
                    onClick={() => setImageModalUrl(url)}
                    style={{ cursor: 'pointer' }}
                  />
                ) : null;
              })}
            </div>
            {imageModalUrl && (
              <div className="image-modal" onClick={() => setImageModalUrl(null)}>
                <div className="image-modal-content" onClick={e => e.stopPropagation()}>
                  <img src={imageModalUrl} alt="拡大画像" />
                </div>
              </div>
            )}
            {selectedEvent["緯度"] && selectedEvent["経度"] && (
              <div className="event-detail-map" style={{width: '100%', height: '250px', marginTop: '16px'}}>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedEvent["緯度"]},${selectedEvent["経度"]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="event-route-link"
                  style={{ display: 'block', marginBottom: '8px', color: '#1976d2', fontWeight: 'bold', textDecoration: 'underline', textAlign: 'center' }}
                >ここまでのルート</a>
                <iframe
                  width="100%"
                  height="200"
                  frameBorder="0"
                  style={{ border: 0 }}
                  src={`https://www.google.com/maps?q=${selectedEvent["緯度"]},${selectedEvent["経度"]}&z=16&output=embed`}
                  allowFullScreen
                  title="イベント地図"
                ></iframe>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;

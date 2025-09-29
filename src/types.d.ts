interface Window {
  geolonia: any;
}

declare namespace Pwamap {
  type ShopData = {
    index: number;
    [key: string]: any;
  }

  // イベント情報の型定義
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
    公式サイト?: string;
    Instagram?: string;
    Facebook?: string;
    Twitter?: string;
    X?: string;
  }
}
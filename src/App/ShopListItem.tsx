import { BsChevronCompactRight } from 'react-icons/bs';
import './ShopListItem.scss';
import { Link } from "react-router-dom";
import { makeDistanceLabelText } from "./distance-label";

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

type Props = {
  data: Pwamap.ShopData;
  popupHandler: Function;
  queryCategory: string | null;
};

const Content = (props: Props) => {
  const clickHandler = () => {
    props.popupHandler(props.data);
  };

  const distanceTipText = props.data.distance !== undefined 
    ? makeDistanceLabelText(props.data.distance)
    : '距離不明';
  
  // カテゴリの分割処理
  const categories = props.data['カテゴリ'] 
    ? props.data['カテゴリ'].split(/,|、|\s+/).map(cat => cat.trim()).filter(cat => cat !== '')
    : [];
  
  const image = props.data['画像'];
  const isCategoryPage = props.queryCategory ? true : false;

  // 表示項目
  const hoursRaw = props.data['営業時間'] || '営業時間不明';
  const hours = removeWeekdaysFromHours(hoursRaw);
  const hourRanges = hours.split(/\s*,\s*/).filter(Boolean);
  const closed = props.data['定休日'] || '定休日不明';
  const intro = props.data['紹介文'] || '';

  return (
    <div className="shop-link">
      {props.data['エリア'] && (
        <div className="area-badge">{props.data['エリア']}</div>
      )}
      <h2 className="shop-title" style={{ wordBreak: "break-all" }} onClick={clickHandler}>
        {props.data['スポット名']}
      </h2>
      <div className='tag-box'>
        {
          !isCategoryPage && categories.map((category, index) => (
            <span className="nowrap" key={`cat-${index}`}>
              <Link to={`/list?category=${category}`}>
                <span className="category">{category}</span>
              </Link>
            </span>
          ))
        }
        <span className="nowrap">
          <span className="distance">現在位置から {distanceTipText}</span>
        </span>
      </div>

      {/* 画像の上部に四角枠で情報を配置 */}
      <div className="info-box" onClick={clickHandler}>
        <div className="info-row">
          <span className="info-label">営業時間</span>
          <span className="info-value">
            {hourRanges.length > 0 
              ? hourRanges.map((range, idx) => (
                  <span key={`hr-${idx}`}>
                    {range}
                    {idx < hourRanges.length - 1 && <br />}
                  </span>
                ))
              : hours}
          </span>
        </div>
        <div className="info-row">
          <span className="info-label">定休日</span>
          <span className="info-value">{closed}</span>
        </div>
        <div className="info-row intro">
          <span className="info-label">紹介文</span>
          <span className="info-value">{intro}</span>
        </div>
      </div>

      <div className="image-box" style={{ margin: "10px 10px 10px 0" }}>
        { image && <img src={image} alt={props.data['スポット名']} loading="lazy" decoding="async" width={320} height={240} onClick={clickHandler}/> }
      </div>
      <div className="right" onClick={clickHandler}>
        <BsChevronCompactRight size="40px" color="#CCCCCC" />
      </div>
    </div>
  );
};

export default Content;

import React from "react";
import { Link, useLocation } from "react-router-dom";
import './Tabbar.scss'

import { FaList, FaHome, FaCamera,FaCalendarAlt } from "react-icons/fa"
import { FaInfoCircle } from "react-icons/fa"

type Props = {
  onHomeClick?: () => void;
};

const Content: React.FC<Props> = ({ onHomeClick }) => {
  const location = useLocation();

  // 現在のパスに基づいてアクティブなタブを判定
  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') {
      return true;
    }
    return path !== '/' && location.pathname.startsWith(path);
  };

  return (
    <div className="tabbar">
      <ul>
        <li>
          <Link to="/" onClick={() => { onHomeClick?.(); }} className={isActive('/') ? 'active' : ''}>
            <div className="icon"><FaHome /></div>
            <div className="text">ホーム</div>
          </Link>
        </li>
        <li>
          <Link to="/list" className={isActive('/list') ? 'active' : ''}>
            <div className="icon"><FaList /></div>
            <div className="text">一覧</div>
          </Link>
        </li>
        <li>
          <Link to="/images" className={isActive('/images') ? 'active' : ''}>
            <div className="icon"><FaCamera /></div>
            <div className="text">写真から探す</div>
          </Link>
        </li>
        <li>
          <Link to="/events" className={isActive('/events') ? 'active' : ''}>
            <div className="icon"><FaCalendarAlt /></div>
            <div className="text">イベント</div>
          </Link>
        </li>
        <li>
          <Link to="/about" className={isActive('/about') ? 'active' : ''}>
            <div className="icon"><FaInfoCircle /></div>
            <div className="text">マップについて</div>
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default Content;
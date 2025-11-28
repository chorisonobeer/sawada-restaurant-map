import React, { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import './Tabbar.scss'

import { FaList, FaHome, FaCamera,FaCalendarAlt } from "react-icons/fa"
import { FaInfoCircle } from "react-icons/fa"

type Props = {
  onHomeClick?: () => void;
};

const Content: React.FC<Props> = ({ onHomeClick }) => {
  const location = useLocation();
  const textRefs = useRef<Array<HTMLDivElement | null>>([]);
  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  useEffect(() => {
    const apply = () => {
      for (let i = 0; i < textRefs.current.length; i++) {
        const t = textRefs.current[i];
        const l = linkRefs.current[i];
        if (!t || !l) continue;
        const max = 12;
        const min = 8.5;
        let size = max;
        t.style.fontSize = `${size}px`;
        const available = l.clientWidth - 10;
        t.style.maxWidth = `${available}px`;
        while (t.scrollWidth > t.clientWidth && size > min) {
          size -= 0.5;
          t.style.fontSize = `${size}px`;
        }
      }
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [location.pathname, linkRefs, textRefs]);

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
          <Link ref={(el) => { linkRefs.current[0] = el; }} to="/" onClick={() => { onHomeClick?.(); }} className={`home ${isActive('/') ? 'active' : ''}`}>
            <div className="icon"><FaHome /></div>
            <div className="text" ref={(el) => { textRefs.current[0] = el; }}>ホーム</div>
          </Link>
        </li>
        <li>
          <Link ref={(el) => { linkRefs.current[1] = el; }} to="/list" className={`list ${isActive('/list') ? 'active' : ''}`}>
            <div className="icon"><FaList /></div>
            <div className="text" ref={(el) => { textRefs.current[1] = el; }}>一覧</div>
          </Link>
        </li>
        <li>
          <Link ref={(el) => { linkRefs.current[2] = el; }} to="/images" className={`images ${isActive('/images') ? 'active' : ''}`}>
            <div className="icon"><FaCamera /></div>
            <div className="text" ref={(el) => { textRefs.current[2] = el; }}>写真から探す</div>
          </Link>
        </li>
        <li>
          <Link ref={(el) => { linkRefs.current[3] = el; }} to="/events" className={`events ${isActive('/events') ? 'active' : ''}`}>
            <div className="icon"><FaCalendarAlt /></div>
            <div className="text" ref={(el) => { textRefs.current[3] = el; }}>イベント</div>
          </Link>
        </li>
        <li>
          <Link ref={(el) => { linkRefs.current[4] = el; }} to="/about" className={`aboutus ${isActive('/about') ? 'active' : ''}`}>
            <div className="icon"><FaInfoCircle /></div>
            <div className="text" ref={(el) => { textRefs.current[4] = el; }}>マップについて</div>
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default Content;

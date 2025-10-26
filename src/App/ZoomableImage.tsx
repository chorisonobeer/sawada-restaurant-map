import React, { useRef, useState, useEffect } from 'react';

// シンプルなピンチズーム + パン対応の画像コンポーネント
// - マルチタッチ（2本指）でズーム
// - 単指ドラッグでパン
// - ダブルタップで1.5倍トグル
// - Wheelでズーム（デスクトップ）
// - スタイルはコンテナ側で最大サイズを制限する

type Props = {
  src: string;
  alt?: string;
  maxScale?: number;
  className?: string;
  style?: React.CSSProperties;
};

const ZoomableImage: React.FC<Props> = ({ src, alt = '', maxScale = 6, className, style }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const [translation, setTranslation] = useState({ x: 0, y: 0 });

  const pointers = useRef<Map<number, PointerEvent>>(new Map());
  const lastPan = useRef({ x: 0, y: 0 });
  const lastDistance = useRef<number | null>(null);
  const lastTap = useRef<number>(0);

  const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

  const getDistance = (p1: PointerEvent, p2: PointerEvent) => {
    const dx = p1.clientX - p2.clientX;
    const dy = p1.clientY - p2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, e.nativeEvent);
    lastPan.current = { x: e.nativeEvent.clientX - translation.x, y: e.nativeEvent.clientY - translation.y };

    const now = Date.now();
    if (now - lastTap.current < 300) {
      // ダブルタップでズームトグル
      const next = scale < 1.5 ? 1.5 : 1;
      setScale(next);
      if (next === 1) setTranslation({ x: 0, y: 0 });
    }
    lastTap.current = now;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, e.nativeEvent);

    if (pointers.current.size === 1) {
      // パン
      const p = Array.from(pointers.current.values())[0];
      const x = p.clientX - lastPan.current.x;
      const y = p.clientY - lastPan.current.y;
      setTranslation({ x, y });
    } else if (pointers.current.size >= 2) {
      // ピンチズーム
      const [p1, p2] = Array.from(pointers.current.values());
      const dist = getDistance(p1, p2);
      if (lastDistance.current == null) {
        lastDistance.current = dist;
        return;
      }
      const delta = dist / (lastDistance.current || dist);
      lastDistance.current = dist;
      const nextScale = clamp(scale * delta, 1, maxScale);
      setScale(nextScale);
    }
  };

  const onPointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) {
      lastDistance.current = null;
    }
    if (pointers.current.size === 0 && scale === 1) {
      setTranslation({ x: 0, y: 0 });
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    const nextScale = clamp(scale * delta, 1, maxScale);
    setScale(nextScale);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // コンテナでタッチジェスチャーを扱う
    el.style.touchAction = 'none';
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        ...style,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUpOrCancel}
      onPointerCancel={onPointerUpOrCancel}
      onWheel={onWheel}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        style={{
          display: 'block',
          transform: `translate(${translation.x}px, ${translation.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          userSelect: 'none',
          pointerEvents: 'none',
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
        }}
      />
    </div>
  );
};

export default ZoomableImage;
import React, { useRef, useState, useEffect } from 'react';

// 汎用ピンチズーム + パン対応（モバイルSafari/Android対応）
// - タッチイベントでのマルチタッチピンチをネイティブに処理
// - 単指ドラッグでパン
// - ダブルタップで1.5倍ズームトグル
// - Wheelでズーム（デスクトップ）
// - コンテナ側で overflow/touch-action を設定すること

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

  const lastTap = useRef<number>(0);
  const touchState = useRef<{
    mode: 'none' | 'pan' | 'pinch';
    startX: number;
    startY: number;
    startTransX: number;
    startTransY: number;
    startDist: number;
    startScale: number;
  }>({ mode: 'none', startX: 0, startY: 0, startTransX: 0, startTransY: 0, startDist: 0, startScale: 1 });

  const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

  const dist = (t1: Touch, t2: Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // タッチ開始
  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touches = e.nativeEvent.touches;
    if (touches.length === 1) {
      // ダブルタップ検出
      const now = Date.now();
      if (now - lastTap.current < 300) {
        const next = scale < 1.5 ? 1.5 : 1;
        setScale(next);
        if (next === 1) setTranslation({ x: 0, y: 0 });
        lastTap.current = 0; // リセット
        return;
      }
      lastTap.current = now;

      const t = touches[0];
      touchState.current = {
        mode: 'pan',
        startX: t.clientX,
        startY: t.clientY,
        startTransX: translation.x,
        startTransY: translation.y,
        startDist: 0,
        startScale: scale,
      };
    } else if (touches.length >= 2) {
      const d = dist(touches[0], touches[1]);
      touchState.current = {
        mode: 'pinch',
        startX: 0,
        startY: 0,
        startTransX: translation.x,
        startTransY: translation.y,
        startDist: d,
        startScale: scale,
      };
    }
  };

  // タッチ移動
  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    // ページスクロール・システムズームを抑制
    e.preventDefault();

    const touches = e.nativeEvent.touches;
    const st = touchState.current;

    // 二本指へ移行した瞬間にピンチモードへ初期化（単指からの追加に対応）
    if (touches.length >= 2 && st.mode !== 'pinch') {
      const d0 = dist(touches[0], touches[1]);
      touchState.current = {
        mode: 'pinch',
        startX: 0,
        startY: 0,
        startTransX: translation.x,
        startTransY: translation.y,
        startDist: d0,
        startScale: scale,
      };
    }

    if (touches.length === 1 && st.mode === 'pan') {
      const t = touches[0];
      const dx = t.clientX - st.startX;
      const dy = t.clientY - st.startY;
      setTranslation({ x: st.startTransX + dx, y: st.startTransY + dy });
    } else if (touches.length >= 2 && touchState.current.mode === 'pinch') {
      const d = dist(touches[0], touches[1]);
      const base = touchState.current.startDist || d;
      const ratio = d / base;
      const next = clamp(touchState.current.startScale * ratio, 1, maxScale);
      setScale(next);
    }
  };

  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const touches = e.nativeEvent.touches;
    if (touches.length === 0) {
      // 終了時に状態リセット
      touchState.current.mode = 'none';
      if (scale === 1) setTranslation({ x: 0, y: 0 });
    } else if (touches.length === 1) {
      // ピンチから単指に戻った場合、パンへ移行
      const t = touches[0];
      touchState.current = {
        mode: 'pan',
        startX: t.clientX,
        startY: t.clientY,
        startTransX: translation.x,
        startTransY: translation.y,
        startDist: 0,
        startScale: scale,
      };
    }
  };

  // ホイール（デスクトップ）
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    const nextScale = clamp(scale * delta, 1, maxScale);
    setScale(nextScale);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // iOS/Android向けの推奨スタイル
    el.style.touchAction = 'none';
    el.style.overscrollBehavior = 'contain';
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
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
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
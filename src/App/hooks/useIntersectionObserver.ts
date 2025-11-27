import { useEffect, useRef, useState } from 'react';

interface IntersectionObserverOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
}

const useIntersectionObserver = (
  options: IntersectionObserverOptions = {}
): [(element: Element | null) => void, boolean] => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<Element | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, options);

    observer.observe(element);

    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }); // 依存関係を完全に削除

  const setElementRef = (element: Element | null) => {
    elementRef.current = element;
  };

  return [setElementRef, isVisible];
};

export default useIntersectionObserver;
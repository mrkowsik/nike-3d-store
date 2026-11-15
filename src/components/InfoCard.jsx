import React, { useEffect, useRef } from 'react';
import { TIPS } from '../data/products';

export function InfoCard({ onClose }) {
  const cardRef = useRef(null);
  const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const tipList = isTouch ? TIPS.touch : TIPS.mouse;

  useEffect(() => {
    const handlePointerDown = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div ref={cardRef} className="info-card" role="dialog" aria-labelledby="info-card-title">
      <div className="info-card__head">
        <h2 id="info-card-title">How to explore</h2>
        <button type="button" className="info-card__close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <dl>
        {tipList.map(([title, desc]) => (
          <div key={title} className="info-card__tip">
            <dt>{title}</dt>
            <dd>{desc}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

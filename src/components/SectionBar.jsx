import React from 'react';
import { SECTIONS } from '../data/products';

export function SectionBar({ currentSection, onSelect, infoOpen, onToggleInfo }) {
  return (
    <nav className="section-bar" aria-label="Store sections">
      {SECTIONS.map((sec) => {
        const isActive = sec.id === currentSection;
        return (
          <button
            key={sec.id}
            type="button"
            className={`section-bar__item ${isActive ? 'is-active' : ''}`}
            aria-current={isActive ? 'true' : undefined}
            onClick={() => onSelect(sec.id)}
          >
            {sec.label}
          </button>
        );
      })}

      <button
        type="button"
        className={`section-bar__info ${infoOpen ? 'is-active' : ''}`}
        aria-label="How to explore"
        aria-expanded={infoOpen}
        onClick={onToggleInfo}
      >
        i
      </button>
    </nav>
  );
}

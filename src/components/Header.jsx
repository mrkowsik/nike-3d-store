import React from 'react';
import { BRAND } from '../config';
import { useCart } from '../context/CartContext';

function BagIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 8.5h9.5l1 12H8z" fill="currentColor" stroke="none" />
      <path d="M11.2 8.5V7a2.6 2.6 0 0 1 5.2 0v1.5" />
      <path d="M4.5 10h9l.9 11h-10.8z" fill="#fff" />
      <path d="M6.6 10V8.7a2.4 2.4 0 0 1 4.8 0V10" />
    </svg>
  );
}

export function Header({ onOpenCart, onHome }) {
  const { count, bounce, iconRef } = useCart();

  return (
    <header className="header">
      <div className="wordmark" onClick={onHome} role="button" tabIndex={0}>
        <span className="wordmark__name">{BRAND.name}</span>
        <span className="wordmark__tagline">{BRAND.tagline}</span>
      </div>

      <button
        ref={iconRef}
        type="button"
        className="cart-button"
        onClick={onOpenCart}
        aria-label={`Open shopping bag, ${count} items`}
      >
        <div className={`cart-button__icon ${bounce ? 'is-bouncing' : ''}`}>
          <BagIcon />
        </div>
        {count > 0 && <span className="cart-button__badge">{count}</span>}
      </button>
    </header>
  );
}

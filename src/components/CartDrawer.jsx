import React, { useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { PRODUCTS_BY_ID } from '../data/products';

export function CartDrawer({ isOpen, onClose }) {
  const { items, count, subtotal, setQty, remove, MAX_QTY } = useCart();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      <div
        className={`cart-scrim ${isOpen ? 'is-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`cart-drawer ${isOpen ? 'is-open' : ''}`} aria-label="Shopping bag">
        <div className="cart-drawer__head">
          <h2>
            Bag <span className="cart-drawer__count">({count})</span>
          </h2>
          <button
            type="button"
            className="cart-drawer__close"
            onClick={onClose}
            aria-label="Close bag"
          >
            ×
          </button>
        </div>

        {items.length === 0 ? (
          <div className="cart-drawer__empty">Your bag is empty.</div>
        ) : (
          <ul className="cart-lines">
            {items.map((item) => {
              const product = PRODUCTS_BY_ID[item.id];
              if (!product) return null;
              const thumbUrl = product.photos[0]?.url;

              return (
                <li key={item.key} className="cart-line">
                  <div className="cart-line__thumb">
                    <img src={thumbUrl} alt={product.name} />
                  </div>
                  <div className="cart-line__info">
                    <p className="cart-line__name">{product.name}</p>
                    <p className="cart-line__meta">
                      Size: {item.size} {product.colourway ? `· ${product.colourway}` : ''}
                    </p>
                    <div className="cart-line__row">
                      <span className="cart-line__price">
                        ${(product.price * item.qty).toFixed(2)}
                      </span>
                      <div className="qty">
                        <button
                          type="button"
                          disabled={item.qty <= 1}
                          onClick={() => setQty(item.key, item.qty - 1)}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span>{item.qty}</span>
                        <button
                          type="button"
                          disabled={item.qty >= MAX_QTY}
                          onClick={() => setQty(item.key, item.qty + 1)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="cart-line__remove"
                      onClick={() => remove(item.key)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="cart-drawer__foot">
          <div className="cart-drawer__subtotal">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>

          <button
            type="button"
            className="add-to-cart"
            disabled={items.length === 0}
            onClick={() => alert('This is a demo store: no orders will be processed.')}
          >
            Checkout
          </button>

          <p className="cart-drawer__notice">A demo store: nothing is for sale.</p>
        </div>
      </aside>
    </>
  );
}

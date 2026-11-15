import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { playProductClickSound, playThumbTickSound } from '../utils/sound';

export function ProductOverlay({
  product,
  index,
  totalCount,
  activeViewIndex,
  onSelectView,
  onPrev,
  onNext,
  onClose,
  onAddToCart,
  onViewCart
}) {
  const { has } = useCart();
  const [selectedSize, setSelectedSize] = useState(
    product.sizes.length === 1 ? product.sizes[0] : null
  );
  const [isShaking, setIsShaking] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const soldOutSet = new Set(product.soldOut || []);
  const isSingleSize = product.sizes.length === 1;

  const handleAddClick = () => {
    if (!selectedSize) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 450);
      return;
    }
    playProductClickSound();
    setIsAdded(true);
    onAddToCart(product, selectedSize);
    setTimeout(() => setIsAdded(false), 1200);
  };

  return (
    <div className="product-view">
      <button
        type="button"
        className="product-view__close"
        onClick={() => {
          playThumbTickSound();
          onClose();
        }}
      >
        Close
      </button>

      {/* Angle Thumbnails */}
      <div className="view-thumbs">
        {product.photos.map((photo, i) => (
          <button
            key={i}
            type="button"
            className={`view-thumbs__item ${activeViewIndex === i ? 'is-active' : ''}`}
            onClick={() => {
              playThumbTickSound();
              onSelectView(i);
            }}
            aria-label={`View angle ${i + 1}`}
          >
            <img
              src={photo.url}
              alt=""
              className={photo.mirror ? 'is-mirrored' : ''}
            />
          </button>
        ))}
      </div>

      {/* Prev / Next Step Arrows */}
      <button
        type="button"
        className="step-arrow step-arrow--prev"
        onClick={() => {
          playThumbTickSound();
          onPrev();
        }}
        aria-label="Previous product"
      >
        ←
      </button>
      <button
        type="button"
        className="step-arrow step-arrow--next"
        onClick={() => {
          playThumbTickSound();
          onNext();
        }}
        aria-label="Next product"
      >
        →
      </button>

      {/* Floating Product Glass Card */}
      <aside className="product-card" aria-label={product.name}>
        <p className="product-card__category">{product.section}</p>
        <h1 className="product-card__name">{product.name}</h1>
        <p className="product-card__price">${product.price.toFixed(2)}</p>
        {product.colourway && (
          <p className="product-card__colourway">{product.colourway}</p>
        )}

        <div className={`product-card__sizes-head ${isShaking ? 'is-missing' : ''}`}>
          <span>Select Size</span>
          {selectedSize && (
            <span className="product-card__size-label">{selectedSize}</span>
          )}
        </div>

        <div className={`size-grid ${isSingleSize ? 'size-grid--single' : ''} ${isShaking ? 'is-shaking' : ''}`}>
          {product.sizes.map((size) => {
            const isSold = soldOutSet.has(size);
            const isChosen = selectedSize === size;
            return (
              <button
                key={size}
                type="button"
                disabled={isSold}
                className={`size-grid__size ${isChosen ? 'is-chosen' : ''}`}
                onClick={() => {
                  playThumbTickSound();
                  setSelectedSize(size);
                }}
              >
                {size}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className={`add-to-cart ${isAdded ? 'is-added' : ''}`}
          onClick={handleAddClick}
        >
          {isAdded ? 'Added to Bag' : 'Add to Bag'}
        </button>

        <button
          type="button"
          className="product-card__view-cart"
          onClick={() => {
            playThumbTickSound();
            onViewCart();
          }}
        >
          View Bag
        </button>
      </aside>

      <p className="product-view__hint">Drag to rotate</p>
    </div>
  );
}

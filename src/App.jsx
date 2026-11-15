import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PRODUCTS_BY_ID, PRODUCTS_BY_SECTION } from './data/products';
import { useCart } from './context/CartContext';
import { Header } from './components/Header';
import { SectionBar } from './components/SectionBar';
import { InfoCard } from './components/InfoCard';
import { ProductOverlay } from './components/ProductCard';
import { CartDrawer } from './components/CartDrawer';
import { MusicPlayer } from './components/MusicPlayer';
import { Scene } from './scene/Scene';
import { flyToCart } from './utils/cartAnimation';
import { storeState } from './utils/registry';
import { playProductClickSound, playThumbTickSound } from './utils/sound';

export function App() {
  const [currentSection, setCurrentSection] = useState('overview');
  const [activeProduct, setActiveProduct] = useState(null);
  const [activeViewIndex, setActiveViewIndex] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const controlRef = useRef(null);
  const { add, iconRef } = useCart();

  // Dismiss HTML initial loader
  useEffect(() => {
    const loader = document.getElementById('loader');
    if (loader) {
      setTimeout(() => {
        loader.classList.add('is-done');
        loader.addEventListener('transitionend', () => loader.remove(), { once: true });
      }, 500);
    }
  }, []);

  // Global ESC key navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (cartOpen) setCartOpen(false);
        else if (infoOpen) setInfoOpen(false);
        else if (activeProduct) setActiveProduct(null);
        else if (currentSection !== 'overview') setCurrentSection('overview');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cartOpen, infoOpen, activeProduct, currentSection]);

  const handleOpenProduct = useCallback((id) => {
    const product = PRODUCTS_BY_ID[id];
    if (product) {
      playProductClickSound();
      setCurrentSection(product.section);
      setActiveProduct(product);
      setActiveViewIndex(0);
      setInfoOpen(false);
    }
  }, []);

  useEffect(() => {
    window.__openProduct = handleOpenProduct;
    return () => {
      delete window.__openProduct;
    };
  }, [handleOpenProduct]);

  const handleExitToOverview = useCallback(() => {
    setActiveProduct(null);
    setCurrentSection('overview');
  }, []);

  const handleStepProduct = useCallback((direction) => {
    if (!activeProduct) return;
    const sectionList = PRODUCTS_BY_SECTION[activeProduct.section];
    if (!sectionList || sectionList.length === 0) return;
    playThumbTickSound();
    const nextIdx = (activeProduct.index + direction + sectionList.length) % sectionList.length;
    setActiveProduct(sectionList[nextIdx]);
    setActiveViewIndex(0);
  }, [activeProduct]);

  // Bezier curve flying animation to bag
  const handleAddToCart = useCallback(
    async (product, size) => {
      const snapshot = controlRef.current?.snapshot();
      if (snapshot && iconRef.current) {
        await flyToCart(snapshot, iconRef.current, {
          phone: window.innerWidth < 700
        });
        controlRef.current?.reveal();
      }
      add(product.id, size);
    },
    [add, iconRef]
  );

  return (
    <>
      {/* 3D Scene Layer */}
      <Scene
        currentSection={currentSection}
        activeProduct={activeProduct}
        activeViewIndex={activeViewIndex}
        onViewChange={setActiveViewIndex}
        onOpenProduct={handleOpenProduct}
        onExitSection={handleExitToOverview}
        controlRef={controlRef}
      />

      {/* Persistent Header */}
      <Header
        onOpenCart={() => setCartOpen(true)}
        onHome={handleExitToOverview}
      />

      {/* Bottom Floating Section Bar */}
      {!activeProduct && (
        <SectionBar
          currentSection={currentSection}
          onSelect={(secId) => {
            setCurrentSection(secId);
            setActiveProduct(null);
          }}
          infoOpen={infoOpen}
          onToggleInfo={() => setInfoOpen((prev) => !prev)}
        />
      )}

      {/* Exploration Info Guide Modal */}
      {infoOpen && <InfoCard onClose={() => setInfoOpen(false)} />}

      {/* Product Detail Modal */}
      {activeProduct && (
        <ProductOverlay
          product={activeProduct}
          index={activeProduct.index}
          totalCount={PRODUCTS_BY_SECTION[activeProduct.section].length}
          activeViewIndex={activeViewIndex}
          onSelectView={(idx) => {
            setActiveViewIndex(idx);
            controlRef.current?.showView(idx);
          }}
          onPrev={() => handleStepProduct(-1)}
          onNext={() => handleStepProduct(1)}
          onClose={() => setActiveProduct(null)}
          onAddToCart={handleAddToCart}
          onViewCart={() => setCartOpen(true)}
        />
      )}

      {/* Shopping Bag Drawer */}
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />

      {/* Floating Background Music Player */}
      <MusicPlayer />
    </>
  );
}

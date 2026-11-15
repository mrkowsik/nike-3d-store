import React, { createContext, useContext, useReducer, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { PRODUCTS_BY_ID } from '../data/products';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

export const getCartItemKey = (id, size) => `${id}|${size}`;
const CART_STORAGE_KEY = 'virtual-store-cart';
export const MAX_QTY = 10;

function loadInitialCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item => 
      PRODUCTS_BY_ID[item.id] && 
      Number.isInteger(item.qty) && 
      item.qty > 0
    );
  } catch {
    return [];
  }
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'add': {
      const key = getCartItemKey(action.id, action.size);
      const exists = state.some(item => item.key === key);
      if (exists) {
        return state.map(item =>
          item.key === key ? { ...item, qty: Math.min(MAX_QTY, item.qty + 1) } : item
        );
      }
      return [...state, { key, id: action.id, size: action.size, qty: 1 }];
    }
    case 'setQty': {
      return state.map(item =>
        item.key === action.key ? { ...item, qty: Math.max(1, Math.min(MAX_QTY, action.qty)) } : item
      );
    }
    case 'remove': {
      return state.filter(item => item.key !== action.key);
    }
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, undefined, loadInitialCart);
  const [bounce, setBounce] = useState(false);
  const iconRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const triggerBounce = useCallback(() => {
    setBounce(true);
    setTimeout(() => setBounce(false), 500);
  }, []);

  const add = useCallback((id, size) => {
    dispatch({ type: 'add', id, size });
    triggerBounce();
  }, [triggerBounce]);

  const setQty = useCallback((key, qty) => {
    dispatch({ type: 'setQty', key, qty });
  }, []);

  const remove = useCallback((key) => {
    dispatch({ type: 'remove', key });
  }, []);

  const value = useMemo(() => {
    const keys = new Set(items.map(item => item.key));
    const count = items.reduce((acc, item) => acc + item.qty, 0);
    const subtotal = items.reduce((acc, item) => {
      const p = PRODUCTS_BY_ID[item.id];
      return acc + (p ? p.price * item.qty : 0);
    }, 0);

    return {
      items,
      count,
      subtotal,
      has: (id, size) => keys.has(getCartItemKey(id, size)),
      add,
      setQty,
      remove,
      bounce,
      iconRef,
      MAX_QTY
    };
  }, [items, add, setQty, remove, bounce]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

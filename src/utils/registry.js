export const storeRegistry = new Map();

export function registerItem(id, itemData) {
  storeRegistry.set(id, itemData);
  return () => {
    if (storeRegistry.get(id) === itemData) {
      storeRegistry.delete(id);
    }
  };
}

export function getItem(id) {
  return storeRegistry.get(id);
}

export const storeState = {
  grabbing: false,
  productOpen: false,
  touch: typeof window !== 'undefined' ? ('ontouchstart' in window || navigator.maxTouchPoints > 0) : false,
  tapHandled: false,
  centre: null
};

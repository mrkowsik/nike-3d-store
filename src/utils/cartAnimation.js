export function flyToCart(snapshot, targetEl, { phone = false } = {}) {
  return new Promise((resolve) => {
    if (!snapshot || !targetEl || !Element.prototype.animate) {
      resolve();
      return;
    }
    const { rect } = snapshot;
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      resolve();
      return;
    }

    const targetRect = targetEl.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.className = 'fly-ghost';
    Object.assign(ghost.style, {
      left: `${rect.x}px`,
      top: `${rect.y}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      pointerEvents: 'none',
      position: 'fixed',
      zIndex: '50'
    });

    const img = document.createElement('img');
    img.src = snapshot.url;
    img.alt = '';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    if (snapshot.mirror) {
      img.style.transform = 'scaleX(-1)';
    }
    ghost.appendChild(img);
    document.body.appendChild(ghost);

    const startCenter = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    const endCenter = { x: targetRect.left + targetRect.width / 2, y: targetRect.top + targetRect.height / 2 };
    let controlY = Math.min(startCenter.y, endCenter.y) - 120;
    if (phone) {
      controlY = Math.max(controlY, endCenter.y);
    }
    const controlPoint = { x: (startCenter.x + endCenter.x) / 2, y: controlY };

    const scaleEnd = Math.max(0.04, Math.min(targetRect.width / rect.width, targetRect.height / rect.height) * 0.9);
    const keyframes = [];
    const steps = 20;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const invT = 1 - t;
      const curX = invT * invT * startCenter.x + 2 * invT * t * controlPoint.x + t * t * endCenter.x;
      const curY = invT * invT * startCenter.y + 2 * invT * t * controlPoint.y + t * t * endCenter.y;
      const curScale = 1 + (scaleEnd - 1) * t;
      const opacity = t > 0.85 ? 1 - ((t - 0.85) / 0.15) * 0.7 : 1;

      keyframes.push({
        transform: `translate(${curX - startCenter.x}px, ${curY - startCenter.y}px) scale(${curScale})`,
        opacity,
        offset: t
      });
    }

    const anim = ghost.animate(keyframes, {
      duration: 850,
      easing: 'cubic-bezier(0.45, 0, 0.25, 1)',
      fill: 'forwards'
    });

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      clearTimeout(timer);
      ghost.remove();
      resolve();
    };

    const timer = setTimeout(cleanup, 900);
    anim.onfinish = cleanup;
    anim.oncancel = cleanup;
  });
}

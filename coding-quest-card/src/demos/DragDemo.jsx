import { useRef } from 'react';
import { motion, useMotionValue, useReducedMotion } from 'motion/react';

export default function DragDemo() {
  const boundsRef = useRef(null);
  const tileRef = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const reduceMotion = useReducedMotion();

  function handleKey(event) {
    const directions = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const bounds = boundsRef.current.getBoundingClientRect();
    const tile = tileRef.current.getBoundingClientRect();
    const limitX = (bounds.width - tile.width) / 2;
    const limitY = (bounds.height - tile.height) / 2;
    x.set(Math.max(-limitX, Math.min(limitX, x.get() + direction[0])));
    y.set(Math.max(-limitY, Math.min(limitY, y.get() + direction[1])));
  }

  return (
    <div className="demo">
      <div ref={boundsRef} className="demo__stage demo__stage--drag">
        <motion.button
          ref={tileRef}
          className="demo__tile demo__tile--drag"
          drag
          dragConstraints={boundsRef}
          dragElastic={0}
          dragMomentum={false}
          whileDrag={{ scale: reduceMotion ? 1 : 1.04, cursor: 'grabbing' }}
          style={{ x, y, touchAction: 'none' }}
          onKeyDown={handleKey}
          aria-label="움직이는 카드"
          aria-describedby="drag-help"
        >M</motion.button>
      </div>
      <div className="demo__controls">
        <button className="demo__button demo__button--secondary" onClick={() => { x.set(0); y.set(0); }}>위치 초기화</button>
        <span id="drag-help" className="demo__status">드래그 또는 카드에 Tab → 방향키</span>
      </div>
    </div>
  );
}

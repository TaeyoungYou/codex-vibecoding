import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export default function BasicDemo() {
  const [active, setActive] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <div className="demo">
      <div className="demo__stage">
        <motion.div
          className="demo__tile"
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            x: reduceMotion ? 0 : active ? 64 : -64,
            rotate: reduceMotion ? 0 : active ? 90 : 0,
            borderRadius: active ? 28 : 16,
          }}
          transition={{ type: 'spring', stiffness: 180, damping: 22 }}
          aria-label={active ? '변경된 목표 상태' : '처음 목표 상태'}
        >M</motion.div>
      </div>
      <div className="demo__controls">
        <button className="demo__button" onClick={() => setActive(!active)}>
          {active ? '처음 상태로' : '움직여 보기'}
        </button>
        <span className="demo__status" role="status">{active ? '목표 상태 B' : '목표 상태 A'}</span>
      </div>
    </div>
  );
}

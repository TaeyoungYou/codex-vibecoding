import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export default function GestureDemo() {
  const [count, setCount] = useState(0);
  const reduceMotion = useReducedMotion();

  return (
    <div className="demo">
      <div className="demo__stage">
        <motion.button
          className="demo__gesture"
          whileHover={{ scale: reduceMotion ? 1 : 1.06 }}
          whileTap={{ scale: reduceMotion ? 1 : 0.94 }}
          whileFocus={{ boxShadow: '0 0 0 6px #f6c1b3' }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={() => setCount(count + 1)}
        >눌러 보세요 <span aria-hidden="true">↗</span></motion.button>
      </div>
      <div className="demo__controls">
        <button className="demo__button demo__button--secondary" onClick={() => setCount(0)}>횟수 초기화</button>
        <span className="demo__status" role="status">{count}번 클릭 · Tab과 Enter로도 조작</span>
      </div>
    </div>
  );
}

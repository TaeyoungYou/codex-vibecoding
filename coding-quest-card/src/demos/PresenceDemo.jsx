import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

export default function PresenceDemo() {
  const [visible, setVisible] = useState(true);
  const reduceMotion = useReducedMotion();

  return (
    <div className="demo">
      <div className="demo__stage">
        <AnimatePresence mode="wait">
          {visible && (
            <motion.div
              key="presence-card"
              id="presence-card"
              className="demo__message"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -24 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >반가워요, Motion! <span className="demo__message-note">나갈 때도 자연스럽게.</span></motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="demo__controls">
        <button className="demo__button" aria-controls="presence-card" aria-expanded={visible} onClick={() => setVisible(!visible)}>
          {visible ? '카드 숨기기' : '카드 다시 보기'}
        </button>
        <span className="demo__status" role="status">{visible ? '카드 표시 중' : '퇴장 후 DOM에서 제거'}</span>
      </div>
    </div>
  );
}

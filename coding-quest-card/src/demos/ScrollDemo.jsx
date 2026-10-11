import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';

export default function ScrollDemo() {
  const scrollRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ container: scrollRef });
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 180]);

  return (
    <div className="demo">
      <div className="demo__scroll-wrap">
        <div className="demo__progress-track" aria-hidden="true">
          <motion.div className="demo__progress" style={{ scaleX: scrollYProgress, transformOrigin: 'left' }} />
        </div>
        <div ref={scrollRef} className="demo__scroll" tabIndex={0} role="region" aria-label="스크롤 애니메이션 예제">
          <div className="demo__scroll-start">
            <motion.div className="demo__tile" style={{ rotate: reduceMotion ? 0 : rotate }}>M</motion.div>
            <p>이 영역 안에서 아래로 스크롤하세요 ↓</p>
          </div>
          {[1, 2, 3].map((step) => (
            <motion.div
              key={step}
              className="demo__scroll-card"
              initial={{ opacity: 0.2, y: reduceMotion ? 0 : 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ root: scrollRef, amount: 0.5 }}
              transition={{ duration: 0.3 }}
            >STEP 0{step} <span>화면에 들어오면 등장합니다.</span></motion.div>
          ))}
          <p className="demo__scroll-end">끝에 도착했어요. 진행 막대를 확인하세요.</p>
        </div>
      </div>
      <div className="demo__controls">
        <button className="demo__button demo__button--secondary" onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: reduceMotion ? 'instant' : 'smooth' })}>스크롤 초기화</button>
        <span className="demo__status">휠 · 터치 · 포커스 후 방향키</span>
      </div>
    </div>
  );
}

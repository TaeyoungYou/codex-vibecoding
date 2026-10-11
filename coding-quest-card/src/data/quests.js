import BasicDemo from '../demos/BasicDemo.jsx';
import PresenceDemo from '../demos/PresenceDemo.jsx';
import GestureDemo from '../demos/GestureDemo.jsx';
import ScrollDemo from '../demos/ScrollDemo.jsx';
import DragDemo from '../demos/DragDemo.jsx';
import basicCode from '../demos/BasicDemo.jsx?raw';
import presenceCode from '../demos/PresenceDemo.jsx?raw';
import gestureCode from '../demos/GestureDemo.jsx?raw';
import scrollCode from '../demos/ScrollDemo.jsx?raw';
import dragCode from '../demos/DragDemo.jsx?raw';

export const quests = [
  {
    id: 'basics', title: '요소에 움직임을 더하기', shortTitle: '기본 애니메이션', label: '첫 움직임',
    description: '상태가 바뀌면, 움직임도 달라집니다. 목표값을 선언하고 Motion이 그 사이를 연결하게 해보세요.',
    goal: 'initial과 animate로 시작 상태와 목표 상태를 정의하고, transition으로 움직임의 느낌을 조절합니다.',
    apis: ['initial', 'animate', 'transition'],
    notes: ['initial은 첫 렌더링의 시각 상태, animate는 도달할 목표값입니다.', 'animate의 값이 바뀌면 새 목표로 애니메이션됩니다.', 'spring의 stiffness는 강도, damping은 진동을 줄이는 정도입니다.'],
    challenge: '코드의 stiffness를 바꾼다면 움직임은 어떻게 달라질까요? 자신의 프로젝트에서 값을 바꾸며 비교해보세요.',
    docs: 'https://motion.dev/docs/react-animation', Demo: BasicDemo, code: basicCode,
  },
  {
    id: 'presence', title: '사라지는 순간까지 자연스럽게', shortTitle: '등장과 퇴장', label: '존재의 전환',
    description: '요소가 사라지기 직전에도 애니메이션을 줄 수 있어요. 카드의 등장과 퇴장을 직접 비교해보세요.',
    goal: 'AnimatePresence 안에서 exit 애니메이션이 끝난 후 요소가 제거되는 흐름을 이해합니다.',
    apis: ['AnimatePresence', 'initial', 'animate', 'exit'],
    notes: ['표시 조건은 유지되는 AnimatePresence 내부에 둡니다.', '제거되는 직접 자식에는 안정적인 고유 key가 필요합니다.', 'mode="wait"는 퇴장 후 등장하는 순서이며 한 번에 자식 하나를 지원합니다.'],
    challenge: '모달이나 알림이 닫힐 때 이 패턴을 어디에 적용할 수 있을까요?',
    docs: 'https://motion.dev/docs/react-animate-presence', Demo: PresenceDemo, code: presenceCode,
  },
  {
    id: 'gestures', title: '사용자의 손끝에 반응하기', shortTitle: '버튼 제스처', label: '작은 피드백',
    description: '올리고, 누르고, 포커스해보세요. 작은 시각적 반응이 조작을 더 또렷하게 만듭니다.',
    goal: 'whileHover, whileTap, whileFocus로 포인터와 키보드 조작에 피드백을 제공합니다.',
    apis: ['whileHover', 'whileTap', 'whileFocus'],
    notes: ['whileHover는 포인터를 올린 동안의 목표 상태입니다.', 'whileTap은 누르는 동안 실행되며 손을 떼면 돌아갑니다.', '실제 button을 사용해 Tab, Enter, Space 조작을 함께 제공합니다.'],
    challenge: '주요 동작 버튼에 어느 정도의 크기 변화가 적당한지 살펴보세요.',
    docs: 'https://motion.dev/docs/react-gestures', Demo: GestureDemo, code: gestureCode,
  },
  {
    id: 'scroll', title: '스크롤을 움직임으로 연결하기', shortTitle: '스크롤 효과', label: '읽는 흐름',
    description: '화면에 들어올 때의 효과와 스크롤 진행률에 연결된 효과는 어떻게 다를까요?',
    goal: 'whileInView의 진입 효과와 useScroll·useTransform의 진행률 연동을 비교합니다.',
    apis: ['whileInView', 'useScroll', 'useTransform'],
    notes: ['이 예제의 useScroll은 container ref로 예제 영역만 추적합니다.', 'scrollYProgress는 0~1 범위의 MotionValue이며 style에 직접 연결합니다.', 'useTransform은 진행률을 회전값으로 변환하고, viewport.root는 진입 기준 영역을 지정합니다.'],
    challenge: '화면 진입 효과와 읽기 진행 막대 중 프로젝트에 필요한 것은 무엇인가요?',
    docs: 'https://motion.dev/docs/react-scroll-animations', Demo: ScrollDemo, code: scrollCode,
  },
  {
    id: 'drag', title: '직접 잡고 움직여 보기', shortTitle: '드래그', label: '직접 조작',
    description: '카드를 잡아 이동해보세요. 영역 안에서 움직이도록 범위를 제한할 수 있습니다.',
    goal: 'drag와 dragConstraints를 사용하고 키보드로도 같은 위치 상태를 변경합니다.',
    apis: ['drag', 'dragConstraints', 'whileDrag'],
    notes: ['dragConstraints의 ref는 이동을 제한하는 실제 요소에 연결합니다.', 'dragMomentum={false}는 손을 놓은 뒤 관성을 끕니다.', 'x와 y는 MotionValue입니다. 키보드와 초기화 버튼도 같은 값을 변경합니다.'],
    challenge: '드래그가 필요한 화면에서는 키보드 사용자에게 어떤 조작을 제공할 수 있을까요?',
    docs: 'https://motion.dev/docs/react-drag', Demo: DragDemo, code: dragCode,
  },
];

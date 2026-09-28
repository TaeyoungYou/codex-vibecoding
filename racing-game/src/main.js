import * as THREE from 'three';
import { createWorld, createCar, ROAD_WIDTH } from './world.js';
import { advanceVehicle, createTrackSamples, nearestTrackPoint, updateRacePosition, updateSurfaceSpeed, updateTrackProgress } from './driving.js';
import './style.css';

const $ = (selector) => document.querySelector(selector);
const ui = {
  overlay: $('#overlay'), overlayTitle: $('#overlay h1'), overlayDescription: $('#overlay-description'),
  start: $('#start-button'), pause: $('#pause-button'), sound: $('#sound-button'), reset: $('#reset-button'),
  countdown: $('#countdown'), message: $('#race-message'), toast: $('#toast'),
  position: $('#position'), lap: $('#lap'), time: $('#race-time'),
  speed: $('#speed'), speedUnit: $('.speed-unit'), speedMeter: $('#speed-meter'), boostMeter: $('#boost-meter'), boostPercent: $('#boost-percent'),
  mapSvg: $('#map-svg'), mapMarkers: $('#map-markers'), flash: $('#impact-flash'),
};

let world;
try {
  world = createWorld($('#race-canvas'));
} catch (error) {
  ui.overlayDescription.textContent = '이 게임을 실행하려면 WebGL 2를 지원하는 브라우저가 필요합니다.';
  ui.start.style.display = 'none';
  throw error;
}

const { scene, camera, renderer, length, frame, curve } = world;
const trackSamples = createTrackSamples(curve, length);
const TOTAL_LAPS = 3;
const competitors = [
  { name: 'VOLT', color: 0xff7565, speed: 48, lane: -3.4 },
  { name: 'ECHO', color: 0x67d7ef, speed: 45, lane: 3.1 },
  { name: 'NOVA', color: 0xf5c566, speed: 46.5, lane: 0.2 },
  { name: 'BLAZE', color: 0xbca8f9, speed: 43.5, lane: -2.0 },
  { name: 'ONYX', color: 0xeaeff3, speed: 44.5, lane: 3.7 },
].map((data, index) => ({
  ...data,
  distance: 16 + index * 8,
  initialDistance: 16 + index * 8,
  laneNow: data.lane,
  car: createCar(data.color, index + 1),
  marker: document.createElement('div'),
  collisionCooldown: 0,
}));

const player = {
  car: createCar(0xd6ff43),
  marker: document.createElement('div'),
  distance: 0,
  positionDistance: 0,
  x: 0,
  z: 0,
  yaw: 0,
  speed: 0,
  steer: 0,
  offroad: false,
  roadSpeed: 0,
  boost: 100,
  collisionCooldown: 0,
};
scene.add(player.car);
for (const ai of competitors) scene.add(ai.car);

let state = 'ready';
let raceTime = 0;
let countdownTime = 0;
let lastCountdown = -1;
let lastFrame = performance.now();
let displayedPosition = 6;
let messageTimeout = 0;
let toastTimeout = 0;
let hitFlash = 0;
let cameraReady = false;
let soundOn = false;
let audioContext;
let engineOscillator;
let engineGain;
const keys = new Set();
const touch = new Set();
const cameraLook = new THREE.Vector3();

function setMessage(text, duration = 1.4) {
  ui.message.textContent = text;
  ui.message.classList.add('show');
  messageTimeout = duration;
}

function showToast(text) {
  ui.toast.textContent = text;
  ui.toast.classList.add('show');
  toastTimeout = 2.2;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const wholeSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
  const hundredths = Math.floor(seconds % 1 * 100).toString().padStart(2, '0');
  return `${minutes}:${wholeSeconds}<span class="time-millis">.${hundredths}</span>`;
}

function placeCar(car, distance, lane, steer = 0, bounce = 0) {
  const f = frame(distance, lane);
  car.position.copy(f.position);
  car.position.y = 0.08 + bounce;
  car.rotation.set(0, f.angle + steer, -steer * 0.1);
}

function resetRace() {
  const startFrame = frame(0);
  player.distance = 0;
  player.positionDistance = 0;
  player.x = startFrame.position.x;
  player.z = startFrame.position.z;
  player.yaw = startFrame.angle;
  player.speed = 0;
  player.steer = 0;
  player.offroad = false;
  player.roadSpeed = 0;
  player.boost = 100;
  player.collisionCooldown = 0;
  raceTime = 0;
  hitFlash = 0;
  messageTimeout = 0;
  ui.message.classList.remove('show');
  displayedPosition = 6;
  cameraReady = false;
  competitors.forEach((ai) => {
    ai.distance = ai.initialDistance;
    ai.laneNow = ai.lane;
    ai.collisionCooldown = 0;
  });
  player.car.position.set(player.x, 0.08, player.z);
  player.car.rotation.set(0, player.yaw, 0);
  competitors.forEach(ai => placeCar(ai.car, ai.distance, ai.lane));
  updateHud();
}

function beginCountdown() {
  if (state === 'paused') {
    state = 'racing';
    ui.overlay.classList.remove('is-visible');
    ui.pause.textContent = 'Ⅱ';
    return;
  }
  resetRace();
  state = 'countdown';
  ui.overlay.classList.remove('is-visible');
  countdownTime = 3.45;
  lastCountdown = -1;
}

function togglePause() {
  if (state === 'racing') {
    state = 'paused';
    ui.overlayTitle.innerHTML = 'RACE<br /><em>PAUSED.</em>';
    ui.overlayDescription.innerHTML = '잠시 숨을 고르세요.<br />준비되면 다시 트랙으로 돌아갑니다.';
    ui.start.innerHTML = '레이스 계속 <span>↗</span>';
    ui.overlay.classList.add('is-visible');
    ui.pause.textContent = '▶';
  } else if (state === 'paused') {
    state = 'racing';
    ui.overlay.classList.remove('is-visible');
    ui.pause.textContent = 'Ⅱ';
  }
}

function finishRace() {
  state = 'finished';
  const rank = 1 + competitors.filter(ai => ai.distance > player.positionDistance).length;
  const headline = rank === 1 ? 'YOU<br /><em>WIN.</em>' : 'RACE<br /><em>OVER.</em>';
  ui.overlayTitle.innerHTML = headline;
  ui.overlayDescription.innerHTML = `${rank}위로 완주했습니다 · 최종 기록 ${formatTime(raceTime).replace(/<[^>]+>/g, '')}<br />다시 달려 더 빠른 기록에 도전하세요.`;
  ui.start.innerHTML = '다시 레이스 <span>↗</span>';
  ui.overlay.classList.add('is-visible');
  setMessage(rank === 1 ? 'CHAMPION!' : 'FINISH! ', 2);
}

function held(action) {
  const map = {
    accelerate: ['KeyW', 'ArrowUp'], brake: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], boost: ['Space'],
  };
  return touch.has(action) || map[action].some(code => keys.has(code));
}

function recoverCar() {
  if (state !== 'racing' && state !== 'paused') return;
  const f = frame(player.distance);
  player.x = f.position.x;
  player.z = f.position.z;
  player.yaw = f.angle;
  player.speed = 0;
  player.steer = 0;
  player.offroad = false;
  player.roadSpeed = 0;
  player.positionDistance = player.distance;
  player.car.position.set(player.x, 0.08, player.z);
  player.car.rotation.set(0, player.yaw, 0);
  cameraReady = false;
  showToast('트랙으로 복귀했습니다');
}

function updateRace(dt) {
  raceTime += dt;
  const previousDistance = player.distance;
  const wasOffroad = player.offroad;
  advanceVehicle(player, {
    accelerate: held('accelerate'), brake: held('brake'),
    left: held('left'), right: held('right'), boost: held('boost'),
  }, dt, player.offroad);
  const projection = nearestTrackPoint(trackSamples, length, player.x, player.z);
  const trackStatus = updateTrackProgress(player, projection, length, ROAD_WIDTH);
  updateRacePosition(player, projection, length, trackStatus.onRoad);
  updateSurfaceSpeed(player, wasOffroad, trackStatus.onRoad);
  player.offroad = !trackStatus.onRoad;
  if (player.offroad && !wasOffroad) {
    setMessage('OFF TRACK!', 1.2);
    showToast('코스를 벗어났습니다 · 도로로 돌아오거나 R로 복귀');
  } else if (!player.offroad && wasOffroad && !trackStatus.validRoute) {
    showToast('속도 복구 · 랩 진행은 R 또는 ↺로 복귀');
  }
  player.car.position.set(player.x, 0.08 + Math.sin(raceTime * 18) * Math.min(Math.abs(player.speed) / 60, 1) * 0.012, player.z);
  player.car.rotation.set(0, player.yaw, -player.steer * 0.045);

  for (let i = 0; i < competitors.length; i++) {
    const ai = competitors[i];
    const pace = ai.speed + Math.sin(raceTime * 0.5 + i * 1.7) * 1.8;
    ai.distance += pace * dt;
    const laneTarget = ai.lane + Math.sin(ai.distance * 0.014 + i * 2.1) * 0.7;
    ai.laneNow = THREE.MathUtils.damp(ai.laneNow, laneTarget, 1.9, dt);
    placeCar(ai.car, ai.distance, ai.laneNow, Math.sin(ai.distance * 0.014 + i) * 0.02);
    ai.collisionCooldown = Math.max(0, ai.collisionCooldown - dt);
    const gap = Math.hypot(ai.car.position.x - player.x, ai.car.position.z - player.z);
    if (gap < 2.8 && player.collisionCooldown <= 0 && ai.collisionCooldown <= 0) {
      player.speed *= 0.66;
      player.collisionCooldown = 1.5;
      ai.collisionCooldown = 1.5;
      hitFlash = 0.27;
      setMessage('CONTACT!', 0.75);
    }
  }
  player.collisionCooldown = Math.max(0, player.collisionCooldown - dt);

  const previousPosition = displayedPosition;
  displayedPosition = 1 + competitors.filter(ai => ai.distance > player.positionDistance).length;
  if (displayedPosition < previousPosition) setMessage('OVERTAKE!', 1.15);

  const lapBefore = Math.floor(previousDistance / length);
  const lapNow = Math.floor(player.distance / length);
  if (lapNow > lapBefore && player.distance < TOTAL_LAPS * length) setMessage(`LAP ${lapNow + 1} / ${TOTAL_LAPS}`, 1.6);
  if (player.distance >= TOTAL_LAPS * length) finishRace();
  updateHud();
}

function updateHud() {
  ui.position.textContent = String(displayedPosition).padStart(2, '0');
  ui.lap.textContent = String(Math.min(TOTAL_LAPS, Math.floor(player.distance / length) + 1)).padStart(2, '0');
  ui.time.innerHTML = formatTime(raceTime);
  ui.speed.textContent = String(Math.round(Math.abs(player.speed) * 3.6)).padStart(3, '0');
  ui.speedUnit.textContent = player.speed < -0.5 ? 'REV' : 'KM/H';
  ui.speedMeter.style.width = `${Math.min(100, Math.abs(player.speed) / 82 * 100)}%`;
  ui.boostMeter.style.width = `${player.boost}%`;
  ui.boostPercent.textContent = `${Math.ceil(player.boost)}%`;
}

const mapPoints = [];
for (let i = 0; i <= 150; i++) mapPoints.push(curve.getPointAt(i / 150));
const bounds = mapPoints.reduce((b, p) => ({
  minX: Math.min(b.minX, p.x), maxX: Math.max(b.maxX, p.x),
  minZ: Math.min(b.minZ, p.z), maxZ: Math.max(b.maxZ, p.z),
}), { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity });
const mapScale = Math.min(150 / (bounds.maxX - bounds.minX), 91 / (bounds.maxZ - bounds.minZ));
const mapPoint = (position) => ({
  x: 90 + (position.x - (bounds.minX + bounds.maxX) / 2) * mapScale,
  y: 61 + (position.z - (bounds.minZ + bounds.maxZ) / 2) * mapScale,
});
const mapPath = mapPoints.map((point, index) => {
  const p = mapPoint(point);
  return `${index === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
}).join(' ') + ' Z';
ui.mapSvg.innerHTML = `<path d="${mapPath}" fill="none" stroke="rgba(255,255,255,.19)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="${mapPath}" fill="none" stroke="#c5d5dd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
for (const ai of competitors) {
  ai.marker.className = 'map-mark';
  ui.mapMarkers.appendChild(ai.marker);
}
player.marker.className = 'map-mark player';
ui.mapMarkers.appendChild(player.marker);

function updateMap() {
  for (const racer of [...competitors, player]) {
    const p = mapPoint(racer === player ? player : frame(racer.distance).position);
    racer.marker.style.left = `${p.x / 180 * 100}%`;
    racer.marker.style.top = `${p.y / 122 * 100}%`;
  }
}

function updateCamera(dt) {
  const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  const position = new THREE.Vector3(player.x, 0, player.z);
  const desiredPosition = position.clone().addScaledVector(forward, -18);
  desiredPosition.y = 9.3 + player.speed * 0.024;
  const desiredLook = position.clone().addScaledVector(forward, 18);
  desiredLook.y = 2;
  if (!cameraReady) {
    camera.position.copy(desiredPosition);
    cameraLook.copy(desiredLook);
    cameraReady = true;
  } else {
    camera.position.lerp(desiredPosition, 1 - Math.exp(-4.5 * dt));
    cameraLook.lerp(desiredLook, 1 - Math.exp(-6 * dt));
  }
  camera.lookAt(cameraLook);
  const targetFov = 62 + Math.min(10, player.speed * 0.11);
  camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 2.4, dt);
  camera.updateProjectionMatrix();
}

function updateAudio() {
  if (!audioContext || !engineGain) return;
  const active = soundOn && state === 'racing';
  engineGain.gain.setTargetAtTime(active ? 0.015 + player.speed / 8000 : 0, audioContext.currentTime, 0.08);
  engineOscillator.frequency.setTargetAtTime(55 + player.speed * 3.2, audioContext.currentTime, 0.08);
}

function enableAudio() {
  if (!audioContext) {
    audioContext = new AudioContext();
    engineOscillator = audioContext.createOscillator();
    engineOscillator.type = 'sawtooth';
    engineGain = audioContext.createGain();
    engineGain.gain.value = 0;
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 240;
    engineOscillator.connect(filter).connect(engineGain).connect(audioContext.destination);
    engineOscillator.start();
  }
  audioContext.resume();
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  if (state === 'countdown') {
    countdownTime -= dt;
    const count = Math.ceil(countdownTime - 0.45);
    if (count !== lastCountdown) {
      lastCountdown = count;
      ui.countdown.textContent = count > 0 ? String(count) : 'GO!';
      ui.countdown.classList.remove('show');
      requestAnimationFrame(() => ui.countdown.classList.add('show'));
    }
    if (countdownTime <= 0) {
      state = 'racing';
      ui.countdown.classList.remove('show');
    }
  }
  if (state === 'racing') updateRace(dt);
  if (messageTimeout > 0) {
    messageTimeout -= dt;
    if (messageTimeout <= 0) ui.message.classList.remove('show');
  }
  if (toastTimeout > 0) {
    toastTimeout -= dt;
    if (toastTimeout <= 0) ui.toast.classList.remove('show');
  }
  hitFlash = Math.max(0, hitFlash - dt);
  ui.flash.style.opacity = String(hitFlash * 0.58);
  updateCamera(dt);
  updateMap();
  updateAudio();
  renderer.render(scene, camera);
}

ui.start.addEventListener('click', beginCountdown);
ui.pause.addEventListener('click', togglePause);
ui.reset.addEventListener('click', recoverCar);
ui.sound.addEventListener('click', () => {
  soundOn = !soundOn;
  if (soundOn) enableAudio();
  ui.sound.textContent = soundOn ? '♫' : '♪';
  ui.sound.setAttribute('aria-label', soundOn ? '사운드 끄기' : '사운드 켜기');
  ui.sound.title = soundOn ? '사운드 끄기' : '사운드 켜기';
  showToast(soundOn ? '엔진 사운드 켜짐' : '엔진 사운드 꺼짐');
});

const gameKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
window.addEventListener('keydown', (event) => {
  if (gameKeys.has(event.code)) {
    event.preventDefault();
    keys.add(event.code);
  }
  if ((event.code === 'KeyP' || event.code === 'Escape') && !event.repeat) togglePause();
  if (event.code === 'KeyR' && !event.repeat) recoverCar();
  if (event.code === 'Enter' && state === 'ready') beginCountdown();
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'racing') togglePause(); });

for (const button of document.querySelectorAll('[data-control]')) {
  const action = button.dataset.control;
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    touch.add(action);
    button.classList.add('pressed');
  });
  const release = () => { touch.delete(action); button.classList.remove('pressed'); };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
}

resetRace();
requestAnimationFrame(animate);

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { advanceVehicle, createTrackSamples, nearestTrackPoint, updateRacePosition, updateSurfaceSpeed, updateTrackProgress } from '../src/driving.js';
import { ROAD_WIDTH, TRACK_POINTS } from '../src/world.js';

const vehicle = () => ({ x: 0, z: 0, yaw: 0, steer: 0, speed: 0, boost: 100, distance: 0, positionDistance: 0 });
const input = (overrides = {}) => ({ accelerate: true, brake: false, left: false, right: false, boost: false, ...overrides });

test('holding W drives straight instead of turning with the circuit', () => {
  const car = vehicle();
  for (let i = 0; i < 120; i++) advanceVehicle(car, input(), 1 / 60, false);
  assert.equal(car.x, 0);
  assert.equal(car.yaw, 0);
  assert.ok(car.z > 20);
});

test('holding W alone leaves the actual course and cannot finish a lap', () => {
  const curve = new THREE.CatmullRomCurve3(TRACK_POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'catmullrom', 0.45);
  curve.arcLengthDivisions = 4000;
  const length = curve.getLength();
  const samples = createTrackSamples(curve, length);
  const start = curve.getPointAt(0);
  const tangent = curve.getTangentAt(0);
  const car = { ...vehicle(), x: start.x, z: start.z, yaw: Math.atan2(tangent.x, tangent.z) };
  let offroad = false;
  for (let i = 0; i < 60 * 15; i++) {
    advanceVehicle(car, input(), 1 / 60, offroad);
    offroad = !updateTrackProgress(car, nearestTrackPoint(samples, length, car.x, car.z), length, ROAD_WIDTH).onRoad;
  }
  assert.ok(offroad);
  assert.ok(car.distance < length / 4);
});

test('A turns left, D turns right, and S brakes then reverses', () => {
  const left = vehicle();
  const right = vehicle();
  left.speed = right.speed = 30;
  for (let i = 0; i < 30; i++) {
    advanceVehicle(left, input({ left: true }), 1 / 60, false);
    advanceVehicle(right, input({ right: true }), 1 / 60, false);
  }
  const camera = new THREE.PerspectiveCamera(64, 1, 0.1, 1000);
  camera.position.set(0, 9, -18);
  camera.lookAt(0, 2, 18);
  camera.updateMatrixWorld();
  assert.ok(left.yaw > 0 && new THREE.Vector3(left.x, 0, left.z).project(camera).x < 0);
  assert.ok(right.yaw < 0 && new THREE.Vector3(right.x, 0, right.z).project(camera).x > 0);
  for (let i = 0; i < 100; i++) advanceVehicle(right, input({ accelerate: false, brake: true, right: false }), 1 / 60, false);
  assert.ok(right.speed < 0);
});

test('off-road driving loses speed and cannot skip a large part of the lap', () => {
  const car = vehicle();
  car.speed = 50;
  advanceVehicle(car, input(), 1 / 60, true);
  assert.ok(car.speed <= 22);
  const square = [
    { x: 0, z: 0 }, { x: 100, z: 0 }, { x: 100, z: 100 }, { x: 0, z: 100 },
  ];
  car.distance = 0;
  const projection = nearestTrackPoint(square, 400, 60, 2);
  assert.ok(projection.distance > 50);
  const status = updateTrackProgress(car, projection, 400, 14);
  assert.equal(car.distance, 0);
  assert.deepEqual(status, { onRoad: true, validRoute: false });
});

test('returning to the road restores the speed held before leaving it', () => {
  const car = vehicle();
  car.speed = 52;
  updateSurfaceSpeed(car, false, false);
  advanceVehicle(car, input(), 1 / 60, true);
  assert.ok(car.speed <= 22);
  updateSurfaceSpeed(car, true, true);
  assert.equal(car.speed, 52);
});

test('progress crosses the finish line after following the road', () => {
  const car = vehicle();
  car.distance = 398;
  updateTrackProgress(car, { distance: 2, lateral: 0 }, 400, 14);
  assert.equal(car.distance, 402);
});

test('passing rivals changes position even while lap credit is paused', () => {
  const car = vehicle();
  const rivals = [20, 30, 40, 50, 60];
  const curve = new THREE.CatmullRomCurve3(TRACK_POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'catmullrom', 0.45);
  curve.arcLengthDivisions = 4000;
  const length = curve.getLength();
  const samples = createTrackSamples(curve, length);
  for (let distance = 16; distance <= 65; distance++) {
    const point = curve.getPointAt(distance / length);
    const projection = nearestTrackPoint(samples, length, point.x, point.z);
    const route = updateTrackProgress(car, projection, length, ROAD_WIDTH);
    updateRacePosition(car, projection, length, route.onRoad);
  }
  assert.equal(car.distance, 0);
  assert.equal(1 + rivals.filter(distance => distance > car.positionDistance).length, 1);
  const position = car.positionDistance;
  updateRacePosition(car, { distance: 90 }, length, false);
  assert.equal(car.positionDistance, position);
});

test('position remains continuous across the start line', () => {
  const car = vehicle();
  car.positionDistance = 398;
  updateRacePosition(car, { distance: 2 }, 400, true);
  assert.equal(car.positionDistance, 402);
});

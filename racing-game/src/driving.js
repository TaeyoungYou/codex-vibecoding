// These functions have no rendering dependencies so the steering and lap rules
// can be checked without a browser or WebGL.
export function createTrackSamples(curve, length, count = 480) {
  return Array.from({ length: count }, (_, index) => {
    const point = curve.getPointAt(index / count);
    return { x: point.x, z: point.z, distance: index * length / count };
  });
}

export function nearestTrackPoint(samples, length, x, z) {
  let nearest = null;
  for (let index = 0; index < samples.length; index++) {
    const a = samples[index];
    const b = samples[(index + 1) % samples.length];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const segmentLengthSquared = dx * dx + dz * dz;
    const along = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / segmentLengthSquared));
    const centerX = a.x + dx * along;
    const centerZ = a.z + dz * along;
    const offsetX = x - centerX;
    const offsetZ = z - centerZ;
    const gapSquared = offsetX * offsetX + offsetZ * offsetZ;
    if (nearest === null || gapSquared < nearest.gapSquared) {
      const segmentLength = Math.sqrt(segmentLengthSquared);
      nearest = {
        distance: ((index + along) / samples.length) * length,
        lateral: (offsetX * dz - offsetZ * dx) / segmentLength,
        gapSquared,
      };
    }
  }
  return nearest;
}

export function updateTrackProgress(vehicle, projection, length, roadWidth) {
  const onRoad = Math.abs(projection.lateral) <= roadWidth / 2 + 1.3;
  const wrapped = ((vehicle.distance % length) + length) % length;
  let delta = projection.distance - wrapped;
  if (delta > length / 2) delta -= length;
  if (delta < -length / 2) delta += length;
  // A missed corner cannot grant progress when the car rejoins farther ahead.
  const validRoute = onRoad && Math.abs(delta) <= 12;
  if (validRoute) vehicle.distance = Math.max(0, vehicle.distance + delta);
  return { onRoad, validRoute };
}

export function updateRacePosition(vehicle, projection, length, onRoad) {
  if (!onRoad) return;
  const wrapped = ((vehicle.positionDistance % length) + length) % length;
  let delta = projection.distance - wrapped;
  if (delta > length / 2) delta -= length;
  if (delta < -length / 2) delta += length;
  // Position follows the car on the road even if a missed corner pauses lap credit.
  vehicle.positionDistance = Math.max(0, vehicle.positionDistance + delta);
}

export function updateSurfaceSpeed(vehicle, wasOffroad, onRoad) {
  if (!wasOffroad && !onRoad) vehicle.roadSpeed = Math.max(0, vehicle.speed);
  if (wasOffroad && onRoad && vehicle.speed > 0) {
    vehicle.speed = Math.max(vehicle.speed, Math.min(vehicle.roadSpeed || 0, 61));
  }
}

export function advanceVehicle(vehicle, input, dt, offroad) {
  // The chase camera looks along local +Z, so its screen-right points to -X.
  const steerTarget = Number(input.left) - Number(input.right);
  vehicle.steer += (steerTarget - vehicle.steer) * Math.min(1, dt * 8);

  let acceleration = -Math.sign(vehicle.speed) * (4.5 + Math.abs(vehicle.speed) * 0.055);
  if (input.accelerate) acceleration = vehicle.speed < -0.5 ? 42 : 25 - Math.max(0, vehicle.speed) * 0.06;
  if (input.brake) acceleration = vehicle.speed > 0.5 ? -46 : -17;
  const boosting = input.boost && input.accelerate && !offroad && vehicle.boost > 0 && vehicle.speed > 9;
  if (boosting) {
    acceleration += 30;
    vehicle.boost = Math.max(0, vehicle.boost - 40 * dt);
  } else {
    vehicle.boost = Math.min(100, vehicle.boost + 8.5 * dt);
  }
  if (offroad) acceleration -= Math.sign(vehicle.speed || 1) * 13;
  const speedLimit = offroad ? 22 : boosting ? 82 : 61;
  const priorSpeed = vehicle.speed;
  vehicle.speed = Math.max(-13, Math.min(speedLimit, vehicle.speed + acceleration * dt));
  if (!input.accelerate && !input.brake && priorSpeed * vehicle.speed < 0) vehicle.speed = 0;

  const grip = offroad ? 0.72 : 1;
  const turnRate = (0.48 + Math.min(1.05, Math.abs(vehicle.speed) * 0.021)) * Math.min(1, Math.abs(vehicle.speed) / 8) * grip;
  vehicle.yaw += vehicle.steer * turnRate * Math.sign(vehicle.speed) * dt;
  vehicle.x += Math.sin(vehicle.yaw) * vehicle.speed * dt;
  vehicle.z += Math.cos(vehicle.yaw) * vehicle.speed * dt;
}

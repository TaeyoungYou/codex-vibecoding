import * as THREE from 'three';

export const ROAD_WIDTH = 14;
export const TRACK_POINTS = [
  [-116, -44], [-97, -113], [-34, -157], [52, -151], [123, -101],
  [157, -27], [135, 50], [77, 108], [-7, 125], [-92, 92], [-145, 28],
];

const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.84, ...extra });
const asphalt = material(0x252b36);
const shoulder = material(0x53636a);
const white = material(0xe9eee5);
const curbRed = material(0xf26d69);

export function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.55;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8285a1);
  scene.fog = new THREE.FogExp2(0x8589a2, 0.0025);
  scene.add(new THREE.HemisphereLight(0xe3eaff, 0x354443, 2.1));
  const sun = new THREE.DirectionalLight(0xffd7ac, 2.4);
  sun.position.set(-110, 140, -80);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xb9c8ff, 0.9);
  fill.position.set(120, 55, 100);
  scene.add(fill);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), material(0x263d3d));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.13;
  scene.add(ground);

  const curve = new THREE.CatmullRomCurve3(TRACK_POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'catmullrom', 0.45);
  curve.arcLengthDivisions = 4000;
  const length = curve.getLength();

  function frame(distance, lane = 0) {
    const t = ((distance % length) + length) % length / length;
    const center = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const normal = new THREE.Vector3(tangent.z, 0, -tangent.x);
    return { position: center.addScaledVector(normal, lane), tangent, normal, angle: Math.atan2(tangent.x, tangent.z) };
  }

  function ribbon(offsetA, offsetB, y, mat, segments = 400) {
    const vertices = [];
    const indices = [];
    for (let i = 0; i <= segments; i++) {
      const f = frame(length * i / segments);
      for (const offset of [offsetA, offsetB]) {
        const p = f.position.clone().addScaledVector(f.normal, offset);
        vertices.push(p.x, y, p.z);
      }
      if (i < segments) {
        const n = i * 2;
        indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, mat);
    scene.add(mesh);
    return mesh;
  }

  const double = (base) => { const clone = base.clone(); clone.side = THREE.DoubleSide; return clone; };
  ribbon(-9.1, 9.1, 0, double(shoulder));
  ribbon(-ROAD_WIDTH / 2, ROAD_WIDTH / 2, 0.045, double(asphalt));
  ribbon(-ROAD_WIDTH / 2 + 0.45, -ROAD_WIDTH / 2 + 0.62, 0.053, double(white));
  ribbon(ROAD_WIDTH / 2 - 0.62, ROAD_WIDTH / 2 - 0.45, 0.053, double(white));
  ribbon(-0.06, 0.06, 0.052, double(material(0x69737c)));

  const stripeGeometry = new THREE.BoxGeometry(0.13, 0.012, 3.5);
  for (let d = 0; d < length; d += 11) {
    const f = frame(d);
    for (const lane of [-ROAD_WIDTH / 4, ROAD_WIDTH / 4]) {
      const stripe = new THREE.Mesh(stripeGeometry, white);
      stripe.position.copy(f.position).addScaledVector(f.normal, lane);
      stripe.position.y = 0.061;
      stripe.rotation.y = f.angle;
      scene.add(stripe);
    }
  }

  const curbGeometry = new THREE.BoxGeometry(0.78, 0.1, 4.1);
  for (let d = 0, index = 0; d < length; d += 4.4, index++) {
    const f = frame(d);
    for (const side of [-1, 1]) {
      const curb = new THREE.Mesh(curbGeometry, index % 2 ? white : curbRed);
      curb.position.copy(f.position).addScaledVector(f.normal, side * 7.44);
      curb.position.y = 0.08;
      curb.rotation.y = f.angle;
      scene.add(curb);
    }
  }

  // Start / finish checkerboard.
  const checker = new THREE.BoxGeometry(ROAD_WIDTH / 12, 0.014, 1.1);
  const start = frame(0);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 12; col++) {
      const tile = new THREE.Mesh(checker, (row + col) % 2 ? white : asphalt);
      tile.position.copy(start.position).addScaledVector(start.normal, -ROAD_WIDTH / 2 + (col + 0.5) * ROAD_WIDTH / 12);
      tile.position.addScaledVector(start.tangent, row * 1.1);
      tile.position.y = 0.065;
      tile.rotation.y = start.angle;
      scene.add(tile);
    }
  }

  function signTexture(label, bg = '#d6ff43', fg = '#111921') {
    const sign = document.createElement('canvas');
    sign.width = 512;
    sign.height = 128;
    const context = sign.getContext('2d');
    context.fillStyle = bg;
    context.fillRect(0, 0, sign.width, sign.height);
    context.fillStyle = fg;
    context.font = '900 68px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, 256, 68);
    const texture = new THREE.CanvasTexture(sign);
    texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
  }

  const arch = new THREE.Group();
  const dark = material(0x17212b);
  for (const x of [-8.3, 8.3]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.65, 8.5, 0.7), dark);
    post.position.set(x, 4.25, 0);
    arch.add(post);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(17.4, 2.1, 0.8), dark);
  top.position.y = 8.1;
  arch.add(top);
  const title = new THREE.Mesh(new THREE.PlaneGeometry(14.6, 1.55), signTexture('APEX  RUSH'));
  title.position.set(0, 8.15, 0.43);
  arch.add(title);
  const titleBack = title.clone();
  titleBack.rotation.y = Math.PI;
  titleBack.position.z = -0.43;
  arch.add(titleBack);
  arch.position.copy(start.position);
  arch.rotation.y = start.angle;
  scene.add(arch);

  let seed = 1847;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const trunkMaterial = material(0x293737);
  const treeColors = [0x315c58, 0x407062, 0x496c66, 0x537d72].map(c => material(c));
  const treeTrunk = new THREE.CylinderGeometry(0.25, 0.38, 2.4, 5);
  const pine = new THREE.ConeGeometry(2.4, 8, 5);
  for (let i = 0; i < 145; i++) {
    const d = random() * length;
    const side = random() < 0.5 ? -1 : 1;
    const f = frame(d, side * (16 + random() * 43));
    const scale = 0.75 + random() * 1.1;
    const trunk = new THREE.Mesh(treeTrunk, trunkMaterial);
    trunk.position.copy(f.position);
    trunk.position.y = 1.1 * scale;
    trunk.scale.setScalar(scale);
    const crown = new THREE.Mesh(pine, treeColors[Math.floor(random() * treeColors.length)]);
    crown.position.copy(f.position);
    crown.position.y = 5.3 * scale;
    crown.scale.setScalar(scale);
    scene.add(trunk, crown);
  }

  const rockColors = [0x505970, 0x56617b, 0x4b6071].map(c => material(c, { flatShading: true }));
  for (let i = 0; i < 46; i++) {
    const angle = i / 46 * Math.PI * 2;
    const radius = 235 + random() * 220;
    const height = 30 + random() * 65;
    const rock = new THREE.Mesh(new THREE.ConeGeometry(22 + random() * 24, height, 5), rockColors[i % rockColors.length]);
    rock.position.set(Math.cos(angle) * radius, height / 2 - 4, Math.sin(angle) * radius);
    rock.rotation.y = random() * Math.PI;
    scene.add(rock);
  }

  const postGeometry = new THREE.CylinderGeometry(0.1, 0.16, 9, 6);
  const bulbGeometry = new THREE.BoxGeometry(1.2, 0.36, 0.8);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xe1ff8c });
  for (let d = 26; d < length; d += 56) {
    const side = Math.floor(d / 56) % 2 ? -1 : 1;
    const f = frame(d, side * 11.8);
    const pole = new THREE.Mesh(postGeometry, dark);
    pole.position.copy(f.position);
    pole.position.y = 4.5;
    const lamp = new THREE.Mesh(bulbGeometry, lampMat);
    lamp.position.copy(f.position);
    lamp.position.y = 9.05;
    scene.add(pole, lamp);
  }

  for (const d of [length * 0.23, length * 0.51, length * 0.77]) {
    const f = frame(d, 11.3);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.25), signTexture('FULL THROTTLE', '#222c3a', '#d6ff43'));
    board.position.copy(f.position);
    board.position.y = 4.1;
    board.rotation.y = f.angle + Math.PI / 2;
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.26, 4, 0.26), dark);
    pole.position.copy(f.position);
    pole.position.y = 2;
    scene.add(board, pole);
  }

  const camera = new THREE.PerspectiveCamera(64, window.innerWidth / window.innerHeight, 0.1, 1100);
  const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  return { renderer, scene, camera, curve, length, frame };
}

export function createCar(color, number = 0) {
  const car = new THREE.Group();
  const paint = material(color, { metalness: 0.42, roughness: 0.31 });
  const trim = material(0x101722, { metalness: 0.1, roughness: 0.63 });
  const glass = material(0x334454, { metalness: 0.65, roughness: 0.15 });
  const tire = material(0x0b1016);
  const wheelRim = material(0xa9b6bd, { metalness: 0.75, roughness: 0.3 });
  const makeBox = (w, h, d, mat, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    car.add(mesh);
    return mesh;
  };
  makeBox(2.28, 0.46, 4.35, paint, 0, 0.78, 0);
  makeBox(2.38, 0.23, 2.2, paint, 0, 0.54, -0.25);
  makeBox(1.75, 0.58, 1.78, glass, 0, 1.25, -0.34);
  makeBox(1.46, 0.09, 1.22, paint, 0, 1.58, -0.38);
  makeBox(2.25, 0.13, 0.48, trim, 0, 0.61, 2.13);
  makeBox(2.45, 0.13, 0.53, trim, 0, 0.62, -2.12);
  makeBox(2.8, 0.12, 0.56, paint, 0, 1.49, -2.04);
  makeBox(0.1, 0.56, 0.12, trim, -0.94, 1.19, -2.04);
  makeBox(0.1, 0.56, 0.12, trim, 0.94, 1.19, -2.04);
  makeBox(0.07, 0.02, 3.2, white, -0.37, 1.02, 0.07);
  makeBox(0.07, 0.02, 3.2, white, 0.37, 1.02, 0.07);
  const headlight = new THREE.MeshBasicMaterial({ color: 0xf0ffdc });
  const taillight = new THREE.MeshBasicMaterial({ color: 0xff443b });
  for (const x of [-0.79, 0.79]) {
    makeBox(0.51, 0.12, 0.04, headlight, x, 0.89, 2.19);
    makeBox(0.52, 0.13, 0.04, taillight, x, 0.9, -2.19);
  }
  const wheelGeometry = new THREE.CylinderGeometry(0.46, 0.46, 0.36, 12);
  const rimGeometry = new THREE.CylinderGeometry(0.22, 0.22, 0.38, 10);
  for (const x of [-1.22, 1.22]) {
    for (const z of [-1.34, 1.34]) {
      const wheel = new THREE.Mesh(wheelGeometry, tire);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.47, z);
      const rim = new THREE.Mesh(rimGeometry, wheelRim);
      rim.rotation.z = Math.PI / 2;
      rim.position.copy(wheel.position);
      car.add(wheel, rim);
    }
  }
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.4, 20), new THREE.MeshBasicMaterial({ color: 0x070c12, transparent: true, opacity: 0.26, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(0.67, 1.2, 1);
  shadow.position.y = 0.09;
  car.add(shadow);
  if (number) car.userData.number = number;
  return car;
}

/**
 * Heart Animation - 3D Three.js Procedural Model
 */

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.domElement.id = 'three-canvas';
document.body.appendChild(renderer.domElement);

camera.position.z = 1.2;

const controls = new THREE.TrackballControls(camera, renderer.domElement);
controls.noPan = true;
controls.maxDistance = 5;
controls.minDistance = 0.4;

const group = new THREE.Group();
group.position.y = 0.4; // Moved up from 0.1 to avoid overlapping with roses
scene.add(group);

// ──────────────────────────────────────────────────────────────
// Procedural Heart Geometry Builder
// ──────────────────────────────────────────────────────────────
function buildHeart() {
  const positions = [];
  const colors = [];

  function pushVert(p, col) {
    positions.push(p[0], p[1], p[2]);
    colors.push(col[0], col[1], col[2]);
  }
  function tri(a, b, c, col) {
    pushVert(a, col); pushVert(b, col); pushVert(c, col);
  }
  function quad(a, b, c, d, col) {
    tri(a, b, c, col); tri(a, c, d, col);
  }

  const purple = [0.7, 0.53, 1.0]; // Soft purple theme

  const resolution = 60;
  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      const u1 = (i / resolution) * Math.PI * 2;
      const u2 = ((i + 1) / resolution) * Math.PI * 2;
      const v1 = (j / resolution) * Math.PI;
      const v2 = ((j + 1) / resolution) * Math.PI;

      function getPoint(u, v) {
        // Parametric 3D Heart equation
        const x = Math.sin(v) * Math.sin(u);
        const y = Math.sin(v) * Math.cos(u);
        const z = Math.cos(v);

        // Transform sphere into heart
        let resX = Math.sin(v) * Math.cos(u);
        let resY = Math.sin(v) * Math.sin(u);
        let resZ = Math.cos(v) + Math.pow(Math.abs(resX), 0.5) * 0.5; // "Pinch" the top

        // Scale and shape
        const scale = 0.5;
        // The popular heart formula for 2D but as 3D surface
        // x = sin(v) * cos(u)
        // y = sin(v) * sin(u)
        // z = cos(v) + |x|^0.5

        // Let's use a better one:
        // x = 16 * sin^3(t)
        // y = 13*cos(t) - 5*cos(2t) - 2*cos(3t) - cos(4t)
        // Spread it in Z

        const t = u;
        const x2d = 16 * Math.pow(Math.sin(t), 3);
        const y2d = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);

        // Z depth based on v
        const zScale = Math.sin(v);
        const x3d = (x2d / 30) * zScale;
        const y3d = (y2d / 30) * zScale;
        const z3d = Math.cos(v) * 0.3;

        return [x3d, y3d, z3d];
      }

      const p1 = getPoint(u1, v1);
      const p2 = getPoint(u2, v1);
      const p3 = getPoint(u2, v2);
      const p4 = getPoint(u1, v2);

      quad(p1, p2, p3, p4, purple);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

const vertexColorsMode = (THREE.VertexColors !== undefined) ? THREE.VertexColors : true;

let spikePositions = [];
const spikeGeo = new THREE.BufferGeometry();
const spikeMat = new THREE.LineBasicMaterial({ color: 0xb388ff }); // Soft purple sparkles
const lines = new THREE.LineSegments(spikeGeo, spikeMat);
group.add(lines);

const simplex = new SimplexNoise();
const pos = new THREE.Vector3();
const beat = { a: 0 };
gsap.timeline({ repeat: -1, repeatDelay: 0.4 })
  .to(beat, { a: 1.2, duration: 0.55, ease: 'power2.in' })
  .to(beat, { a: 0.0, duration: 0.60, ease: 'power3.out' });

gsap.to(group.rotation, { y: Math.PI * 2, duration: 20, ease: 'none', repeat: -1 });

class Spike {
  constructor() {
    sampler.sample(pos);
    this.pos = pos.clone();
    this.scale = Math.random() * 0.018 + 0.002;
    this.one = null; this.two = null;
  }
  update(a) {
    const noise = simplex.noise4D(this.pos.x * 2.0, this.pos.y * 2.0, this.pos.z * 2.0, a * 0.0005) + 1;
    this.one = this.pos.clone().multiplyScalar(1.01 + noise * 0.16 * beat.a);
    this.two = this.one.clone().add(this.one.clone().setLength(this.scale));
  }
}

function updateCameraPosition() {
  const isMobile = window.innerWidth < 768;
  camera.position.z = isMobile ? 3.5 : 1.8; // Increased distance to make heart smaller
}

updateCameraPosition();
window.addEventListener('resize', updateCameraPosition);

let spikes = [];
let heartMesh = null;
let sampler = null;
let originHeart = null;

function init() {
  for (let i = 0; i < 15000; i++) spikes.push(new Spike());
}

{
  const geo = buildHeart();
  const mat = new THREE.MeshBasicMaterial({
    vertexColors: vertexColorsMode,
    side: THREE.DoubleSide
  });
  heartMesh = new THREE.Mesh(geo, mat);
  group.add(heartMesh);
  originHeart = Array.from(geo.attributes.position.array);
  sampler = new THREE.MeshSurfaceSampler(heartMesh).build();
  init();
  renderer.setAnimationLoop(render);
}

function render(a) {
  spikePositions = [];
  spikes.forEach(g => {
    g.update(a);
    spikePositions.push(g.one.x, g.one.y, g.one.z, g.two.x, g.two.y, g.two.z);
  });
  spikeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(spikePositions), 3));

  const vs = heartMesh.geometry.attributes.position.array;
  for (let i = 0; i < vs.length; i += 3) {
    const ox = originHeart[i], oy = originHeart[i + 1], oz = originHeart[i + 2];
    const noise = simplex.noise4D(ox * 2.0, oy * 2.0, oz * 2.0, a * 0.0005) + 1;
    const scale = 1 + noise * 0.10 * beat.a;
    vs[i] = ox * scale; vs[i + 1] = oy * scale; vs[i + 2] = oz * scale;
  }
  heartMesh.geometry.attributes.position.needsUpdate = true;
  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}, false);
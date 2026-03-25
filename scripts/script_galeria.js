import * as THREE from 'three';
 
/* ══════════════════════════════════════════════════════
   ▸ EDITA AQUÍ: pon los nombres exactos de tus imágenes
   La ruta base es img/galeria/ — la misma imagen se usa
   para la textura del cubo y para abrir en el lightbox.
   Son 30 imágenes para llenar la cuadrícula 6 × 5.
══════════════════════════════════════════════════════ */
const IMAGES = [
  'img/index/img1.webp',
  'img/index/img2.webp',
  'img/index/img3.webp',
  'img/index/img4.webp',
  'img/index/img5.webp',
  'img/index/img6.webp',
  'img/galeria/foto07.jpg',
  'img/galeria/foto08.jpg',
  'img/galeria/foto09.jpg',
  'img/galeria/foto10.jpg',
  'img/galeria/foto11.jpg',
  'img/galeria/foto12.jpg',
  'img/galeria/foto13.jpg',
  'img/galeria/foto14.jpg',
  'img/galeria/foto15.jpg',
  'img/galeria/foto16.jpg',
  'img/galeria/foto17.jpg',
  'img/galeria/foto18.jpg',
  'img/galeria/foto19.jpg',
  'img/galeria/foto20.jpg',
  'img/galeria/foto21.jpg',
  'img/galeria/foto22.jpg',
  'img/galeria/foto23.jpg',
  'img/galeria/foto24.jpg',
  'img/galeria/foto25.jpg',
  'img/galeria/foto26.jpg',
  'img/galeria/foto27.jpg',
  'img/galeria/foto28.jpg',
  'img/galeria/foto29.jpg',
  'img/galeria/foto30.jpg',
];
 
/* ── Config de la cuadrícula ── */
const COLS = 6, ROWS = 5;
const SZ = 10, GAP = 1.2, STEP = SZ + GAP;
 
/* ══════════════════════════════════════════
   THREE.JS
══════════════════════════════════════════ */
const canvas   = document.getElementById('galeria3d-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
 
const scene  = new THREE.Scene();
scene.background = new THREE.Color(0x060d18);
 
const camera = new THREE.PerspectiveCamera(42, canvas.clientWidth / canvas.clientHeight, 1, 2000);
 
/* Iluminación */
scene.add(new THREE.AmbientLight(0xffffff, 0.85));
const dl1 = new THREE.DirectionalLight(0xfff5e0, 1.9);
dl1.position.set(30, 90, 60);
scene.add(dl1);
const dl2 = new THREE.DirectionalLight(0x8ab4f8, 0.55);
dl2.position.set(-50, 40, -30);
scene.add(dl2);
 
/* Cubos */
const GW     = COLS * STEP - GAP;
const GD     = ROWS * STEP - GAP;
const startX = -GW / 2 + SZ / 2;
const startZ = -GD / 2 + SZ / 2;
 
const geo     = new THREE.BoxGeometry(SZ, SZ, SZ);
const sideMat = new THREE.MeshLambertMaterial({ color: 0x152333 });
const loader  = new THREE.TextureLoader();
const cubes   = [];
 
for (let i = 0; i < COLS; i++) {
  for (let j = 0; j < ROWS; j++) {
    const idx = i * ROWS + j;
    const src = IMAGES[idx] || null;
 
    let topMat;
    if (src) {
      const tex = loader.load(src);
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      topMat = new THREE.MeshLambertMaterial({ map: tex });
    } else {
      topMat = new THREE.MeshLambertMaterial({ color: 0x0d1e2d });
    }
 
    /* [derecha, izq, arriba, abajo, frente, atrás] */
    const mesh = new THREE.Mesh(geo, [
      sideMat, sideMat, topMat, sideMat, sideMat, sideMat
    ]);
 
    mesh.position.set(startX + i * STEP, 0, startZ + j * STEP);
    mesh.userData = { idx, targetY: 0, src };
    scene.add(mesh);
    cubes.push(mesh);
  }
}
 
/* ── Cámara orbital ── */
let isDragging = false, lastX = 0, lastY = 0;
let rotY = 0.3, rotX = 0.4, radius = 132;
 
canvas.addEventListener('mousedown', e => {
  isDragging = true; lastX = e.clientX; lastY = e.clientY;
});
window.addEventListener('mouseup',   () => isDragging = false);
window.addEventListener('mousemove', e => {
  if (!isDragging) return;
  rotY -= (e.clientX - lastX) * 0.008;
  rotX -= (e.clientY - lastY) * 0.006;
  rotX  = Math.max(-0.05, Math.min(1.1, rotX));
  lastX = e.clientX; lastY = e.clientY;
});
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  radius = Math.max(60, Math.min(300, radius + e.deltaY * 0.18));
}, { passive: false });
 
/* Touch */
let tLast = null;
canvas.addEventListener('touchstart', e => {
  if (e.touches.length === 1) { tLast = { x: e.touches[0].clientX, y: e.touches[0].clientY }; isDragging = true; }
}, { passive: true });
canvas.addEventListener('touchmove', e => {
  if (!isDragging || !tLast) return;
  rotY -= (e.touches[0].clientX - tLast.x) * 0.008;
  rotX -= (e.touches[0].clientY - tLast.y) * 0.006;
  rotX  = Math.max(-0.05, Math.min(1.1, rotX));
  tLast = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
canvas.addEventListener('touchend', () => isDragging = false);
 
/* ── Raycasting & hover ── */
const raycaster = new THREE.Raycaster();
const mouse2    = new THREE.Vector2(9999, 9999);
let hovered     = null;
 
canvas.addEventListener('mousemove', e => {
  const r  = canvas.getBoundingClientRect();
  mouse2.x =  ((e.clientX - r.left) / r.width)  * 2 - 1;
  mouse2.y = -((e.clientY - r.top)  / r.height) * 2 + 1;
});
 
/* ── Clic → abre lightbox ── */
let mdPos = { x: 0, y: 0 };
canvas.addEventListener('mousedown', e => { mdPos = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('click', e => {
  const dx = e.clientX - mdPos.x, dy = e.clientY - mdPos.y;
  if (Math.sqrt(dx * dx + dy * dy) > 5) return;   // fue arrastre, no clic
  if (!hovered || !hovered.userData.src) return;
  openLightbox(hovered.userData.src);
});
 
/* ── Lightbox ── */
const lb      = document.getElementById('galeria3d-lightbox');
const lbImg   = document.getElementById('galeria3d-lbimg');
const lbClose = document.getElementById('galeria3d-lbclose');
 
function openLightbox(src) {
  lbImg.src = src;
  lb.classList.add('on');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  lb.classList.remove('on');
  lbImg.src = '';
  document.body.style.overflow = '';
}
 
lbClose.addEventListener('click', closeLightbox);
lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });
 
/* ── Loop de animación ── */
function animate() {
  requestAnimationFrame(animate);
 
  camera.position.x = Math.sin(rotY) * radius * Math.cos(rotX);
  camera.position.y = Math.sin(rotX) * radius;
  camera.position.z = Math.cos(rotY) * radius * Math.cos(rotX);
  camera.lookAt(0, 0, 0);
 
  raycaster.setFromCamera(mouse2, camera);
  const hits = raycaster.intersectObjects(cubes);
  hovered = hits.length > 0 ? hits[0].object : null;
  canvas.style.cursor = hovered ? 'pointer' : 'default';
 
  cubes.forEach(c => {
    c.userData.targetY = c === hovered ? 7 : 0;
    c.position.y += (c.userData.targetY - c.position.y) * 0.14;
  });
 
  renderer.render(scene, camera);
}
animate();
 
/* ── Resize ── */
window.addEventListener('resize', () => {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
});
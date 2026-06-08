// 3D Naprendszer Szimulációs Motor (Three.js WebGL)

// Three.js globális változók
let scene, camera, renderer, controls;
let planetMeshes = {};
let orbitLines = [];
let starParticles;

// Szimulációs állapotok
let isPaused = false;
let timeSpeed = 1.0;
let showOrbits = true;
let showLabels = false;
let selectedPlanet = null;
let currentViewMode = "2d"; // "2d" vagy "3d" (a 2D az alapértelmezett)
let isStartupAnimating = true;

// Cinematic Mód állapotváltozók
let isCinematicMode = false;
let cinematicPlanetIndex = 0;
let cinematicTimer = 0;
const cinematicSequence = ["sun", "mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
let originalViewModeBeforeCinematic = "2d";
let originalSelectedPlanetBeforeCinematic = null;
let originalShowOrbits = true;
let originalShowLabels = false;
let cinematicAngle = 0;

// Csillagászati adatok kiegészítése (tengelyferdeség, tengelyforgás, pálya dőlésszöge fokban)
const astroParams = {
  sun: { tilt: 7.25, spinSpeed: 0.05, inclination: 0 },
  mercury: { tilt: 0.034, spinSpeed: 0.017, inclination: 7.0 },
  venus: { tilt: 177.3, spinSpeed: -0.004, inclination: 3.39 }, // retrográd
  earth: { tilt: 23.44, spinSpeed: 1.0, inclination: 0 },
  mars: { tilt: 25.19, spinSpeed: 0.97, inclination: 1.85 },
  jupiter: { tilt: 3.13, spinSpeed: 2.4, inclination: 1.3 },
  saturn: { tilt: 26.73, spinSpeed: 2.2, inclination: 2.49 },
  uranus: { tilt: 97.77, spinSpeed: -1.39, inclination: 0.77 }, // retrográd
  neptune: { tilt: 28.32, spinSpeed: 1.49, inclination: 1.77 },
  pluto: { tilt: 122.53, spinSpeed: -0.15, inclination: 17.2 } // retrográd
};

// Textúra útvonalak (helyi fájlok)
const texturePaths = {
  sun: "textures/sunmap.jpg",
  mercury: "textures/mercurymap.jpg",
  venus: "textures/venusmap.jpg",
  earth: "textures/earthmap1k.jpg",
  mars: "textures/marsmap1k.jpg",
  jupiter: "textures/jupitermap.jpg",
  saturn: "textures/saturnmap.jpg",
  uranus: "textures/uranusmap.jpg",
  neptune: "textures/neptunemap.jpg",
  pluto: "textures/plutomap1k.jpg"
};

// Inicializálás
function initSimulation() {
  const canvas = document.getElementById("simulationCanvas");
  
  // 1. Szcéna létrehozása
  scene = new THREE.Scene();
  
  // 2. Kamera beállítása (kezdetben nagyon közel a Naphoz felülnézetben)
  camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 5000);
  camera.position.set(0, 60, 0.01);
  
  // 3. Renderelő beállítása (WebGL)
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: window.devicePixelRatio < 2, // Csak alacsony DPI-jű képernyőn élsimítás (GPU offloading)
    alpha: true,
    powerPreference: "high-performance",
    precision: "mediump" // Mobil GPU terhelés csökkentése
  });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = false; // Kikapcsolva az felesleges árnyékgenerálás elkerülésére (hatalmas teljesítménylökés!)
  
  // 4. OrbitControls (Kameravezérlés: forgatás, zoom, vonszolás)
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxDistance = 1500;
  controls.minDistance = 20;
  
  // Alapértelmezett 2D kamera-lezárások bekapcsolása indításkor
  lock2DControls();
  
  // 5. Fényforrások
  const sunLight = new THREE.PointLight(0xffffff, 2.2, 3000);
  scene.add(sunLight);
  
  const ambientLight = new THREE.AmbientLight(0x222233);
  scene.add(ambientLight);
  
  // 6. 3D Csillagos háttér generálása
  generate3DStarfield();
  
  // 7. Égitestek 3D-s objektumainak felépítése
  buildCelestialBodies();
  
  // WebGL Shader-ek előzetes lefordítása a GPU-n a tranzíciók alatti akadozások kiküszöbölésére
  renderer.compile(scene, camera);
  
  // Eseménykezelők
  window.addEventListener("resize", onWindowResize);
  setup3DInputHandlers();
  
  // 1.5 másodperces zoom-out animáció indítása a Napból
  runStartupAnimation();
  
  // Szimulációs render hurok indítása
  lastTime = 0;
  requestAnimationFrame(loop3D);
}

// Ablak átméretezése
function onWindowResize() {
  const canvas = document.getElementById("simulationCanvas");
  const width = canvas.parentElement.clientWidth;
  const height = canvas.parentElement.clientHeight;
  
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  
  renderer.setSize(width, height);
}

// 3D Csillagmező particle rendszer
function generate3DStarfield() {
  const starCount = 3000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  
  for (let i = 0; i < starCount * 3; i += 3) {
    // Véletlenszerű elhelyezés egy hatalmas gömbben a Naprendszer körül
    const radius = 800 + Math.random() * 1200;
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    
    positions[i] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i + 2] = radius * Math.cos(phi);
    
    // Enyhe színárnyalatok a csillagoknak (fehér, sárgás, kékes)
    colors[i] = 0.8 + Math.random() * 0.2;     // R
    colors[i + 1] = 0.8 + Math.random() * 0.2; // G
    colors[i + 2] = 0.9 + Math.random() * 0.1; // B
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  
  const material = new THREE.PointsMaterial({
    size: 1.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true
  });
  
  starParticles = new THREE.Points(geometry, material);
  scene.add(starParticles);
}

// Szöveges név-címke (sprite) készítése a bolygókhoz
function createTextSprite(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 96;
  const context = canvas.getContext('2d');
  
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  // Kapszula alakú háttér rajzolása
  context.fillStyle = 'rgba(5, 5, 12, 0.82)';
  context.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  context.lineWidth = 2;
  
  const w = 225;
  const h = 45;
  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2;
  const r = 22.5;
  
  context.beginPath();
  context.arc(x + r, y + r, r, Math.PI / 2, (3 * Math.PI) / 2);
  context.lineTo(x + w - r, y);
  context.arc(x + w - r, y + r, r, (3 * Math.PI) / 2, Math.PI / 2);
  context.lineTo(x + r, y + h);
  context.closePath();
  context.fill();
  context.stroke();
  
  // Szöveg stílusa (félkövér, növelt méret)
  context.font = 'bold 22px "Outfit", sans-serif';
  context.fillStyle = '#f8fafc';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  
  // Finom ragyogás a bolygó saját színével
  context.shadowColor = color;
  context.shadowBlur = 6;
  context.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter; // WebGL optimalizáció: ne generáljon drága mipmapeket
  texture.generateMipmaps = false;       // WebGL optimalizáció
  const material = new THREE.SpriteMaterial({ 
    map: texture,
    transparent: true,
    depthTest: true, // Bolygó mögé kerülés engedélyezése mindkét nézetben
    depthWrite: false
  });
  
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(36, 9, 1); // 1.5-szeres méretezés a 3D szcénában (korábban 24, 6)
  return sprite;
}

// Égitestek 3D-s hálóinak (meshes) létrehozása
function buildCelestialBodies() {
  const textureLoader = new THREE.TextureLoader();
  
  planetsData.forEach((planet) => {
    // 1. Textúra betöltése
    const texture = textureLoader.load(
      texturePaths[planet.id],
      undefined,
      undefined,
      (err) => console.warn(`Nem sikerült betölteni a textúrát: ${planet.id}`, err)
    );
    
    // Szűrés finomítása a szép leképezéshez távolról is
    texture.miniFilter = THREE.LinearMipmapLinearFilter;
    
    // 2. Anyagok (csak egyetlen MeshStandardMaterial-t használunk, aminek az emissive értékét úsztatjuk)
    let material;
    if (planet.id === "sun") {
      material = new THREE.MeshBasicMaterial({ map: texture });
    } else {
      material = new THREE.MeshStandardMaterial({
        map: texture,
        emissiveMap: texture,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: currentViewMode === "2d" ? 1.0 : 0.0, // 2D-ben teljesen bevilágított (1.0), 3D-ben árnyékolt (0.0)
        roughness: 1.0,
        metalness: 0.0
      });
    }
    
    // 3. Geometria (gömb)
    const r = getRenderRadius3D(planet);
    const geometry = new THREE.SphereGeometry(r, 32, 32);
    
    // 4. Mesh létrehozása (a kezdeti nézetmódnak megfelelő anyaggal)
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = planet.id !== "sun";
    mesh.receiveShadow = planet.id !== "sun";
    
    // 5. Tengelyferdeség (Axial Tilt) beállítása
    const pivot = new THREE.Group();
    pivot.add(mesh);
    
    const params = astroParams[planet.id];
    pivot.rotation.z = (params.tilt * Math.PI) / 180;
    
    // Fordítási csoport (Translation Group) - hogy a címke ne örökölje a tengelyferdeséget (tilt-et),
    // de a bolygóval együtt mozogjon a pályáján
    const translationGroup = new THREE.Group();
    translationGroup.add(pivot);
    
    // Szöveges név-címke (Sprite) létrehozása és hozzáadása a translationGroup-hoz (nem a pivot-hoz)
    const labelSprite = createTextSprite(planet.name, planet.glowColor || planet.color);
    labelSprite.position.set(0, 0, r + 11); // Kezdeti felülnézeti (2D) pozíció
    translationGroup.add(labelSprite);
    
    // Pályacsoport (Orbital group) - Keringési dőlésszög (Inclination) beállításához
    const orbitGroup = new THREE.Group();
    orbitGroup.add(translationGroup);
    orbitGroup.rotation.x = (params.inclination * Math.PI) / 180;
    
    scene.add(orbitGroup);
    
    // Tároljuk az objektum referenciákat a frissítéshez és klikkdetektáláshoz
    planetMeshes[planet.id] = {
      mesh: mesh,
      pivot: pivot,
      translationGroup: translationGroup,
      orbitGroup: orbitGroup,
      data: planet,
      standardMaterial: material, // megmarad a névleges kompatibilitás
      basicMaterial: material,
      labelSprite: labelSprite // Tároljuk a referenciát
    };
    
    // 6. Szaturnusz és Uránusz gyűrűi
    if (planet.hasRings) {
      if (planet.id === "saturn") {
        buildSaturnRings3D(pivot, r);
      } else if (planet.id === "uranus") {
        buildUranusRings3D(pivot, r);
      }
    }
    
    // 7. Pályavonal kirajzolása a 3D térben
    drawOrbitLine3D(planet);
  });
}

// Szaturnusz gyűrű 3D modell
function buildSaturnRings3D(parentPivot, planetRadius) {
  const innerR = planetRadius * 1.3;
  const outerR = planetRadius * 2.3;
  
  // RingGeometry használata (sok szegmenssel a szép kör ívért)
  const ringGeo = new THREE.RingGeometry(innerR, outerR, 64);
  
  // UV koordináták igazítása, hogy a textúra sugarasan (radial) feszüljön rá
  const pos = ringGeo.attributes.position;
  const v3 = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v3.fromBufferAttribute(pos, i);
    ringGeo.attributes.uv.setXY(i, v3.length() < (innerR + outerR) / 2 ? 0 : 1, 1);
  }
  
  // Fél-transzparens gyűrű anyag
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xead2ac,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
    roughness: 0.6
  });
  
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  
  // A gyűrű síkja merőleges a bolygó tengelyére, így a Y tengelyre fektetjük (90 fokos forgatás X tengely körül)
  ringMesh.rotation.x = Math.PI / 2;
  
  parentPivot.add(ringMesh);
}

// Uránusz gyűrű 3D modell (nagyon vékony, sötét gyűrűsáv)
function buildUranusRings3D(parentPivot, planetRadius) {
  const innerR = planetRadius * 1.5;
  const outerR = planetRadius * 1.55;
  
  const ringGeo = new THREE.RingGeometry(innerR, outerR, 64);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xaae0ec,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.35,
    roughness: 0.9
  });
  
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = Math.PI / 2;
  
  parentPivot.add(ringMesh);
}

// 3D Pályavonal kirajzolása
function drawOrbitLine3D(planet) {
  if (planet.id === "sun") return;
  
  const segments = 128;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array((segments + 1) * 3);
  
  const dist = getPlanet3DDistance(planet);
  
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    positions[i * 3] = Math.cos(theta) * dist;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = Math.sin(theta) * dist;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: currentViewMode === "2d" ? 0.35 : 0.06
  });
  
  const orbitLine = new THREE.Line(geometry, material);
  
  // A pályavonalat is megdöntjük a bolygópálya dőlésszögével
  const params = astroParams[planet.id];
  const orbitContainer = new THREE.Group();
  orbitContainer.add(orbitLine);
  orbitContainer.rotation.x = (params.inclination * Math.PI) / 180;
  
  scene.add(orbitContainer);
  orbitLines.push(orbitContainer);
}

// Pályák újrarajzolása méretmód váltáskor
function rebuildOrbitLines3D() {
  // Régi pályák eltávolítása
  orbitLines.forEach(line => scene.remove(line));
  orbitLines = [];
  
  // Új pályák felépítése
  planetsData.forEach(planet => {
    drawOrbitLine3D(planet);
  });
}

// Sugárérték lekérése 3D módhoz
function getRenderRadius3D(planet) {
  if (planet.id === "sun") return 22;
  return planet.radius * 0.9;
}

// Távolságérték lekérése 3D módhoz
function getPlanet3DDistance(planet) {
  if (planet.id === "sun") return 0;
  return planet.distance * 1.05;
}

// Kattintás és egér eseménykezelők a 3D-ben (Pointer Events a mobil tap támogatáshoz)
function setup3DInputHandlers() {
  const canvas = document.getElementById("simulationCanvas");
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  
  canvas.addEventListener("pointerdown", (e) => {
    if (isCinematicMode) {
      exitCinematicMode();
      return;
    }
    startX = e.clientX;
    startY = e.clientY;
    startTime = performance.now();
  });
  
  canvas.addEventListener("pointerup", (e) => {
    if (isCinematicMode) return;
    const endX = e.clientX;
    const endY = e.clientY;
    const elapsed = performance.now() - startTime;
    
    // Kiszámítjuk a mozgás távolságát pixelben
    const dist = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    
    // Csak akkor tekintjük kattintásnak/tap-nek, ha a mozgás minimális (< 8px) és viszonylag gyors (< 300ms)
    // Ez kiküszöböli a mobilos OrbitControls preventDefault() click-blokkolását és a vonszolásokat is
    if (dist < 8 && elapsed < 300) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      
      raycaster.setFromCamera(mouse, camera);
      
      // Csak a bolygó hálók (meshes) kattintását vizsgáljuk
      const targets = Object.values(planetMeshes).map(pm => pm.mesh);
      const intersects = raycaster.intersectObjects(targets);
      
      if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        
        // Megkeressük, melyik bolygóhoz tartozik a mesh
        const hitEntry = Object.entries(planetMeshes).find(([id, pm]) => pm.mesh === hitMesh);
        if (hitEntry) {
          selectPlanet(hitEntry[0]);
        }
      }
    }
  });
}

// Fókuszált bolygó kiválasztása
function selectPlanet(planetId) {
  const planet = planetsData.find(p => p.id === planetId);
  if (!planet) return;
  
  selectedPlanet = planet;
  
  // UI panelek frissítése a fő oldalon
  updateSidebarInfo(planet);
  
  // Kijelölés vizualizálása a bal oldali listában
  document.querySelectorAll(".planet-item").forEach(item => {
    item.classList.remove("active");
    if (item.dataset.id === planetId) {
      item.classList.add("active");
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
  
  // Kamera fókuszálás és OrbitControls célpont igazítása
  focusCameraOnSelected();
  
  // Mobil nézetben ha kiválasztunk egy bolygót, bezárjuk a nyitott paneleket, hogy látszódjon a kamera transition
  if (window.innerWidth <= 1024) {
    document.getElementById("list-sidebar").classList.remove("mobile-open");
    document.getElementById("info-sidebar").classList.remove("mobile-open");
    const backdrop = document.getElementById("sidebar-backdrop");
    if (backdrop) backdrop.classList.remove("active");
  }
}

// Kameraváltások állapotváltozói (időalapú buttery smooth átmenet)
let isTransitioning = false;
let transitionStartTime = 0;
const transitionDuration = 2800; // 2.8 másodperces nagyon lassú, elegáns, moziszerű átmenet

const startTarget = new THREE.Vector3();
const endTarget = new THREE.Vector3();
const startCameraPos = new THREE.Vector3();
const endCameraPos = new THREE.Vector3();
const cameraOffset = new THREE.Vector3(); // Relatív eltolás a mozgó bolygóhoz képest
const startSpherical = new THREE.Spherical(); // Kezdőpont gömbi koordinátákban
const endSpherical = new THREE.Spherical();   // Végpont gömbi koordinátákban
let diffTheta = 0;                            // Legrövidebb forgási szög különbség
let startEmissive = 0;
let endEmissive = 0;
let startOrbitOpacity = 0;
let endOrbitOpacity = 0;

// Kamera igazítása a kiválasztott égitesthez
function focusCameraOnSelected() {
  if (isStartupAnimating) {
    // Ha még fut a bevezető animáció (intro), megszakítjuk azt,
    // és zökkenőmentes átmenettel fókuszálunk a kiválasztott bolygóra.
    isStartupAnimating = false;
    controls.enabled = true;
  }
  if (!selectedPlanet) return;
  
  const pm = planetMeshes[selectedPlanet.id];
  const targetWorldPos = new THREE.Vector3();
  pm.mesh.getWorldPosition(targetWorldPos);
  
  // Kezdőállapotok elmentése
  startTarget.copy(controls.target);
  endTarget.copy(targetWorldPos);
  startCameraPos.copy(camera.position);
  
  // Kiszámítjuk a kezdő offset gömbi koordinátáit, hogy megkapjuk a jelenlegi szögeket
  const startOffset = camera.position.clone().sub(startTarget);
  startSpherical.setFromVector3(startOffset);
  
  const radius = getRenderRadius3D(selectedPlanet);
  const focusDistance = selectedPlanet.id === "sun" ? 180 : radius * 4.5 + 30;
  
  // Célpozíció relatív eltolásának kiszámítása nézetmód alapján
  if (currentViewMode === "2d") {
    // Kiszámítjuk a magasságot a bolygó mérete alapján
    const height = selectedPlanet.id === "sun" ? 480 : radius * 12 + 80;
    
    // Lassú és folyamatos beforgatás a standard vízszintes síkirányba (theta = 0)
    const targetTheta = 0;
    const stablePhi = 0.05; // 2.8 fokos enyhe dőlés a gimbal-lock és ugrás elkerülésére
    
    endSpherical.set(height, stablePhi, targetTheta);
    cameraOffset.setFromSpherical(endSpherical);
    
    endEmissive = 1.0; // 2D-ben teljesen bevilágított textúrák
    endOrbitOpacity = 0.35; // 2D-ben erős pályák
  } else {
    const dir = camera.position.clone().sub(startTarget).normalize();
    // Ha a dőlés túl merőleges, adunk neki egy alap ferde dőlést
    if (Math.abs(dir.y) > 0.95) {
      dir.set(0, 0.5, 0.86).normalize();
    }
    cameraOffset.copy(dir).multiplyScalar(focusDistance);
    
    endSpherical.setFromVector3(cameraOffset);
    
    endEmissive = 0.0; // 3D-ben árnyékolt bolygók
    endOrbitOpacity = 0.06; // 3D-ben halvány pályák
  }
  
  // Kiszámítjuk a legrövidebb utat a két szög között (szög-wrapping / shortest path)
  diffTheta = endSpherical.theta - startSpherical.theta;
  diffTheta = Math.atan2(Math.sin(diffTheta), Math.cos(diffTheta));
  
  // Kezdő emissive és pálya átlátszóság értékek lekérése
  // (mivel minden bolygó egyszerre változik, egy mintát veszünk)
  const samplePlanet = Object.values(planetMeshes).find(p => p.data.id !== "sun");
  startEmissive = samplePlanet ? samplePlanet.mesh.material.emissiveIntensity : 0.0;
  
  const sampleOrbit = orbitLines[0]?.children[0];
  startOrbitOpacity = sampleOrbit ? sampleOrbit.material.opacity : 0.06;
  
  transitionStartTime = performance.now();
  
  // Átmenet alatt ideiglenesen kikapcsoljuk az OrbitControls-t,
  // hogy a damping (súrlódás) és az angle-lock ne kavarjon be a mozgásba.
  controls.enabled = false;
  isTransitioning = true;
}

// Időalapú Buttery Smooth átmenet frissítése a fő loopon belül (GÖMBI INTERPOLÁCIÓ)
function updateTransition() {
  if (!isTransitioning) return;
  
  const elapsed = performance.now() - transitionStartTime;
  const currentDuration = isCinematicMode ? 1800 : transitionDuration;
  const progress = Math.min(elapsed / currentDuration, 1.0);
  
  // Ease-in-out-quadratic lefutás a lágy indulásért és megállásért
  const easeProgress = progress < 0.5 
    ? 2 * progress * progress 
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
  
  const pm = planetMeshes[selectedPlanet.id];
  const liveTargetPos = new THREE.Vector3();
  if (pm) {
    pm.mesh.getWorldPosition(liveTargetPos);
  } else {
    liveTargetPos.copy(endTarget);
  }
  
  // Gömbi koordináták lineáris interpolációja a rángásmentes fordulásért
  const currentRadius = startSpherical.radius + (endSpherical.radius - startSpherical.radius) * easeProgress;
  const currentPhi = startSpherical.phi + (endSpherical.phi - startSpherical.phi) * easeProgress;
  const currentTheta = startSpherical.theta + diffTheta * easeProgress;
  
  const currentSpherical = new THREE.Spherical(currentRadius, currentPhi, currentTheta);
  currentSpherical.makeSafe(); // Biztonsági pólus-kifutás clamping a gimbal-lock ellen
  
  const currentOffset = new THREE.Vector3().setFromSpherical(currentSpherical);
  
  // 1. Kamera és célpont pozícionálása az interpolált célpont alapján (megszünteti a bolygóváltáskori ugrálást)
  controls.target.lerpVectors(startTarget, liveTargetPos, easeProgress);
  camera.position.copy(controls.target).add(currentOffset);
  camera.lookAt(controls.target);
  
  // 2. Fényerő (Emissive Intensity) elúsztatása
  const currentEmissive = startEmissive + (endEmissive - startEmissive) * easeProgress;
  Object.values(planetMeshes).forEach(pmItem => {
    if (pmItem.data.id !== "sun") {
      pmItem.mesh.material.emissiveIntensity = currentEmissive;
    }
  });
  
  // 3. Pályavonalak átlátszóságának elúsztatása
  const currentOrbitOpacity = startOrbitOpacity + (endOrbitOpacity - startOrbitOpacity) * easeProgress;
  orbitLines.forEach(container => {
    const line = container.children[0];
    if (line) {
      line.material.opacity = currentOrbitOpacity;
      line.material.needsUpdate = true;
    }
  });
  
  if (progress >= 1.0) {
    // Animáció befejezése, végső értékek rögzítése a legfrissebb pozíció alapján
    const finalOffset = new THREE.Vector3().setFromSpherical(endSpherical);
    controls.target.copy(liveTargetPos);
    camera.position.copy(liveTargetPos).add(finalOffset);
    
    Object.values(planetMeshes).forEach(pmItem => {
      if (pmItem.data.id !== "sun") {
        pmItem.mesh.material.emissiveIntensity = endEmissive;
      }
    });
    
    orbitLines.forEach(container => {
      const line = container.children[0];
      if (line) {
        line.material.opacity = endOrbitOpacity;
        line.material.needsUpdate = true;
      }
    });
    
    // Ha 2D-be váltottunk, lezárjuk a vezérlőket a végén
    if (currentViewMode === "2d") {
      lock2DControls();
    }
    
    // Visszakapcsoljuk az OrbitControls-t és szinkronizáljuk a belső szögeit
    if (!isCinematicMode) {
      controls.enabled = true;
      controls.update();
    } else {
      controls.enabled = false;
    }
    
    isTransitioning = false;
  }
}

// A renderelés szükségességét figyelő állapotok az intelligens offloadinghoz
let lastCameraPosition = new THREE.Vector3();
let lastCameraTarget = new THREE.Vector3();
let forceRenderFrame = false;

// 3D Szimuláció render loopja
let lastTime = 0;
function loop3D(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  
  let needsRender = false;
  
  // Cinematic Mód frissítése képkockánként
  if (isCinematicMode) {
    updateCinematicMode(dt);
    needsRender = true;
  }
  
  // 1. Elsőként frissítjük a kamera pozícióját az átmenetből (ha fut)
  if (isTransitioning) {
    updateTransition();
    needsRender = true;
  }
  
  // 2. Frissítjük a kamerát az OrbitControls alapján (damping, manuális forgatás) - csak ha nem vagyunk mozi módban
  if (!isCinematicMode) {
    controls.update();
  }
  
  // 3. Frissítjük az égitestek fizikai pozícióit/forgásait
  if (!isPaused) {
    update3D(dt);
    needsRender = true;
  }
  
  // 4. Frissítjük a feliratok pozícióját és láthatóságát a legfrissebb kamera- és bolygóállások alapján (nulla lag és ugrásmentes követés)
  updateLabels();
  
  // 5. Intelligens kamera-mozgás figyelés: Csak akkor renderelünk, ha a kamera vagy a célpont elmozdult
  if (camera.position.distanceToSquared(lastCameraPosition) > 0.00001 ||
      controls.target.distanceToSquared(lastCameraTarget) > 0.00001 ||
      isStartupAnimating) {
    needsRender = true;
    lastCameraPosition.copy(camera.position);
    lastCameraTarget.copy(controls.target);
  }
  
  // Szcéna kirajzolása (csak ha valami ténylegesen változott) -> CPU/GPU offloading!
  if (needsRender || forceRenderFrame) {
    renderer.render(scene, camera);
    forceRenderFrame = false;
  }
  
  requestAnimationFrame(loop3D);
}

// Fizikai és mozgási állapotok frissítése
function update3D(dt) {
  planetsData.forEach((planet) => {
    const pm = planetMeshes[planet.id];
    if (!pm) return;
    
    // 1. Saját tengely körüli forgás (Spin)
    const spinSpeed = astroParams[planet.id].spinSpeed * 0.4; // finomított sebesség faktor
    if (!isPaused) {
      // Y tengely körüli helyi forgatás
      pm.mesh.rotation.y += spinSpeed * timeSpeed * dt * 2;
    }
    
    // 2. Nap körüli keringés (Orbit)
    if (planet.id === "sun") return;
    
    if (!isPaused) {
      if (planet.currentAngle === undefined) {
        planet.currentAngle = Math.random() * Math.PI * 2;
      }
      planet.currentAngle += planet.speed * timeSpeed * dt * 25; // 25-ös szorzó a látványosabb mozgásért
    }
    
    // Pályasugár lekérése az aktuális méretmódban
    const dist = getPlanet3DDistance(planet);
    
    // Pozíció kiszámítása az ekliptikai síkban (Three.js koordináta rendszerben: X és Z síkban kering, Y a magasság)
    const x = Math.cos(planet.currentAngle) * dist;
    const z = Math.sin(planet.currentAngle) * dist;
    
    // A fordítási csoportot mozgatjuk (amiben a döntött bolygótest és a címke van)
    pm.translationGroup.position.set(x, 0, z);
  });
  
  // Ha ki van jelölve bolygó (és épp nincs folyamatban kameraváltás), a kamera célpontja és a kamera pozíciója követi őt
  if (selectedPlanet && selectedPlanet.id !== "sun" && !isTransitioning) {
    const pm = planetMeshes[selectedPlanet.id];
    if (pm) {
      const currentWorldPos = new THREE.Vector3();
      pm.mesh.getWorldPosition(currentWorldPos);
      
      // Kiszámítjuk a bolygó elmozdulását az előző képkockához képest
      const deltaTranslation = currentWorldPos.clone().sub(controls.target);
      
      // Elmozdítjuk a kamerát is ugyanezzel a vektorral, így a relatív távolság/szög állandó marad
      camera.position.add(deltaTranslation);
      controls.target.copy(currentWorldPos);
    }
  }
}

// Név-címkék pozíciójának és láthatóságának frissítése (nulla laggal és tökéletes ugrásmentes követéssel)
function updateLabels() {
  planetsData.forEach((planet) => {
    const pm = planetMeshes[planet.id];
    if (!pm || !pm.labelSprite) return;
    
    if (!showLabels) {
      pm.labelSprite.visible = false;
      return;
    }
    
    const r = getRenderRadius3D(planet);
    
    // Intelligens méretezés a kamera távolsága alapján (legyen jól olvasható messziről is)
    const planetWorldPos = new THREE.Vector3();
    pm.mesh.getWorldPosition(planetWorldPos);
    const distToCam = camera.position.distanceTo(planetWorldPos);
    
    // Távolság-kompenzáció törtkitevővel (logaritmikus/szublineáris növekedés a simaságért)
    let scaleFactor = 1.0;
    if (distToCam > 0) {
      scaleFactor = Math.pow(distToCam / 140, 0.55);
      scaleFactor = Math.max(0.4, Math.min(3.0, scaleFactor)); // Értelmes határok közé szorítás
    }
    
    // A felirat méretéhez igazítjuk a bolygótól vett eltolást (offset), elkerülve az átfedést nagy méretnél
    const offsetFactor = Math.max(1.0, scaleFactor * 0.8);
    
    // Kiszámítjuk az eltolás célvektorát a kamera aktuális dőlésszöge (polar angle - phi) alapján.
    // Ezzel elkerüljük az azonnali átugrást, és a felirat pozíciója szinkronban mozog a kamera forgásával!
    let t = 1.0; // 0 = teljes 2D (felülnézet), 1 = teljes 3D (oldalnézet)
    if (controls && controls.target) {
      const cameraOffsetVec = camera.position.clone().sub(controls.target);
      const tempSpherical = new THREE.Spherical().setFromVector3(cameraOffsetVec);
      
      // phi tartomány leképezése: 2D-ben ~0.05, 3D-ben ~1.25 (vagy több)
      const minPhi = 0.05;
      const maxPhi = 1.25; 
      t = (tempSpherical.phi - minPhi) / (maxPhi - minPhi);
      t = Math.max(0.0, Math.min(1.0, t));
    }
    
    const extraOffset = planet.id === "sun" ? 10 : 0;
    const pos2D = new THREE.Vector3(0, 0, r + (11 + extraOffset) * offsetFactor);
    const pos3D = new THREE.Vector3(0, r + (8 + extraOffset) * offsetFactor, 0);
    const targetLocalPos = new THREE.Vector3().lerpVectors(pos2D, pos3D, t);
    
    // Pozíció beállítása közvetlenül másolással a tökéletes ugrásmentes követésért és nulla lagért!
    pm.labelSprite.position.copy(targetLocalPos);
    
    pm.labelSprite.scale.set(36 * scaleFactor, 9 * scaleFactor, 1);
    pm.labelSprite.visible = true;
  });
}

// Globális UI-ból hívott vezérlő függvények
function togglePlay() {
  isPaused = !isPaused;
  const btn = document.getElementById("btn-play");
  if (btn) {
    btn.innerHTML = isPaused 
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Lejátszás` 
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> Szünet`;
  }
}

function updateSpeed(val) {
  timeSpeed = parseFloat(val);
  const text = document.getElementById("speed-multiplier");
  if (text) text.innerText = timeSpeed.toFixed(1) + "x";
}

function toggleOrbits(val) {
  showOrbits = val;
  // Háromdimenziós pályavonalak megjelenítésének ki/bekapcsolása
  orbitLines.forEach(lineGroup => {
    lineGroup.visible = val;
  });
  forceRenderFrame = true;
}

function toggleLabels(val) {
  showLabels = val;
  Object.values(planetMeshes).forEach(pm => {
    if (pm.labelSprite) {
      pm.labelSprite.visible = val;
    }
  });
  forceRenderFrame = true;
}



// Kamera alaphelyzetbe hozatala a 3D-ben (tiszteletben tartva a nézet módot)
function resetCamera() {
  selectedPlanet = planetsData.find(p => p.id === "sun");
  selectPlanet("sun");
  
  controls.target.set(0, 0, 0);
  if (currentViewMode === "2d") {
    camera.position.set(0, 480, 0.01);
  } else {
    camera.position.set(0, 250, 450);
  }
}

// 2D / 3D Nézetváltás funkció
function changeViewMode(mode) {
  currentViewMode = mode;
  
  // UI gombok aktív osztályának kezelése
  const btn2d = document.getElementById("btn-view-2d");
  const btn3d = document.getElementById("btn-view-3d");
  if (btn2d && btn3d) {
    btn2d.classList.remove("active");
    btn3d.classList.remove("active");
    if (mode === "2d") btn2d.classList.add("active");
    else btn3d.classList.add("active");
  }
  
  // 3D módba lépéskor azonnal feloldjuk a kamera forgatási korlátait
  // 2D-be lépéskor csak az átmeneti animáció végén zárjuk le őket, hogy a kamera tudjon felülnézetbe fordulni
  if (mode === "3d") {
    unlock3DControls();
  }
  
  // Kamera és bevilágítás (Emissive) buttery smooth átmenetének indítása
  focusCameraOnSelected();
}

// ==============================================================================
// CINEMATIC MÓD (MOZISZERŰ AUTOMATA UTAZÁS) FÜGGVÉNYEK
// ==============================================================================

function toggleCinematicMode() {
  if (isCinematicMode) {
    exitCinematicMode();
  } else {
    enterCinematicMode();
  }
}

function enterCinematicMode() {
  // Eredeti állapot elmentése a visszaállításhoz
  originalViewModeBeforeCinematic = currentViewMode;
  originalSelectedPlanetBeforeCinematic = selectedPlanet ? selectedPlanet.id : null;
  originalShowOrbits = showOrbits;
  originalShowLabels = showLabels;

  isCinematicMode = true;
  cinematicPlanetIndex = 0;
  cinematicTimer = 0;
  cinematicAngle = 0;

  // Bezárjuk a sidebarokat a tiszta moziélményért
  closeAllSidebars();

  // Elrejtjük a kezelőfelületet CSS-sel
  const appContainer = document.getElementById("app-container");
  if (appContainer) appContainer.classList.add("cinematic-active");

  // Biztosítjuk, hogy a pályavonalak és feliratok láthatóak legyenek a látványosság kedvéért
  toggleOrbits(true);
  const toggleOrbitsCb = document.getElementById("toggle-orbits");
  if (toggleOrbitsCb) {
    toggleOrbitsCb.checked = true;
    toggleOrbitsCb.parentElement.classList.add("active");
  }

  toggleLabels(true);
  const toggleLabelsCb = document.getElementById("toggle-labels");
  if (toggleLabelsCb) {
    toggleLabelsCb.checked = true;
    toggleLabelsCb.parentElement.classList.add("active");
  }

  // 3D nézetbe lépünk
  changeViewMode("3d");

  // Megjelenítjük a cinematic overlayt
  const overlay = document.getElementById("cinematic-overlay");
  if (overlay) overlay.style.display = "flex";

  // Kiválasztjuk az első égitestet
  cinematicSelectCurrent();
}

function exitCinematicMode() {
  if (!isCinematicMode) return;
  isCinematicMode = false;

  // Visszahozzuk a kezelőfelületet
  const appContainer = document.getElementById("app-container");
  if (appContainer) appContainer.classList.remove("cinematic-active");

  // Elrejtjük a cinematic overlayt
  const overlay = document.getElementById("cinematic-overlay");
  if (overlay) overlay.style.display = "none";

  // Visszaállítjuk a beállításokat az eredeti értékekre
  toggleOrbits(originalShowOrbits);
  const toggleOrbitsCb = document.getElementById("toggle-orbits");
  if (toggleOrbitsCb) {
    toggleOrbitsCb.checked = originalShowOrbits;
    toggleOrbitsCb.parentElement.classList.toggle("active", originalShowOrbits);
  }

  toggleLabels(originalShowLabels);
  const toggleLabelsCb = document.getElementById("toggle-labels");
  if (toggleLabelsCb) {
    toggleLabelsCb.checked = originalShowLabels;
    toggleLabelsCb.parentElement.classList.toggle("active", originalShowLabels);
  }

  // Visszaállítjuk a nézetmódot
  changeViewMode(originalViewModeBeforeCinematic);

  // Visszaállítjuk a fókuszált bolygót
  if (originalSelectedPlanetBeforeCinematic) {
    selectPlanet(originalSelectedPlanetBeforeCinematic);
  } else {
    selectedPlanet = null;
  }
}

function cinematicSelectCurrent() {
  if (!isCinematicMode) return;
  
  const planetId = cinematicSequence[cinematicPlanetIndex];
  
  // Bolygó kiválasztása (ez elindítja a 1.8 másodperces kamerarepülést is)
  selectPlanet(planetId);

  // Overlay feliratok frissítése
  const planet = planetsData.find(p => p.id === planetId);
  if (planet) {
    const titleEl = document.getElementById("cinematic-title");
    const factEl = document.getElementById("cinematic-fact");
    
    if (titleEl) titleEl.innerText = planet.name;
    if (factEl) factEl.innerText = planet.details.summary;
  }

  // Időzítők nullázása
  cinematicTimer = 0;
  const progressFill = document.getElementById("cinematic-progress-fill");
  if (progressFill) progressFill.style.width = "0%";
}

function updateCinematicMode(dt) {
  if (!isCinematicMode || !selectedPlanet) return;

  cinematicTimer += dt;
  const currentDuration = 6.0; // 6 másodperc égitestenként (10 * 6s = 60s)
  
  // Progress bar frissítése
  const progressPercent = Math.min((cinematicTimer / currentDuration) * 100, 100);
  const progressFill = document.getElementById("cinematic-progress-fill");
  if (progressFill) progressFill.style.width = progressPercent + "%";

  // Ha letelt az idő, ugrás a következő bolygóra
  if (cinematicTimer >= currentDuration) {
    cinematicPlanetIndex++;
    if (cinematicPlanetIndex >= cinematicSequence.length) {
      // Végigértünk a bemutatón, kilépünk
      exitCinematicMode();
      return;
    }
    cinematicSelectCurrent();
    return;
  }

  // Csak akkor pásztázunk, ha a kamera már odaért a bolygóhoz (a transition lefutott)
  if (!isTransitioning) {
    // Lassú, folyamatos pásztázó és keringő kamera-mozgás
    const speed = 0.12; // szögsebesség rad/sec
    cinematicAngle += dt * speed;

    const pm = planetMeshes[selectedPlanet.id];
    if (pm) {
      const liveTargetPos = new THREE.Vector3();
      pm.mesh.getWorldPosition(liveTargetPos);
      
      const r = getRenderRadius3D(selectedPlanet);
      let focusDistance = selectedPlanet.id === "sun" ? 180 : r * 4.5 + 30;
      
      // Dinamikus látvány: bolygóspecifikus távolságok és lassú bobbing polárszögben (phi)
      let basePhi = 1.15; // enyhén döntött sík
      let phiAmplitude = 0.12; // függőleges kilengés
      
      if (selectedPlanet.id === "saturn" || selectedPlanet.id === "uranus") {
        // Gyűrűs bolygóknál laposabb dőlés, hogy a gyűrűsík szépen kirajzolódjon
        basePhi = 1.25;
        phiAmplitude = 0.08;
      } else if (selectedPlanet.id === "sun") {
        basePhi = 1.05;
        phiAmplitude = 0.15;
      }
      
      // Szinuszos fel-le lebegő mozgás a polárszögben
      const phi = basePhi + Math.sin(cinematicTimer * 0.4) * phiAmplitude;
      const theta = cinematicAngle;

      const currentSpherical = new THREE.Spherical(focusDistance, phi, theta);
      currentSpherical.makeSafe();

      const offset = new THREE.Vector3().setFromSpherical(currentSpherical);
      
      // Kamera pozícionálása
      controls.target.copy(liveTargetPos);
      camera.position.copy(controls.target).add(offset);
      camera.lookAt(controls.target);
      
      forceRenderFrame = true;
    }
  }
}

// 2D kamera-lezárások beállítása
function lock2DControls() {
  controls.enableRotate = false;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;
  controls.minAzimuthAngle = -Infinity;
  controls.maxAzimuthAngle = Infinity;
}

// 3D kamera-szabadság beállítása
function unlock3DControls() {
  controls.enableRotate = true;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;
  controls.minAzimuthAngle = -Infinity;
  controls.maxAzimuthAngle = Infinity;
}

// Induló zoom-out animáció a Napból 3mp (3000ms) alatt
function runStartupAnimation() {
  const startY = 60;
  const endY = 480;
  const durationMs = 3000;
  const startTime = performance.now();
  
  // Kamera vezérlés ideiglenes kikapcsolása az animáció alatt
  controls.enabled = false;
  
  function animate(time) {
    if (!isStartupAnimating) return; // Megszakítás, ha a felhasználó rákattintott egy égitestre a bevezető alatt
    
    const elapsed = time - startTime;
    const progress = Math.min(elapsed / durationMs, 1.0);
    
    // Smooth ease-out-cubic interpoláció
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    
    camera.position.set(0, startY + (endY - startY) * easeProgress, 0.01);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    
    if (progress < 1.0) {
      requestAnimationFrame(animate);
    } else {
      controls.enabled = true; // Kamera vezérlés visszakapcsolása
      isStartupAnimating = false;
      lock2DControls(); // 2D lezárások megerősítése
    }
  }
  
  requestAnimationFrame(animate);
}

// Üresen hagyott API függvények a korábbi index.html hívások kompatibilitásához
function zoomIn() {}
function zoomOut() {}
function toggleFollowMode(val) {}

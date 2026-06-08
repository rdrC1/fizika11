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
let isFollowingPlanet = false; // F16: Követő mód állapotjelzője
let isUserInteracting = false;  // F16: Felhasználói interakció állapotjelzője

// Cinematic Mód állapotváltozók
let isCinematicMode = false;
let cinematicPlanetIndex = 0;
let cinematicTimer = 0;
let cinematicMoveTimer = 0;
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
  const width = canvas.clientWidth || window.innerWidth || 800;
  const height = canvas.clientHeight || window.innerHeight || 600;
  const aspect = width / height;
  camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 5000);
  camera.position.set(0, 60, 0.01);
  
  // 3. Renderelő beállítása (WebGL)
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: window.devicePixelRatio < 2, // Csak alacsony DPI-jű képernyőn élsimítás (GPU offloading)
    alpha: true,
    powerPreference: "high-performance",
    precision: "highp" // F18: Visszaállítva highp-re a z-fighting és starfield villódzások ellen
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = false; // Kikapcsolva az felesleges árnyékgenerálás elkerülésére (hatalmas teljesítménylökés!)
  
  // 4. OrbitControls (Kameravezérlés: forgatás, zoom, vonszolás)
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxDistance = 1500;
  controls.minDistance = 20;
  
  // F16/F13: Felfüggesztjük a követést, ha a felhasználó manuálisan hozzányúl a kamerához
  controls.addEventListener("start", () => {
    if (!isTransitioning && selectedPlanet && selectedPlanet.id !== "sun") {
      isFollowingPlanet = false;
    }
  });
  
  // Alapértelmezett 2D kamera-lezárások bekapcsolása indításkor
  lock2DControls();
  
  // 5. Fényforrások
  const sunLight = new THREE.PointLight(0xffffff, 2.2, 3000);
  sunLight.decay = 1.0; // Lineárisabb lecsengés a külső bolygók sötétségének javítására
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
  
  // Mobil gombok kezdőállapotának beállítása
  syncMobileToggles();
  
  // 1.5 másodperces zoom-out animáció indítása a Napból
  runStartupAnimation();
  
  // Szimulációs render hurok indítása
  lastTime = 0;
  requestAnimationFrame(loop3D);
}

// Ablak átméretezése
function onWindowResize() {
  const canvas = document.getElementById("simulationCanvas");
  if (!canvas || !canvas.parentElement) return;
  const width = canvas.parentElement.clientWidth;
  const height = canvas.parentElement.clientHeight;
  
  if (width > 0 && height > 0) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
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
    sizeAttenuation: false // F23: Kikapcsolva, hogy ne növekedjenek óriásira a csillagok zoomoláskor
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
  texture.minFilter = THREE.LinearMipmapLinearFilter; // F03: mipmappelés downscaling rángás ellen
  texture.generateMipmaps = true;       // F03: mipmapek előállítása
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

// Szaturnusz Cassini-osztásos procedurális gyűrű textúra generálása
function generateSaturnRingsTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  
  for (let x = 0; x < 512; x++) {
    const t = x / 512;
    let r = 234, g = 210, b = 172; // Szép gyűrűs homok/bézs szín
    let alpha = 0.8;
    
    if (t < 0.08) {
      // C gyűrű belső sáv: nagyon halvány szürke/bézs
      alpha = t * 3.0;
    } else if (t >= 0.08 && t < 0.52) {
      // B gyűrű: fényes, sűrűbb gyűrűrész
      alpha = 0.85;
      const stripe = Math.sin(t * 110) * 0.06 + Math.sin(t * 220) * 0.03;
      alpha += stripe;
    } else if (t >= 0.52 && t < 0.60) {
      // Cassini-osztás: széles sötét üres rés
      alpha = 0.04;
    } else if (t >= 0.60 && t < 0.91) {
      // A gyűrű: közepesen fényes külső sáv
      alpha = 0.62;
      const stripe = Math.sin(t * 150) * 0.05;
      alpha += stripe;
    } else if (t >= 0.91 && t < 0.94) {
      // Encke-osztás: vékony sötét csík
      alpha = 0.05;
    } else {
      // F gyűrű: nagyon vékony külső gyűrű
      alpha = 0.45;
    }
    
    alpha = Math.max(0.01, Math.min(0.92, alpha));
    
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.fillRect(x, 0, 1, 16);
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

// Uránusz vékony kékesszürke procedurális gyűrű textúra generálása
function generateUranusRingsTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  
  for (let x = 0; x < 256; x++) {
    const t = x / 256;
    let r = 170, g = 224, b = 236; // Kékesszürke
    let alpha = 0.04;
    
    // Uránusz gyűrűi rendkívül vékonyak és elszórtak (pl. epsilon és társai)
    if ((t > 0.12 && t < 0.16) || (t > 0.45 && t < 0.50) || (t > 0.82 && t < 0.88)) {
      alpha = 0.38;
    }
    
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.fillRect(x, 0, 1, 16);
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

// Napkorona fény sprite generálása a 3D Nap köré
function createSunGlowSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  // Szép, selymes vöröses-narancsos-sárga színátmenet
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255, 235, 170, 1.0)');
  grad.addColorStop(0.15, 'rgba(255, 160, 50, 0.85)');
  grad.addColorStop(0.45, 'rgba(255, 75, 0, 0.28)');
  grad.addColorStop(1.0, 'rgba(255, 30, 0, 0.0)');
  
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    color: 0xffffff,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(92, 92, 1); // Ragyogási zóna átmérője
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
    texture.minFilter = THREE.LinearMipmapLinearFilter; // F02: Javítva a miniFilter typo
    
    // 2. Anyagok (mindkét anyagot elkészítjük a 2D/3D smooth váltáshoz - F07)
    let basicMaterial, standardMaterial;
    if (planet.id === "sun") {
      basicMaterial = new THREE.MeshBasicMaterial({ map: texture });
      standardMaterial = basicMaterial;
    } else {
      basicMaterial = new THREE.MeshBasicMaterial({ map: texture });
      standardMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        emissiveMap: texture,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: currentViewMode === "2d" ? 1.0 : 0.0, // 2D-ben teljesen bevilágított (1.0), 3D-ben árnyékolt (0.0)
        roughness: 1.0,
        metalness: 0.0
      });
    }
    const activeMaterial = currentViewMode === "2d" ? basicMaterial : standardMaterial;
    
    // 3. Geometria (gömb)
    const r = getRenderRadius3D(planet);
    const geometry = new THREE.SphereGeometry(r, 32, 32);
    
    // 4. Mesh létrehozása (a kezdeti nézetmódnak megfelelő anyaggal)
    const mesh = new THREE.Mesh(geometry, activeMaterial);
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
    
    // Napkorona fény hozzáadása
    let glowSprite = null;
    if (planet.id === "sun") {
      glowSprite = createSunGlowSprite();
      glowSprite.material.opacity = currentViewMode === "2d" ? 0.0 : 1.0;
      glowSprite.visible = currentViewMode !== "2d";
      translationGroup.add(glowSprite);
    }
    
    // 6. Szaturnusz és Uránusz gyűrűi
    let ringMesh = null;
    if (planet.hasRings) {
      if (planet.id === "saturn") {
        ringMesh = buildSaturnRings3D(pivot, r);
      } else if (planet.id === "uranus") {
        ringMesh = buildUranusRings3D(pivot, r);
      }
    }

    // Tároljuk az objektum referenciákat a frissítéshez és klikkdetektáláshoz
    planetMeshes[planet.id] = {
      mesh: mesh,
      pivot: pivot,
      translationGroup: translationGroup,
      orbitGroup: orbitGroup,
      data: planet,
      standardMaterial: standardMaterial,
      basicMaterial: basicMaterial,
      labelSprite: labelSprite, // Tároljuk a referenciát
      ringMesh: ringMesh,       // Tároljuk a gyűrű háló referenciát
      glowSprite: glowSprite     // Tároljuk a napkorona ragyogás referenciát
    };
    
    // 7. Pályavonal kirajzolása a 3D térben
    drawOrbitLine3D(planet);
  });
}

// Szaturnusz gyűrű 3D modell
function buildSaturnRings3D(parentPivot, planetRadius) {
  const innerR = planetRadius * 1.3;
  const outerR = planetRadius * 2.3;
  
  const ringGeo = new THREE.RingGeometry(innerR, outerR, 64);
  
  // UV koordináták igazítása, hogy a textúra sugarasan (radial) feszüljön rá
  const pos = ringGeo.attributes.position;
  const v3 = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v3.fromBufferAttribute(pos, i);
    const dist = v3.length();
    const u = (dist - innerR) / (outerR - innerR);
    ringGeo.attributes.uv.setXY(i, u, 0.5);
  }
  
  const ringTexture = generateSaturnRingsTexture();
  
  // F07: Alapanyag és standard anyag a 2D/3D smooth váltáshoz
  const basicMaterial = new THREE.MeshBasicMaterial({
    map: ringTexture,
    side: THREE.DoubleSide,
    transparent: true
  });
  
  const standardMaterial = new THREE.MeshStandardMaterial({
    map: ringTexture,
    side: THREE.DoubleSide,
    transparent: true,
    roughness: 0.6,
    emissiveMap: ringTexture,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: currentViewMode === "2d" ? 1.0 : 0.0
  });
  
  const activeMaterial = currentViewMode === "2d" ? basicMaterial : standardMaterial;
  const ringMesh = new THREE.Mesh(ringGeo, activeMaterial);
  
  // A gyűrű síkja merőleges a bolygó tengelyére, így a Y tengelyre fektetjük (90 fokos forgatás X tengely körül)
  ringMesh.rotation.x = Math.PI / 2;
  
  parentPivot.add(ringMesh);
  ringMesh.userData = { basicMaterial, standardMaterial };
  return ringMesh;
}

// Uránusz gyűrű 3D modell (nagyon vékony, sötét gyűrűsáv)
function buildUranusRings3D(parentPivot, planetRadius) {
  const innerR = planetRadius * 1.5;
  const outerR = planetRadius * 1.55;
  
  const ringGeo = new THREE.RingGeometry(innerR, outerR, 64);
  
  const pos = ringGeo.attributes.position;
  const v3 = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v3.fromBufferAttribute(pos, i);
    const dist = v3.length();
    const u = (dist - innerR) / (outerR - innerR);
    ringGeo.attributes.uv.setXY(i, u, 0.5);
  }
  
  const ringTexture = generateUranusRingsTexture();
  
  // F07: Alapanyag és standard anyag a 2D/3D smooth váltáshoz
  const basicMaterial = new THREE.MeshBasicMaterial({
    map: ringTexture,
    side: THREE.DoubleSide,
    transparent: true
  });
  
  const standardMaterial = new THREE.MeshStandardMaterial({
    map: ringTexture,
    side: THREE.DoubleSide,
    transparent: true,
    roughness: 0.9,
    emissiveMap: ringTexture,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: currentViewMode === "2d" ? 1.0 : 0.0
  });
  
  const activeMaterial = currentViewMode === "2d" ? basicMaterial : standardMaterial;
  const ringMesh = new THREE.Mesh(ringGeo, activeMaterial);
  ringMesh.rotation.x = Math.PI / 2;
  
  parentPivot.add(ringMesh);
  ringMesh.userData = { basicMaterial, standardMaterial };
  return ringMesh;
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
      e.stopPropagation(); // F26: Megakadályozza az esemény továbbterjedését OrbitControls felé
      e.preventDefault();
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
      
      // Csak a bolygó hálók (meshes) és gyűrűk kattintását vizsgáljuk (F17)
      const targets = [];
      Object.values(planetMeshes).forEach(pm => {
        targets.push(pm.mesh);
        if (pm.ringMesh) {
          targets.push(pm.ringMesh);
        }
      });
      const intersects = raycaster.intersectObjects(targets);
      
      if (intersects.length > 0) {
        const hitObj = intersects[0].object;
        
        // Megkeressük, melyik bolygóhoz tartozik a mesh vagy a gyűrű
        const hitEntry = Object.entries(planetMeshes).find(([id, pm]) => pm.mesh === hitObj || pm.ringMesh === hitObj);
        if (hitEntry) {
          selectPlanet(hitEntry[0]);
        }
      }
    }
  });
}

// Fókuszált bolygó kiválasztása
function selectPlanet(planetId) {
  if (isCinematicMode && !window.isAutomaticTourChange) {
    exitCinematicMode(planetId);
    return;
  }
  const planet = planetsData.find(p => p.id === planetId);
  if (!planet) return;
  
  selectedPlanet = planet;
  isFollowingPlanet = (planetId !== "sun"); // F16: Bekapcsoljuk a követő módot kiválasztáskor
  
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
function snapTransitionToEnd() {
  if (!selectedPlanet) return;
  const pm = planetMeshes[selectedPlanet.id];
  const liveTargetPos = new THREE.Vector3();
  if (pm) {
    pm.mesh.getWorldPosition(liveTargetPos);
  } else {
    liveTargetPos.copy(endTarget);
  }
  
  const finalOffset = new THREE.Vector3().setFromSpherical(endSpherical);
  controls.target.copy(liveTargetPos);
  camera.position.copy(liveTargetPos).add(finalOffset);
  
  if (isCinematicMode && camera.aspect < 1) {
    const verticalOffset = new THREE.Vector3(0, -endSpherical.radius * 0.15, 0);
    const lookTarget = controls.target.clone().add(verticalOffset);
    camera.lookAt(lookTarget);
  } else {
    camera.lookAt(controls.target);
  }
  
  Object.values(planetMeshes).forEach(pmItem => {
    if (pmItem.data.id !== "sun") {
      if (pmItem.mesh.material.emissiveIntensity !== undefined) {
        pmItem.mesh.material.emissiveIntensity = endEmissive;
      }
      if (pmItem.ringMesh && pmItem.ringMesh.material.emissiveIntensity !== undefined) {
        pmItem.ringMesh.material.emissiveIntensity = endEmissive;
      }
    }
  });
  
  if (currentViewMode === "2d") {
    Object.values(planetMeshes).forEach(pmItem => {
      pmItem.mesh.material = pmItem.basicMaterial;
      if (pmItem.ringMesh && pmItem.ringMesh.userData.basicMaterial) {
        pmItem.ringMesh.material = pmItem.ringMesh.userData.basicMaterial;
      }
    });
  }
  
  const sunPm = planetMeshes["sun"];
  if (sunPm && sunPm.glowSprite) {
    const finalGlowOpacity = endEmissive === 1.0 ? 0.0 : 1.0;
    sunPm.glowSprite.material.opacity = finalGlowOpacity;
    sunPm.glowSprite.visible = finalGlowOpacity > 0.01;
  }
  
  orbitLines.forEach(container => {
    const line = container.children[0];
    if (line) {
      line.material.opacity = endOrbitOpacity;
      line.material.needsUpdate = true;
    }
  });
  
  if (currentViewMode === "2d") {
    lock2DControls();
  }
  
  if (!isCinematicMode) {
    controls.enabled = true;
    controls.update();
  } else {
    controls.enabled = false;
  }
}

let _isTransitioning = false;
Object.defineProperty(window, 'isTransitioning', {
  get() { return _isTransitioning; },
  set(val) {
    if (_isTransitioning && !val) {
      snapTransitionToEnd();
    }
    _isTransitioning = val;
  },
  configurable: true
});

let transitionStartTime = 0;
const transitionDuration = 1200; // 1.2 másodperces gyorsabb, elegáns átmenet (F22)

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
  pm.mesh.updateMatrixWorld(true);
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
  
  // Korlátozzuk az OrbitControls minimális zoom távolságát, megelőzve a bolygóba való belépést
  const minAllowed = selectedPlanet.id === "sun" ? 45 : radius * 1.5 + 8;
  controls.minDistance = minAllowed;
  
  // Mobilos aspect ratio korrekció a zoomhoz (ha aspect < 1, közelebb visszük a kamerát)
  const aspectFactor = camera.aspect < 1 ? Math.max(0.5, camera.aspect) : 1.0;
  const focusDistance = (selectedPlanet.id === "sun" ? 180 : radius * 4.5 + 30) * aspectFactor;
  
  // Célpozíció relatív eltolásának kiszámítása nézetmód alapján
  if (isCinematicMode) {
    let basePhi = 1.15;
    if (selectedPlanet.id === "saturn" || selectedPlanet.id === "uranus") {
      basePhi = 1.25;
    } else if (selectedPlanet.id === "sun") {
      basePhi = 1.05;
    }
    
    // A cél gömbi koordinátát a cinematic mód induló szögére állítjuk be,
    // így a transition pont ott ér véget, ahonnan a pásztázás indul, ugrás nélkül!
    endSpherical.set(focusDistance, basePhi, cinematicAngle);
    cameraOffset.setFromSpherical(endSpherical);
    
    endEmissive = 0.0;
    endOrbitOpacity = 0.06;
  } else if (currentViewMode === "2d") {
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
  
  // F07: Ha 3D vagy Cinematic módba megyünk, azonnal átváltunk StandardAnyagra a fények érvényesüléséhez
  if (currentViewMode === "3d" || isCinematicMode) {
    Object.values(planetMeshes).forEach(pmItem => {
      pmItem.mesh.material = pmItem.standardMaterial;
      if (pmItem.ringMesh && pmItem.ringMesh.userData.standardMaterial) {
        pmItem.ringMesh.material = pmItem.ringMesh.userData.standardMaterial;
      }
    });
  }
  
  // Kezdő emissive és pálya átlátszóság értékek lekérése
  // (mivel minden bolygó egyszerre változik, egy mintát veszünk)
  const samplePlanet = Object.values(planetMeshes).find(p => p.data.id !== "sun");
  startEmissive = (samplePlanet && samplePlanet.mesh.material.emissiveIntensity !== undefined)
    ? samplePlanet.mesh.material.emissiveIntensity 
    : (currentViewMode === "2d" ? 1.0 : 0.0);
  
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
  
  // F28: Pályára állításkor eltoljuk a célpontot ha a sidebarok nyitva vannak
  let horizontalOffset = 0;
  if (window.innerWidth <= 1024) {
    const leftOpen = document.getElementById("list-sidebar").classList.contains("mobile-open");
    const rightOpen = document.getElementById("info-sidebar").classList.contains("mobile-open");
    if (leftOpen) {
      horizontalOffset = 18;
    } else if (rightOpen) {
      horizontalOffset = -18;
    }
  }
  const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  liveTargetPos.add(rightDir.multiplyScalar(horizontalOffset));
  
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
  
  if (isCinematicMode && camera.aspect < 1) {
    // Mobilon eltoljuk a nézési célpontot lefelé, hogy a bolygó feljebb jelenjen meg
    const verticalOffset = new THREE.Vector3(0, -currentRadius * 0.15, 0);
    const lookTarget = controls.target.clone().add(verticalOffset);
    camera.lookAt(lookTarget);
  } else {
    camera.lookAt(controls.target);
  }
  
  // 2. Fényerő (Emissive Intensity) elúsztatása
  const currentEmissive = startEmissive + (endEmissive - startEmissive) * easeProgress;
  Object.values(planetMeshes).forEach(pmItem => {
    if (pmItem.data.id !== "sun") {
      if (pmItem.mesh.material.emissiveIntensity !== undefined) {
        pmItem.mesh.material.emissiveIntensity = currentEmissive;
      }
      if (pmItem.ringMesh && pmItem.ringMesh.material.emissiveIntensity !== undefined) {
        pmItem.ringMesh.material.emissiveIntensity = currentEmissive;
      }
    }
  });
  
  // 3. Napkorona ragyogás (Solar Corona Sprite) elúsztatása (2D-ben elhalványul, 3D-ben felerősödik)
  const sunPm = planetMeshes["sun"];
  if (sunPm && sunPm.glowSprite) {
    const targetGlowOpacity = endEmissive === 1.0 ? 0.0 : 1.0;
    const startGlowOpacity = startEmissive === 1.0 ? 0.0 : 1.0;
    const currentGlowOpacity = startGlowOpacity + (targetGlowOpacity - startGlowOpacity) * easeProgress;
    sunPm.glowSprite.material.opacity = currentGlowOpacity;
    sunPm.glowSprite.visible = currentGlowOpacity > 0.01;
  }
  
  // 4. Pályavonalak átlátszóságának elúsztatása
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
        if (pmItem.mesh.material.emissiveIntensity !== undefined) {
          pmItem.mesh.material.emissiveIntensity = endEmissive;
        }
        if (pmItem.ringMesh && pmItem.ringMesh.material.emissiveIntensity !== undefined) {
          pmItem.ringMesh.material.emissiveIntensity = endEmissive;
        }
      }
    });
    
    // F07: Ha 2D-be váltottunk, a transition legvégén beállítjuk a MeshBasicMaterial-t
    if (currentViewMode === "2d") {
      Object.values(planetMeshes).forEach(pmItem => {
        pmItem.mesh.material = pmItem.basicMaterial;
        if (pmItem.ringMesh && pmItem.ringMesh.userData.basicMaterial) {
          pmItem.ringMesh.material = pmItem.ringMesh.userData.basicMaterial;
        }
      });
    }
    
    if (sunPm && sunPm.glowSprite) {
      const finalGlowOpacity = endEmissive === 1.0 ? 0.0 : 1.0;
      sunPm.glowSprite.material.opacity = finalGlowOpacity;
      sunPm.glowSprite.visible = finalGlowOpacity > 0.01;
    }
    
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
let lastCanvasWidth = 0;
let lastCanvasHeight = 0;

// Megakadályozzuk a kamera áthaladását/belépését az égitestek belsejébe
function avoidPlanetCollisions() {
  if (!camera || !controls) return;
  const safeBuffer = 12; // biztonsági puffer távolság egységben
  
  Object.values(planetMeshes).forEach(pm => {
    const planetPos = new THREE.Vector3();
    pm.mesh.getWorldPosition(planetPos);
    
    const r = getRenderRadius3D(pm.data);
    const minAllowedDist = r + safeBuffer;
    
    const dist = camera.position.distanceTo(planetPos);
    if (dist < minAllowedDist) {
      // Kitoljuk a kamerát a bolygó felületén kívülre
      const dir = new THREE.Vector3().subVectors(camera.position, planetPos);
      
      // Ha a kamera pontosan a bolygó középpontjában van (dist = 0), megadunk egy alapértelmezett irányt a NaN elkerülésére
      if (dir.lengthSq() === 0) {
        dir.set(0, 1, 0);
      } else {
        dir.normalize();
      }
      
      camera.position.copy(planetPos).add(dir.multiplyScalar(minAllowedDist));
      
      // Újrapozicionálás után visszaállítjuk a kamera lookAt-jét a célpontra
      if (isCinematicMode && camera.aspect < 1) {
        const currentFocusDistance = camera.position.distanceTo(controls.target);
        const verticalOffset = new THREE.Vector3(0, -currentFocusDistance * 0.15, 0);
        const lookTarget = controls.target.clone().add(verticalOffset);
        camera.lookAt(lookTarget);
      } else {
        camera.lookAt(controls.target);
      }
      
      // F13: Frissítjük a controls-t az ütközés utáni új pozícióval a rángatózás elkerülésére
      controls.update();
      forceRenderFrame = true;
    }
  });
}

// 3D Szimuláció render loopja
let lastTime = 0;
function loop3D(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  
  let needsRender = false;
  
  // Intelligens reszponzivitás: ha változott a tároló mérete (pl. mozi mód rács-animáció miatt),
  // átméretezzük a canvas-t a tökéletes buttery-smooth vizualitásért
  const canvas = document.getElementById("simulationCanvas");
  if (canvas) {
    const width = canvas.parentElement.clientWidth;
    const height = canvas.parentElement.clientHeight;
    if (width !== lastCanvasWidth || height !== lastCanvasHeight) {
      onWindowResize();
      lastCanvasWidth = width;
      lastCanvasHeight = height;
      needsRender = true;
    }
  }
  
  // 1. Frissítjük az égitestek fizikai pozícióit/forgásait
  if (!isPaused) {
    update3D(dt);
    needsRender = true;
  }
  
  // 2. Globális világmátrix-frissítés eltávolítva (Three.js automatikusan elvégzi, elkerülve a felesleges CPU overhead-et - F31)
  
  // 3. Fókuszált bolygó követése a kamerával (ha épp nincs folyamatban aktív átmenet és a követés be van kapcsolva - F16/F28)
  if (selectedPlanet && selectedPlanet.id !== "sun" && !isTransitioning && isFollowingPlanet) {
    const pm = planetMeshes[selectedPlanet.id];
    if (pm) {
      const currentWorldPos = new THREE.Vector3();
      pm.mesh.getWorldPosition(currentWorldPos);
      
      // F28: Számoljuk ki a sidebar eltolást a célponton
      let horizontalOffset = 0;
      if (window.innerWidth <= 1024) {
        const leftOpen = document.getElementById("list-sidebar").classList.contains("mobile-open");
        const rightOpen = document.getElementById("info-sidebar").classList.contains("mobile-open");
        if (leftOpen) {
          horizontalOffset = 18;
        } else if (rightOpen) {
          horizontalOffset = -18;
        }
      }
      
      const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      const offsetPos = currentWorldPos.clone().add(rightDir.multiplyScalar(horizontalOffset));
      
      // Kiszámítjuk a bolygó elmozdulását a controls.target-hez képest
      const deltaTranslation = offsetPos.clone().sub(controls.target);
      
      // Elmozdítjuk a kamerát és a célpontot is
      camera.position.add(deltaTranslation);
      controls.target.copy(offsetPos);
      
      // F16: Frissítjük a controls-t képkockánként a zökkenőmentes követésért (nincs jitter)
      controls.update();
    }
  }
  
  // 4. Cinematic Mód frissítése képkockánként
  if (isCinematicMode) {
    updateCinematicMode(dt);
    needsRender = true;
  }
  
  // 5. Frissítjük a kamera pozícióját a sima átmenetből (ha fut)
  if (isTransitioning) {
    updateTransition();
    needsRender = true;
  }
  
  // 6. Frissítjük a kamerát az OrbitControls alapján (damping, manuális forgatás) - csak ha nem vagyunk mozi módban
  if (!isCinematicMode) {
    // Korlátozzuk a kameracél elmozdulását, hogy ne lehessen eltévedni a sötétben
    const maxTargetDist = 600;
    if (controls.target.length() > maxTargetDist) {
      controls.target.setLength(maxTargetDist);
    }
    controls.update();
  }
  
  // 7. Megakadályozzuk a kamera átfedését az égitestekkel (kollízió elkerülés)
  avoidPlanetCollisions();
  
  // 8. Frissítjük a feliratok pozícióját és láthatóságát (nulla lag és ugrásmentes követés)
  updateLabels();
  
  // 9. Intelligens kamera-mozgás figyelés: Csak akkor renderelünk, ha a kamera vagy a célpont elmozdult
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
    
    // Pozíció kiszámítása az ekliptikai síkban
    const x = Math.cos(planet.currentAngle) * dist;
    const z = Math.sin(planet.currentAngle) * dist;
    
    // A fordítási csoportot mozgatjuk
    pm.translationGroup.position.set(x, 0, z);
  });
}

// Név-címkék pozíciójának és láthatóságának frissítése (nulla laggal és tökéletes ugrásmentes követéssel)
function updateLabels() {
  if (!showLabels) {
    Object.values(planetMeshes).forEach(pm => {
      if (pm.labelSprite) pm.labelSprite.visible = false;
    });
    return;
  }
  
  // F14: A szög és dőlésszög arányt (t) csak egyszer számoljuk ki a teljes képkockára a loop-on kívül
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

  planetsData.forEach((planet) => {
    const pm = planetMeshes[planet.id];
    if (!pm || !pm.labelSprite) return;
    
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
    
    let extraOffset = 0;
    if (planet.id === "sun") {
      extraOffset = 10;
    } else if (planet.hasRings) {
      extraOffset = 14; // Gyűrűs bolygóknál magasabb eltolást használunk az ütközések ellen
    }
    
    const pos2D = new THREE.Vector3(0, 0, r + (11 + extraOffset) * offsetFactor);
    const pos3D = new THREE.Vector3(0, r + (8 + extraOffset) * offsetFactor, 0);
    const targetLocalPos = new THREE.Vector3().lerpVectors(pos2D, pos3D, t);
    
    // Pozíció beállítása közvetlenül másolással a tökéletes ugrásmentes követésért és nulla lagért!
    pm.labelSprite.position.copy(targetLocalPos);
    
    pm.labelSprite.scale.set(36 * scaleFactor, 9 * scaleFactor, 1);
    
    // Távolság-alapú áttetszőségi elúsztatás (opacity fade)
    let opacity = 1.0;
    if (distToCam > 600) {
      opacity = 1.0 - (distToCam - 600) / 400;
      opacity = Math.max(0.0, opacity);
    }
    pm.labelSprite.material.opacity = opacity;
    pm.labelSprite.visible = showLabels && opacity > 0.01;
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

  // Mobil gomb szinkronizálása
  const btnMobile = document.getElementById("btn-mobile-play");
  if (btnMobile) {
    btnMobile.innerHTML = isPaused
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
    btnMobile.classList.toggle("active", isPaused);
  }
}

function updateSpeed(val) {
  timeSpeed = parseFloat(val);
  const text = document.getElementById("speed-multiplier");
  if (text) text.innerText = timeSpeed.toFixed(1) + "x";
  
  // Szinkronizáljuk a mobil sebességváltó gomb szövegét is
  const btn = document.getElementById("btn-speed-cycle");
  if (btn) btn.innerText = timeSpeed.toFixed(1) + "x";

  const btnMobile = document.getElementById("btn-mobile-speed");
  if (btnMobile) btnMobile.innerText = timeSpeed.toFixed(1) + "x";
  
  // Keressük meg a legközelebbi indexet a sebességtömbben
  if (typeof speeds !== 'undefined') {
    let minDiff = Infinity;
    let bestIndex = 0;
    for (let i = 0; i < speeds.length; i++) {
      const diff = Math.abs(speeds[i] - timeSpeed);
      if (diff < minDiff) {
        minDiff = diff;
        bestIndex = i;
      }
    }
    currentSpeedIndex = bestIndex;
  }
}

// Mobil sebesség-léptetés körforgása (gombos vezérlés)
const speeds = [1.0, 2.0, 5.0, 10.0, 0.5];
let currentSpeedIndex = 0;
function cycleSpeed() {
  currentSpeedIndex = (currentSpeedIndex + 1) % speeds.length;
  const newSpeed = speeds[currentSpeedIndex];
  updateSpeed(newSpeed);
  
  // Szinkronizáljuk a csúszkát is
  const slider = document.getElementById("speed-slider");
  if (slider) slider.value = newSpeed;
}

function toggleOrbits(val) {
  showOrbits = val;
  // Háromdimenziós pályavonalak megjelenítésének ki/bekapcsolása
  orbitLines.forEach(lineGroup => {
    lineGroup.visible = val;
  });
  forceRenderFrame = true;
  syncMobileToggles();
}

function toggleLabels(val) {
  showLabels = val;
  Object.values(planetMeshes).forEach(pm => {
    if (pm.labelSprite) {
      pm.labelSprite.visible = val;
    }
  });
  forceRenderFrame = true;
  syncMobileToggles();
}

function syncMobileToggles() {
  const btnOrbits = document.getElementById("btn-mobile-orbits");
  if (btnOrbits) {
    btnOrbits.classList.toggle("active", showOrbits);
  }
  const btnLabels = document.getElementById("btn-mobile-labels");
  if (btnLabels) {
    btnLabels.classList.toggle("active", showLabels);
  }
}

function toggleMobileLayersPanel() {
  const panel = document.getElementById("mobile-layers-panel");
  if (panel) {
    panel.classList.toggle("active");
    const btn = document.getElementById("btn-mobile-layers");
    if (btn) {
      btn.classList.toggle("active", panel.classList.contains("active"));
    }
  }
}

function toggleViewMode() {
  const newMode = currentViewMode === "2d" ? "3d" : "2d";
  changeViewMode(newMode);
}

// Kamera alaphelyzetbe hozatala a 3D-ben (tiszteletben tartva a nézet módot)
function resetCamera() {
  selectedPlanet = planetsData.find(p => p.id === "sun");
  selectPlanet("sun");
  
  isTransitioning = false; // Leállítjuk a transitiont, hogy a kézi pozíció ne íródjon felül a loopban
  controls.target.set(0, 0, 0);
  if (currentViewMode === "2d") {
    camera.position.set(0, 480, 0.01);
  } else {
    camera.position.set(0, 250, 450);
  }
  controls.update();
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

  // Mobil gomb szinkronizálása
  const btnMobileView = document.getElementById("btn-mobile-view");
  if (btnMobileView) {
    btnMobileView.innerText = mode.toUpperCase();
    btnMobileView.classList.toggle("active", mode === "3d");
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

  // Cinematic gombok aktív osztályának beállítása
  const btnMobileCinematic = document.getElementById("btn-mobile-cinematic");
  if (btnMobileCinematic) btnMobileCinematic.classList.add("active");

  // Megjelenítjük a cinematic overlayt
  const overlay = document.getElementById("cinematic-overlay");
  if (overlay) overlay.style.display = "flex";

  // Kiválasztjuk az első égitestet
  cinematicSelectCurrent();
}

function exitCinematicMode(newSelectedPlanetId) {
  if (!isCinematicMode) return;
  isCinematicMode = false;

  // Bezárjuk a mobil rétegek panelt ha nyitva volt
  const layersPanel = document.getElementById("mobile-layers-panel");
  if (layersPanel) layersPanel.classList.remove("active");
  const layersBtn = document.getElementById("btn-mobile-layers");
  if (layersBtn) layersBtn.classList.remove("active");

  // Cinematic gombok aktív osztályának eltávolítása
  const btnMobileCinematic = document.getElementById("btn-mobile-cinematic");
  if (btnMobileCinematic) btnMobileCinematic.classList.remove("active");

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

  // Fókusz megőrzése / visszaállítása
  const planetToSelect = newSelectedPlanetId || originalSelectedPlanetBeforeCinematic;
  if (planetToSelect) {
    selectPlanet(planetToSelect);
  } else {
    // Ha nem volt semmi kiválasztva korábban, visszaállítjuk az alaphelyzetet a Nap fókusszal, de a Welcome panel megjelenítésével
    selectedPlanet = null;
    isFollowingPlanet = false;
    
    // Welcome panel megjelenítése
    const welcome = document.getElementById("welcome-panel");
    if (welcome) welcome.style.display = "block";
    const presenter = document.getElementById("planet-presenter");
    if (presenter) presenter.style.display = "none";
    
    // Levesszük az aktív osztályt az összes listaelemről
    document.querySelectorAll(".planet-item").forEach(item => {
      item.classList.remove("active");
    });
    
    // Kamera és controls a Napra fókuszálása, de transition nélkül
    controls.target.set(0, 0, 0);
    if (currentViewMode === "2d") {
      camera.position.set(0, 480, 0.01);
    } else {
      camera.position.set(0, 250, 450);
    }
    controls.update();
  }
}

function cinematicSelectCurrent() {
  if (!isCinematicMode) return;
  
  const planetId = cinematicSequence[cinematicPlanetIndex];
  
  // Bolygó kiválasztása (ez elindítja a 1.8 másodperces kamerarepülést is)
  window.isAutomaticTourChange = true;
  selectPlanet(planetId);
  window.isAutomaticTourChange = false;

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
  cinematicMoveTimer = 0;
  const progressFill = document.getElementById("cinematic-progress-fill");
  if (progressFill) progressFill.style.width = "0%";
}

function updateCinematicMode(dt) {
  if (!isCinematicMode || !selectedPlanet) return;

  cinematicTimer += dt;
  const currentDuration = 24.0; // 24 másodperc égitestenként (10 * 24s = 240s)
  
  // F27: Váltogatjuk a bemutatott tényeket 8 másodpercenként (3 tény per bolygó)
  if (selectedPlanet.details && selectedPlanet.details.facts && selectedPlanet.details.facts.length > 0) {
    const factIndex = Math.floor(cinematicTimer / 8.0) % selectedPlanet.details.facts.length;
    const factEl = document.getElementById("cinematic-fact");
    if (factEl && selectedPlanet.details.facts[factIndex]) {
      const targetFact = selectedPlanet.details.facts[factIndex];
      if (factEl.innerText !== targetFact) {
        factEl.innerText = targetFact;
      }
    }
  }

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
    // Csak a transition lefutása után ketyeg a pásztázási időzítő a zökkenőmentes induláshoz
    cinematicMoveTimer += dt;
    
    // Lassú, folyamatos pásztázó és keringő kamera-mozgás
    const speed = 0.12; // szögsebesség rad/sec
    cinematicAngle += dt * speed;

    const pm = planetMeshes[selectedPlanet.id];
    if (pm) {
      pm.mesh.updateMatrixWorld(true);
      const liveTargetPos = new THREE.Vector3();
      pm.mesh.getWorldPosition(liveTargetPos);
      
      const r = getRenderRadius3D(selectedPlanet);
      // Mobilos aspect ratio korrekció a cinematic zoomhoz is (ha aspect < 1, közelebb visszük a kamerát)
      const aspectFactor = camera.aspect < 1 ? Math.max(0.5, camera.aspect) : 1.0;
      let focusDistance = (selectedPlanet.id === "sun" ? 180 : r * 4.5 + 30) * aspectFactor;
      
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
      
      // Szinuszos fel-le lebegő mozgás a polárszögben a külön mozgási időzítővel (0-ról indul)
      const phi = basePhi + Math.sin(cinematicMoveTimer * 0.4) * phiAmplitude;
      const theta = cinematicAngle;

      const currentSpherical = new THREE.Spherical(focusDistance, phi, theta);
      currentSpherical.makeSafe();

      const offset = new THREE.Vector3().setFromSpherical(currentSpherical);
      
      // Kamera pozícionálása
      controls.target.copy(liveTargetPos);
      camera.position.copy(controls.target).add(offset);
      
      if (camera.aspect < 1) {
        // Mobilon eltoljuk a nézési célpontot lefelé, hogy a bolygó feljebb jelenjen meg (elkerülve a felirat takarását)
        const verticalOffset = new THREE.Vector3(0, -focusDistance * 0.15, 0);
        const lookTarget = liveTargetPos.clone().add(verticalOffset);
        camera.lookAt(lookTarget);
      } else {
        camera.lookAt(controls.target);
      }
      
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
  
  // Touch vezérlés 2D módban: 1 ujj = csúsztatás (Pan), 2 ujj = zoom (Dolly)
  controls.touches = {
    ONE: THREE.TOUCH.PAN,
    TWO: THREE.TOUCH.DOLLY
  };
}

// 3D kamera-szabadság beállítása
function unlock3DControls() {
  controls.enableRotate = true;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;
  controls.minAzimuthAngle = -Infinity;
  controls.maxAzimuthAngle = Infinity;
  
  // Touch vezérlés 3D módban: 1 ujj = forgatás (Rotate), 2 ujj = zoom/csúsztatás (Dolly/Pan)
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN
  };
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

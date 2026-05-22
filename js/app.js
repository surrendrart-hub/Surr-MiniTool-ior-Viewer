/* ============================================================
   Surr IOR Viewer — Logique 3D, interactions, recherche (v2)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    /* ----------------------------------------------------------
       1. Scène, caméra, renderer
    ---------------------------------------------------------- */
    const canvas = document.querySelector('#c');
    const wrapper = document.getElementById('canvas-wrapper');
    const canvasLoader = document.getElementById('canvas-loader');

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.physicallyCorrectLights = true;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 1000);
    camera.position.set(0, 1.2, 6);
    camera.lookAt(0, 0, 0);

    /* ----------------------------------------------------------
       2. Éclairage de secours (avant chargement HDRI)
    ---------------------------------------------------------- */
    const ambient = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(4, 5, 4);
    scene.add(keyLight);

    const pinkRim = new THREE.PointLight(0xff2d91, 0.6, 14);
    pinkRim.position.set(-3, 2, -2);
    scene.add(pinkRim);

    const cyanFill = new THREE.PointLight(0x5ef0ff, 0.35, 14);
    cyanFill.position.set(3, -1, -3);
    scene.add(cyanFill);

    /* ----------------------------------------------------------
       3. Environnement HDRI : on tente des CDN puis on fallback
          sur un environnement procédural (canvas) qui marche TOUJOURS
    ---------------------------------------------------------- */
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    // Ordre de tentative : local d'abord (toutes extensions), puis CDN, puis procédural
    const HDRI_URLS = [
        'images/hdri.png',
        'images/hdri.jpg',
        'images/hdri.jpeg',
        'images/hdri.webp',
        'images/env.jpg',
        'images/environment.jpg',
        'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/equirectangular/2294472375_24a3b8ef46_o.jpg',
        'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/equirectangular/2294472375_24a3b8ef46_o.jpg'
    ];

    function applyEnvTexture(texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.encoding = THREE.sRGBEncoding;

        const envMap = pmremGenerator.fromEquirectangular(texture).texture;

        scene.environment = envMap;
        scene.background = texture;
        material.envMap = envMap;
        material.envMapIntensity = 1.4;
        material.needsUpdate = true;

        // Baisser les lumières d'appoint pour laisser parler le HDRI
        ambient.intensity = 0.12;
        keyLight.intensity = 0.25;
        pinkRim.intensity = 0.35;
        cyanFill.intensity = 0.2;

        if (canvasLoader) canvasLoader.classList.add('hidden');
    }

    /**
     * Génère un environnement équirectangulaire procédural :
     * ciel violet → rose à l'horizon, sol sombre, spots blancs en haut
     * pour produire de jolis reflets + une refraction visible.
     */
    function createProceduralEnv() {
        const cv = document.createElement('canvas');
        cv.width = 2048;
        cv.height = 1024;
        const ctx = cv.getContext('2d');
        const W = cv.width, H = cv.height, MID = H / 2;

        // Ciel (haut) — gradient sombre vers rose horizon
        const sky = ctx.createLinearGradient(0, 0, 0, MID);
        sky.addColorStop(0.00, '#0a0a18');
        sky.addColorStop(0.45, '#2a0e3a');
        sky.addColorStop(0.78, '#7a1f5e');
        sky.addColorStop(1.00, '#ff5fae');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, MID);

        // Sol (bas) — sombre, avec une légère lumière rasante
        const ground = ctx.createLinearGradient(0, MID, 0, H);
        ground.addColorStop(0.00, '#3a0e2a');
        ground.addColorStop(0.30, '#160820');
        ground.addColorStop(1.00, '#05050b');
        ctx.fillStyle = ground;
        ctx.fillRect(0, MID, W, MID);

        // Bande lumineuse à l'horizon (réflexions claires)
        const horizon = ctx.createLinearGradient(0, MID - 30, 0, MID + 30);
        horizon.addColorStop(0.0, 'rgba(255, 220, 235, 0)');
        horizon.addColorStop(0.5, 'rgba(255, 220, 235, 0.55)');
        horizon.addColorStop(1.0, 'rgba(255, 220, 235, 0)');
        ctx.fillStyle = horizon;
        ctx.fillRect(0, MID - 30, W, 60);

        // Spots de studio (cercles lumineux dans le ciel)
        const spots = [
            { x: W * 0.12, y: H * 0.18, r: 110, c: '#ffffff', a: 0.85 },
            { x: W * 0.30, y: H * 0.10, r: 140, c: '#ffe7f0', a: 0.70 },
            { x: W * 0.52, y: H * 0.22, r: 100, c: '#ffffff', a: 0.90 },
            { x: W * 0.70, y: H * 0.12, r: 130, c: '#ffd2e6', a: 0.80 },
            { x: W * 0.88, y: H * 0.20, r: 110, c: '#ffffff', a: 0.85 },
            // Spots colorés pour des reflets vifs sur les métaux
            { x: W * 0.20, y: H * 0.32, r: 70,  c: '#5ef0ff', a: 0.55 },
            { x: W * 0.80, y: H * 0.30, r: 70,  c: '#ff2d91', a: 0.65 }
        ];
        spots.forEach(s => {
            const rgb = hexToRgb(s.c);
            const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
            g.addColorStop(0,   `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${s.a})`);
            g.addColorStop(0.4, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${s.a * 0.3})`);
            g.addColorStop(1,   `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
            ctx.fillStyle = g;
            ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
        });

        // Quelques traînées verticales très douces (style néon studio)
        for (let i = 0; i < 4; i++) {
            const x = (W / 4) * i + W / 8;
            const g = ctx.createLinearGradient(x - 30, 0, x + 30, 0);
            g.addColorStop(0, 'rgba(255, 45, 145, 0)');
            g.addColorStop(0.5, 'rgba(255, 45, 145, 0.08)');
            g.addColorStop(1, 'rgba(255, 45, 145, 0)');
            ctx.fillStyle = g;
            ctx.fillRect(x - 30, 0, 60, MID);
        }

        const tex = new THREE.CanvasTexture(cv);
        return tex;
    }

    function hexToRgb(hex) {
        const h = hex.replace('#', '');
        return {
            r: parseInt(h.substring(0, 2), 16),
            g: parseInt(h.substring(2, 4), 16),
            b: parseInt(h.substring(4, 6), 16)
        };
    }

    function loadEnvironment(urlIndex = 0) {
        if (urlIndex < HDRI_URLS.length) {
            const url = HDRI_URLS[urlIndex];
            const isLocal = !url.startsWith('http');

            const loader = new THREE.TextureLoader();
            // Pas de crossOrigin pour les fichiers locaux (file:// pose souci sinon)
            loader.crossOrigin = isLocal ? '' : 'anonymous';

            loader.load(
                url,
                (texture) => {
                    console.log('[IOR Viewer] HDRI chargée :', url);
                    applyEnvTexture(texture);
                },
                undefined,
                () => {
                    console.warn('[IOR Viewer] HDRI introuvable :', url);
                    loadEnvironment(urlIndex + 1);
                }
            );
            return;
        }
        // On a déjà appliqué la procédurale au démarrage, donc rien à faire ici
        console.log('[IOR Viewer] Aucune HDRI externe — environnement procédural conservé.');
    }

    /* ----------------------------------------------------------
       4. Géométrie + matériau physique
    ---------------------------------------------------------- */
    const geometry = new THREE.TeapotGeometry(1, 22, true, true, true, false, true);

    const material = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.0,
        metalness: 0.0,
        transmission: 1.0,
        ior: 1.5,
        clearcoat: 0.5,
        clearcoatRoughness: 0.08,
        thickness: 2.8,           // épaisseur volumétrique → refraction franche
        envMapIntensity: 1.4,
        side: THREE.FrontSide,
        transparent: false        // transmission gère la transparence physique
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 1. Applique IMMÉDIATEMENT l'env procédural pour que la refraction soit
    //    visible dès le premier render, même avant que la HDRI ne charge.
    applyEnvTexture(createProceduralEnv());

    // 2. Puis tente de charger la HDRI locale / CDN qui remplacera l'env procédural
    loadEnvironment(0);

    /* ----------------------------------------------------------
       5. OrbitControls minimaliste (drag + zoom)
    ---------------------------------------------------------- */
    const orbit = {
        radius: 6,
        theta: 0,
        phi: Math.PI / 2.4,
        target: new THREE.Vector3(0, 0, 0),
        autoRotate: true,
        autoSpeed: 0.0028,
        dragging: false,
        lastX: 0,
        lastY: 0,
        minRadius: 3,
        maxRadius: 14,
        minPhi: 0.35,
        maxPhi: Math.PI - 0.35
    };

    function updateCamera() {
        const x = orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta);
        const y = orbit.radius * Math.cos(orbit.phi);
        const z = orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta);
        camera.position.set(x + orbit.target.x, y + orbit.target.y, z + orbit.target.z);
        camera.lookAt(orbit.target);
    }
    updateCamera();

    canvas.addEventListener('mousedown', (e) => {
        orbit.dragging = true;
        orbit.autoRotate = false;
        orbit.lastX = e.clientX;
        orbit.lastY = e.clientY;
    });
    window.addEventListener('mouseup', () => { orbit.dragging = false; });
    window.addEventListener('mousemove', (e) => {
        if (!orbit.dragging) return;
        const dx = e.clientX - orbit.lastX;
        const dy = e.clientY - orbit.lastY;
        orbit.lastX = e.clientX;
        orbit.lastY = e.clientY;
        orbit.theta -= dx * 0.008;
        orbit.phi -= dy * 0.008;
        orbit.phi = Math.max(orbit.minPhi, Math.min(orbit.maxPhi, orbit.phi));
    });

    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        orbit.dragging = true;
        orbit.autoRotate = false;
        orbit.lastX = e.touches[0].clientX;
        orbit.lastY = e.touches[0].clientY;
    }, { passive: true });
    canvas.addEventListener('touchmove', (e) => {
        if (!orbit.dragging || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - orbit.lastX;
        const dy = e.touches[0].clientY - orbit.lastY;
        orbit.lastX = e.touches[0].clientX;
        orbit.lastY = e.touches[0].clientY;
        orbit.theta -= dx * 0.008;
        orbit.phi -= dy * 0.008;
        orbit.phi = Math.max(orbit.minPhi, Math.min(orbit.maxPhi, orbit.phi));
    }, { passive: true });
    canvas.addEventListener('touchend', () => { orbit.dragging = false; });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        orbit.radius *= (1 + e.deltaY * 0.001);
        orbit.radius = Math.max(orbit.minRadius, Math.min(orbit.maxRadius, orbit.radius));
    }, { passive: false });

    /* ----------------------------------------------------------
       6. Références DOM
    ---------------------------------------------------------- */
    const iorSlider = document.getElementById('iorSlider');
    const iorValueSpan = document.getElementById('iorValue');
    const iorSliderGroup = document.getElementById('ior-slider-group');

    const roughnessSlider = document.getElementById('roughnessSlider');
    const roughnessValueSpan = document.getElementById('roughnessValue');

    const metalnessSlider = document.getElementById('metalnessSlider');
    const metalnessValueSpan = document.getElementById('metalnessValue');

    const transmissionSlider = document.getElementById('transmissionSlider');
    const transmissionValueSpan = document.getElementById('transmissionValue');
    const transmissionSliderGroup = document.getElementById('transmission-slider-group');

    const downloadButton = document.getElementById('downloadButton');

    const matSwatch = document.getElementById('matSwatch');
    const matName = document.getElementById('matName');
    const matType = document.getElementById('matType');
    const statIor = document.getElementById('statIor');
    const statMetal = document.getElementById('statMetal');
    const statTransmission = document.getElementById('statTransmission');
    const statIorBox = document.getElementById('statIorBox');
    const statMetalBox = document.getElementById('statMetalBox');
    const statTransmissionBox = document.getElementById('statTransmissionBox');

    // Recherche
    const searchInput = document.getElementById('iorSearch');
    const searchClear = document.getElementById('iorSearchClear');
    const searchCount = document.getElementById('searchCount');
    const searchBar = document.querySelector('.search-bar');
    const noResults = document.getElementById('noResults');

    /* ----------------------------------------------------------
       7. État transitions (lerp)
    ---------------------------------------------------------- */
    const target = {
        ior: 1.5,
        roughness: 0.0,
        metalness: 0.0,
        transmission: 1.0,
        color: new THREE.Color('#ffffff')
    };

    const current = {
        ior: 1.5,
        roughness: 0.0,
        metalness: 0.0,
        transmission: 1.0,
        color: new THREE.Color('#ffffff')
    };

    function deduceType(props) {
        // 'metal' | 'transparent' | 'opaque'
        if (parseFloat(props.metalness) > 0.5) return 'metal';
        if (parseFloat(props.transmission) > 0.5) return 'transparent';
        return 'opaque';
    }

    function setTargetMaterial(props) {
        target.ior = parseFloat(props.ior);
        target.roughness = parseFloat(props.roughness);
        target.metalness = parseFloat(props.metalness);
        target.transmission = parseFloat(props.transmission);
        target.color.set(props.color || '#ffffff');

        const type = deduceType(props);
        matSwatch.style.backgroundColor = props.color || '#ffffff';
        matName.textContent = props.name || 'Matériau personnalisé';

        // Badge : Métal / Réfractif / Opaque
        matType.classList.remove('metal', 'transparent', 'opaque');
        if (type === 'metal') {
            matType.textContent = 'Métal';
            matType.classList.add('metal');
        } else if (type === 'transparent') {
            matType.textContent = 'Réfractif';
            matType.classList.add('transparent');
        } else {
            matType.textContent = 'Opaque';
            matType.classList.add('opaque');
        }

        iorSlider.value = target.ior;
        iorValueSpan.textContent = target.ior.toFixed(2);
        roughnessSlider.value = target.roughness;
        roughnessValueSpan.textContent = target.roughness.toFixed(2);
        metalnessSlider.value = target.metalness;
        metalnessValueSpan.textContent = target.metalness.toFixed(2);
        transmissionSlider.value = target.transmission;
        transmissionValueSpan.textContent = target.transmission.toFixed(2);

        if (target.metalness >= 0.5) {
            iorSliderGroup.classList.add('hidden');
            transmissionSliderGroup.classList.add('hidden');
        } else {
            transmissionSliderGroup.classList.remove('hidden');
            if (target.transmission > 0.05) {
                iorSliderGroup.classList.remove('hidden');
            } else {
                iorSliderGroup.classList.add('hidden');
            }
        }

        if (type === 'metal') {
            statMetalBox.classList.add('highlight');
            statIorBox.classList.remove('highlight');
            statTransmissionBox.classList.remove('highlight');
        } else if (target.transmission > 0.05) {
            statIorBox.classList.add('highlight');
            statTransmissionBox.classList.add('highlight');
            statMetalBox.classList.remove('highlight');
        } else {
            statIorBox.classList.remove('highlight');
            statTransmissionBox.classList.remove('highlight');
            statMetalBox.classList.remove('highlight');
        }
    }

    function lerp(a, b, t) { return a + (b - a) * t; }

    function applyTransition(dt) {
        const speed = Math.min(1, dt * 8);
        current.ior = lerp(current.ior, target.ior, speed);
        current.roughness = lerp(current.roughness, target.roughness, speed);
        current.metalness = lerp(current.metalness, target.metalness, speed);
        current.transmission = lerp(current.transmission, target.transmission, speed);
        current.color.lerp(target.color, speed);

        material.ior = current.ior;
        material.roughness = current.roughness;
        material.metalness = current.metalness;
        material.transmission = current.transmission;
        material.color.copy(current.color);

        // Thickness : volume virtuel qui pilote la force de la refraction.
        // IOR élevé (ex. diamant 2.4) → plus de déformation ; on amplifie aussi
        // avec un thickness plus gros pour bien voir l'effet sur la théière.
        let targetThickness;
        if (current.transmission < 0.1) {
            targetThickness = 0.0; // opaque : aucune refraction
        } else {
            // 2.5 par défaut, jusqu'à 4.5 pour les forts IOR (diamant etc.)
            const iorBoost = Math.max(0, current.ior - 1.4) * 2.0;
            targetThickness = 2.5 + iorBoost;
        }
        material.thickness = lerp(material.thickness, targetThickness, speed);

        // Clearcoat : actif pour diélectriques opaques (carrosserie, plastique vernis)
        // ou subtil pour les verres très transparents
        let targetClearcoat;
        if (current.metalness > 0.5) {
            targetClearcoat = 0.0;
        } else if (current.transmission > 0.5) {
            targetClearcoat = 0.35;
        } else {
            targetClearcoat = 0.7;
        }
        material.clearcoat = lerp(material.clearcoat, targetClearcoat, speed);
        material.clearcoatRoughness = lerp(material.clearcoatRoughness, current.roughness * 0.5, speed);

        // EnvMapIntensity dynamique pour pousser les reflets
        let targetEnvI;
        if (current.metalness > 0.5) {
            targetEnvI = 1.8;
        } else if (current.transmission > 0.1) {
            targetEnvI = 1.4;
        } else {
            targetEnvI = 1.1;
        }
        material.envMapIntensity = lerp(material.envMapIntensity, targetEnvI, speed);

        statIor.textContent = current.ior.toFixed(3);
        statMetal.textContent = current.metalness.toFixed(2);
        statTransmission.textContent = current.transmission.toFixed(2);

        material.needsUpdate = true;
    }

    /* ----------------------------------------------------------
       8. Écouteurs sliders
    ---------------------------------------------------------- */
    function updateFromSliders() {
        setTargetMaterial({
            ior: iorSlider.value,
            roughness: roughnessSlider.value,
            metalness: metalnessSlider.value,
            transmission: transmissionSlider.value,
            color: `#${target.color.getHexString()}`,
            name: matName.textContent,
            type: parseFloat(metalnessSlider.value) >= 0.5 ? 'metal' : 'dielectric'
        });
    }
    iorSlider.addEventListener('input', updateFromSliders);
    roughnessSlider.addEventListener('input', updateFromSliders);
    metalnessSlider.addEventListener('input', updateFromSliders);
    transmissionSlider.addEventListener('input', updateFromSliders);

    /* ----------------------------------------------------------
       9. Classification des matériaux & auto-config
    ---------------------------------------------------------- */

    // Mots-clés qui indiquent un matériau OPAQUE (pas de refraction)
    const OPAQUE_KEYWORDS = [
        // Matières naturelles
        'wood', 'wax', 'paraffin', 'ivory', 'pearl', 'shell', 'coral',
        'jet', 'ebonite', 'ebony', 'leather', 'bone', 'horn',
        // Pierres / minéraux opaques
        'asphalt', 'gypsum', 'gypsium', 'chalk', 'plaster',
        'malachite', 'lapis', 'turquoise', 'azurite', 'pyrite',
        'hematite', 'cinnabar', 'rock salt', 'meerschaum', 'jade',
        'jasper', 'onyx', 'agate', 'tiger', 'chalcedony',
        // Liquides opaques / pâteux
        'milk', 'cream', 'shampoo', 'shower', 'cleaner',
        // Plastiques / mousses opaques
        'rubber', 'nylon', 'teflon', 'styrofoam', 'mylar',
        // Sels
        'sodium chloride', 'salt'
    ];

    // Mots-clés qui indiquent un MÉTAL (en plus du seuil IOR < 0.95)
    const METAL_KEYWORDS = [
        'silver', 'gold', 'iron', 'steel', 'aluminum', 'aluminium',
        'copper', 'bronze', 'nickel', 'lead', 'tin', 'zinc',
        'chromium', 'chrome (', 'cobalt', 'platinum', 'titanium',
        'mercury (liquid)', 'mercury'
    ];

    /**
     * Classifie un matériau d'après son nom et son IOR.
     * @returns {'metal' | 'opaque' | 'transparent'}
     */
    function classifyMaterial(name, iorValue) {
        const n = (name || '').toLowerCase();

        // 1. Métal par IOR très bas (Or = 0.47, Silver = 0.18)
        if (iorValue < 0.95) return 'metal';

        // 2. Métal par nom
        if (METAL_KEYWORDS.some(k => n.includes(k))) return 'metal';

        // 3. Opaque par mot-clé
        if (OPAQUE_KEYWORDS.some(k => n.includes(k))) return 'opaque';

        // 4. Par défaut : diélectrique transparent (verres, gemmes, liquides, plastiques clairs)
        return 'transparent';
    }

    // Couleurs typiques pour rendu plus crédible des opaques connus
    const OPAQUE_TINTS = [
        { match: 'ivory',       color: '#fffff0' },
        { match: 'pearl',       color: '#fdf6f0' },
        { match: 'wood',        color: '#8b6f4e' },
        { match: 'wax',         color: '#f5e9c8' },
        { match: 'paraffin',    color: '#f5e9c8' },
        { match: 'jet',         color: '#0a0a0a' },
        { match: 'ebonite',     color: '#1a1a1a' },
        { match: 'asphalt',     color: '#1f1f1f' },
        { match: 'rubber',      color: '#222222' },
        { match: 'jade',        color: '#3aa07d' },
        { match: 'turquoise',   color: '#30d5c8' },
        { match: 'lapis',       color: '#1a3a8a' },
        { match: 'azurite',     color: '#1f3a8a' },
        { match: 'malachite',   color: '#1a6b3e' },
        { match: 'pyrite',      color: '#caac5d' },
        { match: 'hematite',    color: '#3d2a2a' },
        { match: 'cinnabar',    color: '#9e2c20' },
        { match: 'coral',       color: '#ff7f6a' },
        { match: 'shell',       color: '#f3e4cf' },
        { match: 'onyx',        color: '#0c0c0c' },
        { match: 'jasper',      color: '#9c4a3a' },
        { match: 'agate',       color: '#c2a37a' },
        { match: 'tiger',       color: '#9a6a25' }
    ];

    const METAL_TINTS = [
        { match: 'gold',       color: '#ffd24a', roughness: 0.18 },
        { match: 'silver',     color: '#dde2e8', roughness: 0.12 },
        { match: 'copper',     color: '#b87333', roughness: 0.22 },
        { match: 'bronze',     color: '#cd7f32', roughness: 0.30 },
        { match: 'iron',       color: '#9aa0a6', roughness: 0.35 },
        { match: 'steel',      color: '#b4b8be', roughness: 0.30 },
        { match: 'aluminum',   color: '#c9ced4', roughness: 0.25 },
        { match: 'aluminium',  color: '#c9ced4', roughness: 0.25 },
        { match: 'nickel',     color: '#c5c6c7', roughness: 0.22 },
        { match: 'lead',       color: '#7a7d83', roughness: 0.40 },
        { match: 'tin',        color: '#bcbec1', roughness: 0.28 },
        { match: 'zinc',       color: '#b8c0c5', roughness: 0.30 },
        { match: 'chromium',   color: '#dadcde', roughness: 0.10 },
        { match: 'cobalt',     color: '#5a7090', roughness: 0.25 },
        { match: 'platinum',   color: '#d3d3d5', roughness: 0.15 },
        { match: 'titanium',   color: '#878a8f', roughness: 0.30 },
        { match: 'mercury',    color: '#bfc4ca', roughness: 0.05 }
    ];

    function findTint(name, list) {
        const n = name.toLowerCase();
        for (const t of list) if (n.includes(t.match)) return t;
        return null;
    }

    document.querySelectorAll('section.table-container tbody tr').forEach(row => {
        if (!row.dataset.ior) {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
                const txt = cells[1].textContent.trim();
                const match = txt.match(/(\d+\.?\d*)/);
                if (match) {
                    const iorVal = parseFloat(match[1]);
                    const name = cells[0].textContent.trim();
                    const kind = classifyMaterial(name, iorVal);

                    row.dataset.ior = iorVal;
                    row.dataset.name = name;
                    row.dataset.type = kind;

                    if (kind === 'metal') {
                        const tint = findTint(name, METAL_TINTS);
                        row.dataset.color = tint ? tint.color : '#c9ced4';
                        row.dataset.roughness = tint ? String(tint.roughness) : '0.25';
                        row.dataset.metalness = '1.0';
                        row.dataset.transmission = '0.0';
                    } else if (kind === 'opaque') {
                        const tint = findTint(name, OPAQUE_TINTS);
                        row.dataset.color = tint ? tint.color : '#ffffff';
                        row.dataset.roughness = '0.5';
                        row.dataset.metalness = '0.0';
                        row.dataset.transmission = '0.0';
                    } else {
                        // transparent (réfractif)
                        row.dataset.color = '#ffffff';
                        row.dataset.roughness = '0.0';
                        row.dataset.metalness = '0.0';
                        row.dataset.transmission = '1.0';
                    }

                    row.classList.add('clickable-row');
                }
            }
        } else if (!row.dataset.name) {
            const first = row.querySelector('td');
            if (first) row.dataset.name = first.textContent.trim();
        }
    });

    document.querySelectorAll('.clickable-row').forEach(row => {
        row.addEventListener('click', (event) => {
            const data = event.currentTarget.dataset;
            document.querySelectorAll('.clickable-row.active').forEach(r => r.classList.remove('active'));
            event.currentTarget.classList.add('active');

            setTargetMaterial({
                ior: data.ior,
                roughness: data.roughness,
                metalness: data.metalness,
                transmission: data.transmission,
                color: data.color,
                name: data.name,
                type: data.type
            });
            orbit.autoRotate = true;
        });
    });

    /* ----------------------------------------------------------
       10. Recherche IOR — filtre toutes les lignes en temps réel
    ---------------------------------------------------------- */
    const ALL_ROWS = Array.from(document.querySelectorAll('section.table-container tbody tr'));
    const ALL_SECTIONS = Array.from(document.querySelectorAll('section.table-container'));
    const TOTAL_COUNT = ALL_ROWS.length;

    function escapeHtml(s) {
        return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function setSearchCount(n, isFiltered) {
        if (!searchCount) return;
        if (isFiltered) {
            searchCount.textContent = `${n} résultat${n > 1 ? 's' : ''}`;
            searchCount.classList.add('active');
        } else {
            searchCount.textContent = `${TOTAL_COUNT} matériaux`;
            searchCount.classList.remove('active');
        }
    }

    function applySearch() {
        const q = (searchInput.value || '').trim().toLowerCase();
        const isFiltered = q.length > 0;
        let visible = 0;

        if (isFiltered) searchBar.classList.add('has-value');
        else searchBar.classList.remove('has-value');

        ALL_ROWS.forEach(row => {
            const text = row.textContent.toLowerCase();
            if (!isFiltered || text.includes(q)) {
                row.style.display = '';
                visible++;
            } else {
                row.style.display = 'none';
            }
        });

        ALL_SECTIONS.forEach(section => {
            const hasVisible = !!section.querySelector('tbody tr:not([style*="display: none"])');
            section.style.display = hasVisible ? '' : 'none';
        });

        if (noResults) {
            noResults.classList.toggle('show', isFiltered && visible === 0);
        }

        setSearchCount(visible, isFiltered);
    }

    if (searchInput) {
        searchInput.addEventListener('input', applySearch);
        // Touche Échap pour effacer
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                applySearch();
                searchInput.blur();
            }
        });
    }
    if (searchClear) {
        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            applySearch();
            searchInput.focus();
        });
    }

    // Init du compteur
    setSearchCount(TOTAL_COUNT, false);

    /* ----------------------------------------------------------
       11. Téléchargement JSON
    ---------------------------------------------------------- */
    downloadButton.addEventListener('click', () => {
        const materialData = {
            name: matName.textContent,
            type: matType.textContent,
            ior: parseFloat(current.ior.toFixed(4)),
            roughness: parseFloat(current.roughness.toFixed(4)),
            metalness: parseFloat(current.metalness.toFixed(4)),
            transmission: parseFloat(current.transmission.toFixed(4)),
            color: `#${current.color.getHexString()}`,
            thickness: parseFloat(material.thickness.toFixed(4)),
            clearcoat: parseFloat(material.clearcoat.toFixed(4)),
            clearcoatRoughness: parseFloat(material.clearcoatRoughness.toFixed(4)),
            envMapIntensity: parseFloat(material.envMapIntensity.toFixed(4))
        };
        const jsonData = JSON.stringify(materialData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const safeName = (materialData.name || 'material').replace(/[^a-zA-Z0-9-_]+/g, '_').toLowerCase();
        a.download = `${safeName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    });

    /* ----------------------------------------------------------
       12. Resize
    ---------------------------------------------------------- */
    function resize() {
        const w = wrapper.clientWidth;
        const h = wrapper.clientHeight;
        if (w === 0 || h === 0) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);

    /* ----------------------------------------------------------
       13. Boucle d'animation
    ---------------------------------------------------------- */
    let lastTime = performance.now();
    function animate() {
        requestAnimationFrame(animate);
        const now = performance.now();
        const dt = (now - lastTime) / 1000;
        lastTime = now;

        if (orbit.autoRotate && !orbit.dragging) {
            orbit.theta += orbit.autoSpeed;
        }
        updateCamera();

        applyTransition(dt);

        // Léger souffle de la rim light pour rendu vivant
        pinkRim.intensity = 0.30 + Math.sin(now * 0.0014) * 0.08;

        const canvasEl = renderer.domElement;
        const w = wrapper.clientWidth;
        const h = wrapper.clientHeight;
        if (canvasEl.width !== Math.round(w * renderer.getPixelRatio()) ||
            canvasEl.height !== Math.round(h * renderer.getPixelRatio())) {
            resize();
        }

        renderer.render(scene, camera);
    }

    // Init matériau par défaut (verre)
    setTargetMaterial({
        ior: 1.5,
        roughness: 0.0,
        metalness: 0.0,
        transmission: 1.0,
        color: '#ffffff',
        name: 'Verre (Défaut)',
        type: 'dielectric'
    });
    current.ior = target.ior;
    current.roughness = target.roughness;
    current.metalness = target.metalness;
    current.transmission = target.transmission;
    current.color.copy(target.color);

    // Marquer la ligne "Verre (Défaut)" comme active au démarrage
    const defaultRow = document.querySelector('.clickable-row[data-name="Verre (Défaut)"]');
    if (defaultRow) defaultRow.classList.add('active');

    resize();
    animate();
});

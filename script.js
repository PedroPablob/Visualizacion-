// --- SISTEMA ANTIFALLOS ---
window.addEventListener('error', function (e) {
    const ui = document.getElementById('sidebar');
    if (ui) ui.innerHTML = '<div style="color:#ff4444; padding: 20px; font-weight:bold;">ERROR: ' + e.message + '</div>';
});

document.addEventListener('DOMContentLoaded', () => {

    const container = document.getElementById('canvas-container');
    if (typeof THREE === 'undefined') return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050507, 0.00095);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2800);
    camera.position.set(-400, 30, 200);

    // --- ALINEACIÓN ÓPTICA DEL 3D ---
    function updateCameraOffset() {
        const offset = window.innerWidth > 768 ? -172 : 0;
        camera.setViewOffset(window.innerWidth, window.innerHeight, offset, 0, window.innerWidth, window.innerHeight);
    }
    updateCameraOffset();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 1400;
    controls.minDistance = 50;
    controls.enabled = false;
    controls.target.set(0, 50, 0);

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    const threadsGroup = new THREE.Group();
    const labelsGroup = new THREE.Group();
    const concretoGroup = new THREE.Group();
    const effectsGroup = new THREE.Group();

    mainGroup.add(threadsGroup);
    mainGroup.add(labelsGroup);
    mainGroup.add(concretoGroup);
    mainGroup.add(effectsGroup);

    let isAbstract = true;
    let isLightMode = false;
    let globalSpeed = 0.2;
    let isIntroPlaying = true;
    let introTimeline = null;
    let camIntroTween = null;
    let targetIntroTween = null;

    const activeCorners = { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true };
    const frictions = { vehiculos: false, personas: false, desorientacion: false };
    let activeScenario = null;

    const hitboxes = [];
    const baseLines = [];
    const animatedRings = [];
    const frictionRings = {};
    let hoveredTarget = null;
    let highlightedCornerId = null;
    let highlightedBaseLine = null;

    const clock = new THREE.Clock();
    const raycaster = new THREE.Raycaster();
    raycaster.params.Line.threshold = 14;

    const mouse = new THREE.Vector2(-999, -999);
    const tooltip = document.getElementById('hover-tooltip');
    const ttBadge = document.getElementById('tt-badge');
    const ttRoute = document.getElementById('tt-route');
    const ttTitle = document.getElementById('tt-title');
    const ttMetrics = document.getElementById('tt-metrics');
    const ttData = document.getElementById('tt-data');
    const skipIntroBtn = document.getElementById('skip-intro');

    // --- BASE DE DATOS OFICIAL (CONSOLIDADO 10 SALIDAS DE 10 MIN + MICAS GRUPO 4) ---
    // Incluye paleta calibrada tanto para fondo oscuro (color) como para fondo blanco (lightColor)
    const corners = {
        1: {
            color: 0x27a2b9,
            lightColor: 0x0f7d94,
            colorName: "Celeste",
            x: 260,
            z: 150,
            name: "E1: BLANCO N.",
            shortLabel: "E1 (Blanco N.)",
            minutosObs: 100,
            peatonesTotal: 2650,
            peatonesMin: 26.5,
            picoMin: 41.0,
            pausaMin: 1.9,
            pausaPct: 7.1,
            crucesMin: 13.6,
            cruceInformalPct: 19,
            vehMin: 16.0,
            micasTrazos: 8,
            micasStickers: 9,
            data: "Mayor flujo peatonal (26,5/min) y vehicular (16,0 veh/min) de la plaza. Embudo de descarga intermodal de micros (31,3%) hacia Estación Puerto y BancoEstado."
        },
        2: {
            color: 0xe5c31b,
            lightColor: 0xc98600,
            colorName: "Amarillo",
            x: 260,
            z: -150,
            name: "E2: EST. PUERTO",
            shortLabel: "E2 (Est. Puerto)",
            minutosObs: 89,
            peatonesTotal: 2350,
            peatonesMin: 26.4,
            picoMin: 45.2,
            pausaMin: 2.4,
            pausaPct: 9.0,
            crucesMin: 9.5,
            cruceInformalPct: 27,
            vehMin: 14.2,
            micasTrazos: 8,
            micasStickers: 5,
            data: "Segundo mayor flujo (26,4/min) con pico récord de 45,2 peatones/min. Recibe las oleadas desde Estación Puerto (EFE, 18,8%) que chocan con locales gastronómicos al paso."
        },
        3: {
            color: 0xd13a5b,
            lightColor: 0xb81d43,
            colorName: "Rosado",
            x: 0,
            z: -150,
            name: "E3: COCHRANE N.",
            shortLabel: "E3 (Cochrane N.)",
            minutosObs: 90,
            peatonesTotal: 1953,
            peatonesMin: 21.7,
            picoMin: 39.0,
            pausaMin: 2.4,
            pausaPct: 11.1,
            crucesMin: 11.6,
            cruceInformalPct: 43,
            vehMin: 11.1,
            micasTrazos: 8,
            micasStickers: 5,
            data: "Lidera la tasa de detención de toda la plaza (11,1% en pausa) y la presión de transporte público (1,8 micros/min y picos de hasta 19 personas esperando en vereda estrecha)."
        },
        4: {
            color: 0x5db930,
            lightColor: 0x248737,
            colorName: "Verde",
            x: 0,
            z: 150,
            name: "E4: COCHRANE S.",
            shortLabel: "E4 (Cochrane S.)",
            minutosObs: 90,
            peatonesTotal: 1800,
            peatonesMin: 20.0,
            picoMin: 29.8,
            pausaMin: 1.8,
            pausaPct: 9.1,
            crucesMin: 10.4,
            cruceInformalPct: 56,
            vehMin: 9.5,
            micasTrazos: 8,
            micasStickers: 13,
            data: "Punto récord de cruces informales: el 56% cruza fuera del paso habilitado (5,9 de 10,4 cruces/min). Combina alta frecuencia de micros (1,6/min) y esperas de hasta 13 personas."
        },
        5: {
            color: 0x1f64c6,
            lightColor: 0x1247ad,
            colorName: "Azul",
            x: -260,
            z: 150,
            name: "E5: EJE PRAT",
            shortLabel: "E5 (Eje Prat)",
            minutosObs: 80,
            peatonesTotal: 1872,
            peatonesMin: 23.4,
            picoMin: 38.6,
            pausaMin: 1.2,
            pausaPct: 5.1,
            crucesMin: 9.0,
            cruceInformalPct: 44,
            vehMin: 10.1,
            micasTrazos: 10,
            micasStickers: 19,
            data: "Corredor financiero e institucional con la menor tasa de pausa (5,1%). Predomina el flujo laboral acelerado y constante entre oficinas y bancos."
        },
        6: {
            color: 0xc9252c,
            lightColor: 0xb3141b,
            colorName: "Rojo",
            x: -260,
            z: -150,
            name: "E6: ARMADA",
            shortLabel: "E6 (Armada)",
            minutosObs: 90,
            peatonesTotal: 1674,
            peatonesMin: 18.6,
            picoMin: 37.2,
            pausaMin: 1.0,
            pausaPct: 5.4,
            crucesMin: 6.0,
            cruceInformalPct: 49,
            vehMin: 8.4,
            micasTrazos: 7,
            micasStickers: 9,
            data: "Umbral institucional frente a la Armada y acceso a Barrio Puerto. Expuesto al sol y con baja detención (5,4%), donde el 49% cruza en diagonal fuera del paso demarcado."
        }
    };

    const frictionZones = {
        vehiculos: { x: -260, z: 0, r: 160, color: 0xff4444, lightColor: 0xd91e26 },
        personas: { x: 130, z: -150, r: 140, color: 0xffaa00, lightColor: 0xd47a00 },
        desorientacion: { x: -30, z: 50, r: 150, color: 0x9b59b6, lightColor: 0x762b96 }
    };

    const scenariosData = {
        'intermodal': {
            p1: 1,
            p2: 2,
            x: 260,
            z: 0,
            name: "EL EJE INTERMODAL (E1 ↔ E2)",
            peatonesCombinados: "5.000 peatones",
            flujoCombinado: "52,9 peatones/min",
            data: "Concentra el mayor volumen de transbordo de toda la plaza (2.650 peatones en E1 + 2.350 en E2). Los cuerpos se desplazan mecánicamente entre la micro (31,3%) y Estación Puerto (18,8%).",
            color: '#27a2b9'
        },
        'laboral': {
            p1: 4,
            p2: 5,
            x: -130,
            z: 150,
            name: "LA DIAGONAL DE RIESGO (E4 ↔ E5)",
            peatonesCombinados: "3.672 peatones",
            flujoCombinado: "43,4 peatones/min",
            data: "Une el vértice de mayor cruce informal (56% en E4) con el corredor financiero sin pausa (E5). Concentra la mayor tensión entre el flujo peatonal apresurado y el tránsito vehicular.",
            color: '#5db930'
        },
        'paseo': {
            p1: 3,
            p2: 6,
            x: -130,
            z: -150,
            name: "EL PASEO Y EL SOL (E3 ↔ E6)",
            peatonesCombinados: "3.627 peatones",
            flujoCombinado: "40,3 peatones/min",
            data: "Conecta el borde comercial saturado de espera de locomoción (11,1% de pausa en E3) con la explanada abierta frente a la Armada y el Monumento a los Héroes de Iquique (E6).",
            color: '#d13a5b'
        }
    };

    function formatNumber(n) {
        return Number(n).toLocaleString('es-CL');
    }

    function getCornerActiveColor(c) {
        return isLightMode ? c.lightColor : c.color;
    }

    function getCornerActiveHex(c) {
        const col = getCornerActiveColor(c);
        return '#' + col.toString(16).padStart(6, '0');
    }

    // --- RENDERIZADO RICO DEL TOOLTIP (ONDAS, NODOS, RELACIONES Y FRICCIONES) ---
    function renderCornerTooltip(cornerId, mode = 'wave', targetCornerId = null) {
        const c = corners[cornerId];
        if (!c) return;
        const hex = getCornerActiveHex(c);

        ttBadge.innerText = mode === 'wave'
            ? `ONDA DE FLUJO • ${c.colorName.toUpperCase()}`
            : `ESQUINA E${cornerId} • ${c.colorName.toUpperCase()}`;
        ttBadge.style.background = hex;
        ttBadge.style.color = (!isLightMode && cornerId == 2) ? '#111' : '#fff';

        if (mode === 'wave' && targetCornerId && corners[targetCornerId] && targetCornerId !== cornerId) {
            ttRoute.innerText = `Trayecto E${cornerId} → E${targetCornerId}`;
        } else {
            ttRoute.innerText = `${c.minutosObs} min observados`;
        }

        ttTitle.innerText = c.name;
        ttMetrics.innerHTML = `
            <div class="tt-metric-box highlight">
                <div>
                    <span class="tt-metric-val" style="color:${hex}">${formatNumber(c.peatonesTotal)} peatones</span>
                    <span class="tt-metric-lbl">Total contabilizado (${c.minutosObs} min)</span>
                </div>
                <div style="text-align:right">
                    <span class="tt-metric-val">${c.peatonesMin.toString().replace('.', ',')}/min</span>
                    <span class="tt-metric-lbl">Pico: ${c.picoMin.toString().replace('.', ',')}/min</span>
                </div>
            </div>
            <div class="tt-metric-box">
                <span class="tt-metric-val">${c.pausaPct.toString().replace('.', ',')}% (${c.pausaMin.toString().replace('.', ',')}/min)</span>
                <span class="tt-metric-lbl">Personas en Pausa</span>
            </div>
            <div class="tt-metric-box">
                <span class="tt-metric-val">${c.cruceInformalPct}% informal</span>
                <span class="tt-metric-lbl">${c.crucesMin.toString().replace('.', ',')} cruces/min</span>
            </div>
        `;
        ttData.innerText = c.data;
        tooltip.style.borderLeftColor = hex;
        tooltip.classList.add('visible');
    }

    function renderSpecialTooltip(ud) {
        ttBadge.style.color = '#fff';
        if (ud.type === 'scenario') {
            const s = scenariosData[ud.id];
            const c1 = corners[s.p1];
            const c2 = corners[s.p2];
            ttBadge.innerText = 'RELACIÓN CLAVE';
            ttBadge.style.background = isLightMode ? '#111115' : 'rgba(255,255,255,0.2)';
            ttRoute.innerText = `${c1.shortLabel} ↔ ${c2.shortLabel}`;
            ttTitle.innerText = s.name;
            ttMetrics.innerHTML = `
                <div class="tt-metric-box highlight">
                    <div>
                        <span class="tt-metric-val">${s.peatonesCombinados}</span>
                        <span class="tt-metric-lbl">Volumen combinado del par</span>
                    </div>
                    <div style="text-align:right">
                        <span class="tt-metric-val">${s.flujoCombinado}</span>
                        <span class="tt-metric-lbl">Ritmo conjunto</span>
                    </div>
                </div>
                <div class="tt-metric-box">
                    <span class="tt-metric-val">${formatNumber(c1.peatonesTotal)} peat.</span>
                    <span class="tt-metric-lbl">${c1.name} (${c1.peatonesMin.toString().replace('.', ',')}/min)</span>
                </div>
                <div class="tt-metric-box">
                    <span class="tt-metric-val">${formatNumber(c2.peatonesTotal)} peat.</span>
                    <span class="tt-metric-lbl">${c2.name} (${c2.peatonesMin.toString().replace('.', ',')}/min)</span>
                </div>
            `;
            ttData.innerText = s.data;
            tooltip.style.borderLeftColor = s.color || '#111115';
        } else if (ud.type === 'friction') {
            ttBadge.innerText = 'FRICCIÓN ESTRUCTURAL';
            ttBadge.style.background = ud.color || '#ff4444';
            ttRoute.innerText = ud.statsTag || 'Observación y Encuestas';
            ttTitle.innerText = ud.name;
            ttMetrics.innerHTML = ud.metricsHtml || '';
            ttData.innerText = ud.data;
            tooltip.style.borderLeftColor = ud.color || '#ff4444';
        } else if (ud.type === 'map') {
            ttBadge.innerText = 'TRAZA URBANA • PLAZA SOTOMAYOR';
            ttBadge.style.background = isLightMode ? '#111115' : 'rgba(255,255,255,0.2)';
            ttRoute.innerText = '12.299 peatones en 539 min';
            ttTitle.innerText = ud.name;
            ttMetrics.innerHTML = `
                <div class="tt-metric-box highlight">
                    <div>
                        <span class="tt-metric-val">12.299 peatones</span>
                        <span class="tt-metric-lbl">Total medido en E1–E6 (539 min)</span>
                    </div>
                    <div style="text-align:right">
                        <span class="tt-metric-val">19% a 56%</span>
                        <span class="tt-metric-lbl">Cruce fuera de paso</span>
                    </div>
                </div>
            `;
            ttData.innerText = ud.data;
            tooltip.style.borderLeftColor = isLightMode ? '#111115' : '#fff';
        }
        tooltip.classList.add('visible');
    }

    // --- RESALTADO VISUAL DE ONDAS POR ESQUINA / COLOR (CALIBRADO PARA OSCURO Y BLANCO) ---
    function setWaveHighlight(cornerId, specificBaseLine = null) {
        highlightedCornerId = cornerId;
        highlightedBaseLine = specificBaseLine;

        const defaultBaseOpacity = isLightMode ? 0.42 : 0.16;
        const familyHighlightOpacity = isLightMode ? 0.72 : 0.44;
        const singleHighlightOpacity = isLightMode ? 1.0 : 0.88;
        const dimmedOpacity = isLightMode ? 0.08 : 0.04;

        baseLines.forEach(line => {
            let targetOp = defaultBaseOpacity;
            if (cornerId) {
                if (line === specificBaseLine) {
                    targetOp = singleHighlightOpacity;
                } else if (String(line.userData.cornerId) === String(cornerId)) {
                    targetOp = familyHighlightOpacity;
                } else {
                    targetOp = dimmedOpacity;
                }
            }
            line.material.opacity = targetOp;
            if (line.userData.companionLine) {
                line.userData.companionLine.material.opacity = targetOp * 0.85;
            }
        });
    }

    // --- DIBUJO DE ETIQUETAS 3D ADAPTABLES AL TEMA (SOLO NOMBRE DE ESQUINA) ---
    function drawCornerLabelCanvas(c) {
        const canvas = c.canvas || document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const hex = getCornerActiveHex(c);

        ctx.font = '900 38px Montserrat, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (isLightMode) {
            ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
            ctx.shadowBlur = 12;
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.strokeText(c.name, canvas.width / 2, canvas.height / 2);
            ctx.fillStyle = hex;
            ctx.fillText(c.name, canvas.width / 2, canvas.height / 2);
        } else {
            ctx.shadowColor = 'rgba(0, 0, 0, 1)';
            ctx.shadowBlur = 15;
            ctx.fillStyle = hex;
            ctx.fillText(c.name, canvas.width / 2, canvas.height / 2);
        }

        c.canvas = canvas;
        return canvas;
    }

    // --- HITBOXES, ANILLOS PULSANTES Y ETIQUETAS 3D ---
    function createCornerLabels() {
        for (let key in corners) {
            let c = corners[key];
            const canvas = drawCornerLabelCanvas(c);

            const texture = new THREE.CanvasTexture(canvas);
            texture.minFilter = THREE.LinearFilter;

            const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
            const sprite = new THREE.Sprite(spriteMat);
            sprite.scale.set(180, 45, 1);
            sprite.position.set(c.x, 35, c.z);
            sprite.userData = { baseY: 35, phase: Number(key) * 1.1 };

            const dotGeo = new THREE.SphereGeometry(6, 20, 20);
            const dotMat = new THREE.MeshBasicMaterial({ color: getCornerActiveColor(c) });
            const dot = new THREE.Mesh(dotGeo, dotMat);
            dot.position.set(c.x, 0, c.z);

            const ringGeo = new THREE.RingGeometry(9, 13.5, 32);
            const ringMat = new THREE.MeshBasicMaterial({
                color: getCornerActiveColor(c),
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.45,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.set(c.x, 0.5, c.z);
            ring.userData = { phase: Number(key) * 0.9, baseOpacity: 0.45 };
            effectsGroup.add(ring);
            animatedRings.push(ring);

            const hitGeo = new THREE.SphereGeometry(42, 12, 12);
            const hitMat = new THREE.MeshBasicMaterial({ visible: false });
            const hitbox = new THREE.Mesh(hitGeo, hitMat);
            hitbox.position.set(c.x, 0, c.z);
            hitbox.userData = {
                type: 'corner',
                id: key,
                name: c.name,
                data: c.data,
                color: getCornerActiveHex(c),
                dotMesh: dot
            };

            labelsGroup.add(sprite);
            labelsGroup.add(dot);
            labelsGroup.add(hitbox);
            hitboxes.push(hitbox);
            c.sprite = sprite;
            c.texture = texture;
            c.dot = dot;
            c.ring = ring;
            c.hitbox = hitbox;
        }

        // Hitboxes y anillos visuales para Zonas de Fricción
        const frictionMeta = {
            vehiculos: {
                y: 100,
                h: 250,
                name: "TENSIÓN VEHICULAR",
                statsTag: "26,0% en encuestas • 8,4 a 16,0 veh/min",
                metricsHtml: `
                    <div class="tt-metric-box">
                        <span class="tt-metric-val" style="color:#e02424">16,0 veh/min</span>
                        <span class="tt-metric-lbl">Máx. en E1 (Blanco)</span>
                    </div>
                    <div class="tt-metric-box">
                        <span class="tt-metric-val">26,0% (25 enc.)</span>
                        <span class="tt-metric-lbl">Principal barrera</span>
                    </div>
                `,
                data: "Los hilos se quiebran en picos agudos ante el flujo constante de vehículos (9,4 part/min y hasta 2,3 buses/min en E1), obligando a pausas tensas y esquives.",
                hex: '#ff4444'
            },
            personas: {
                y: 50,
                h: 200,
                name: "NUDOS DE AGLOMERACIÓN",
                statsTag: "13,5% en encuestas • Hasta 19 esperando",
                metricsHtml: `
                    <div class="tt-metric-box">
                        <span class="tt-metric-val" style="color:#d98200">19 personas</span>
                        <span class="tt-metric-lbl">Espera máx. en E3</span>
                    </div>
                    <div class="tt-metric-box">
                        <span class="tt-metric-val">11,1% en pausa</span>
                        <span class="tt-metric-lbl">Saturación vereda</span>
                    </div>
                `,
                data: "En paraderos como E3 (1,8 micros/min) y E4 (1,6 micros/min), la espera acumula hasta 19 personas simultáneamente en veredas estrechas, estancando el flujo.",
                hex: '#ffaa00'
            },
            desorientacion: {
                y: 70,
                h: 200,
                name: "DESORIENTACIÓN Y CRUCE INFORMAL",
                statsTag: "16,7% desorientación • Hasta 56% cruce informal",
                metricsHtml: `
                    <div class="tt-metric-box">
                        <span class="tt-metric-val" style="color:#8e44ad">56% en E4</span>
                        <span class="tt-metric-lbl">Cruce fuera de paso</span>
                    </div>
                    <div class="tt-metric-box">
                        <span class="tt-metric-val">16,7% (16 enc.)</span>
                        <span class="tt-metric-lbl">Falta señalización</span>
                    </div>
                `,
                data: "La falta de señalización clara en la explanada central dispersa los vectores: entre el 43% (E3), 49% (E6) y 56% (E4) de los peatones cruza por fuera del paso habilitado.",
                hex: '#9b59b6'
            }
        };

        for (let fKey in frictionZones) {
            const fZone = frictionZones[fKey];
            const meta = frictionMeta[fKey];

            const hitGeo = new THREE.CylinderGeometry(fZone.r * 0.95, fZone.r * 0.95, meta.h, 16);
            const hitMesh = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ visible: false }));
            hitMesh.position.set(fZone.x, meta.y, fZone.z);
            hitMesh.userData = {
                type: 'friction',
                id: fKey,
                name: meta.name,
                statsTag: meta.statsTag,
                metricsHtml: meta.metricsHtml,
                data: meta.data,
                color: meta.hex
            };
            labelsGroup.add(hitMesh);
            hitboxes.push(hitMesh);

            const fRingGeo = new THREE.RingGeometry(fZone.r * 0.70, fZone.r * 0.76, 48);
            const fRingMat = new THREE.MeshBasicMaterial({
                color: fZone.color,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const fRing = new THREE.Mesh(fRingGeo, fRingMat);
            fRing.rotation.x = Math.PI / 2;
            fRing.position.set(fZone.x, 1, fZone.z);
            fRing.visible = false;
            effectsGroup.add(fRing);
            frictionRings[fKey] = fRing;
        }

        // Nodos de Escenarios (Relaciones Clave)
        for (let key in scenariosData) {
            let s = scenariosData[key];

            const dotGeo = new THREE.SphereGeometry(9.5, 20, 20);
            const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const dot = new THREE.Mesh(dotGeo, dotMat);
            dot.position.set(s.x, 20, s.z);
            dot.visible = false;

            const hitGeo = new THREE.SphereGeometry(140, 16, 16);
            const hitMat = new THREE.MeshBasicMaterial({ visible: false });
            const hitbox = new THREE.Mesh(hitGeo, hitMat);
            hitbox.position.set(s.x, 20, s.z);
            hitbox.userData = { type: 'scenario', id: key, name: s.name, data: s.data, color: s.color, dotMesh: dot };

            labelsGroup.add(dot);
            labelsGroup.add(hitbox);
            hitboxes.push(hitbox);

            s.dot = dot;
        }
    }

    // --- SELECCIÓN PONDERADA POR FLUJO PEATONAL REAL ---
    function pickWeightedCorner(activeIds) {
        let totalWeight = 0;
        for (let i = 0; i < activeIds.length; i++) {
            totalWeight += corners[activeIds[i]].peatonesMin;
        }
        let r = Math.random() * totalWeight;
        for (let i = 0; i < activeIds.length; i++) {
            const id = activeIds[i];
            r -= corners[id].peatonesMin;
            if (r <= 0) return id;
        }
        return activeIds[activeIds.length - 1];
    }

    // --- TEJIDO MATEMÁTICO PROPORCIONAL (CON HEBRAS DOBLES ENSANCHADAS EN MODO BLANCO) ---
    function generateThreads(animateTransition = true) {
        baseLines.length = 0;
        highlightedCornerId = null;
        highlightedBaseLine = null;

        while (threadsGroup.children.length > 0) {
            let child = threadsGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            threadsGroup.remove(child);
        }

        const activeIds = Object.keys(activeCorners).filter(k => activeCorners[k]);
        if (activeIds.length < 1) return;

        const blendMode = isLightMode ? THREE.NormalBlending : THREE.AdditiveBlending;
        const baseOpacity = isLightMode ? 0.42 : 0.16;

        for (let i = 0; i < 280; i++) {
            let startId = pickWeightedCorner(activeIds);
            let targetId = startId;

            if (activeIds.length > 1) {
                const otherIds = activeIds.filter(id => id !== startId);
                targetId = pickWeightedCorner(otherIds);
            }

            let c1 = corners[startId];
            let c2 = targetId === startId ? { x: 0, z: 0 } : corners[targetId];
            const activeCol = getCornerActiveColor(c1);

            let points = [];
            let segments = 80;
            let distance = Math.hypot(c2.x - c1.x, c2.z - c1.z);
            let baseElevation = distance * 0.25;

            let rSeedA = Math.random() * Math.PI * 2;
            let rSeedB = Math.random() * Math.PI * 2;

            for (let j = 0; j <= segments; j++) {
                let t = j / segments;
                let px = c1.x + (c2.x - c1.x) * t;
                let pz = c1.z + (c2.z - c1.z) * t;

                let envelope = Math.sin(t * Math.PI);
                px += Math.sin(t * 10 + rSeedA) * 22 * envelope;
                pz += Math.sin(t * 12 + rSeedB) * 22 * envelope;
                let py = envelope * (15 + baseElevation);

                if (frictions.vehiculos) {
                    let distV = Math.hypot(px - frictionZones.vehiculos.x, pz - frictionZones.vehiculos.z);
                    if (distV < frictionZones.vehiculos.r) {
                        let influence = 1 - (distV / frictionZones.vehiculos.r);
                        px += Math.sin(j * 4) * 60 * influence;
                        py += Math.abs(Math.sin(j * 5)) * 125 * influence;
                    }
                }

                if (frictions.personas) {
                    let distP = Math.hypot(px - frictionZones.personas.x, pz - frictionZones.personas.z);
                    if (distP < frictionZones.personas.r) {
                        let influence = 1 - (distP / frictionZones.personas.r);
                        px += Math.sin(j * 2) * 50 * influence;
                        pz += Math.cos(j * 2) * 50 * influence;
                        py -= 15 * influence;
                    }
                }

                if (frictions.desorientacion) {
                    let distD = Math.hypot(px - frictionZones.desorientacion.x, pz - frictionZones.desorientacion.z);
                    if (distD < frictionZones.desorientacion.r) {
                        let influence = 1 - (distD / frictionZones.desorientacion.r);
                        px += Math.sin(j * 0.8) * 90 * influence;
                        pz += Math.cos(j * 0.6) * 90 * influence;
                        py += Math.sin(j * 1.5) * 40 * influence;
                    }
                }

                points.push(new THREE.Vector3(px, py, pz));
            }

            const curve = new THREE.CatmullRomCurve3(points);
            const smoothPoints = curve.getPoints(150);
            const baseGeometry = new THREE.BufferGeometry().setFromPoints(smoothPoints);
            baseGeometry.setDrawRange(0, 0);

            const pulseGeometry = baseGeometry.clone();
            let growthSpeed = (Math.random() * 1.5) + 0.6;

            const baseMaterial = new THREE.LineBasicMaterial({
                color: activeCol,
                transparent: true,
                opacity: baseOpacity,
                blending: blendMode,
                depthWrite: false
            });
            const baseLine = new THREE.Line(baseGeometry, baseMaterial);
            baseLine.userData = {
                type: 'base',
                cornerId: startId,
                targetCornerId: targetId,
                currentPoint: 0,
                totalPoints: smoothPoints.length,
                speed: growthSpeed
            };
            threadsGroup.add(baseLine);
            baseLines.push(baseLine);

            // Hebra gemela ligeramente desplazada para ensanchar el trazo ópticamente en Modo Blanco
            const companionLine = new THREE.Line(baseGeometry, baseMaterial.clone());
            companionLine.position.set(1.1, 0.7, 1.1);
            companionLine.visible = isLightMode;
            companionLine.userData = {
                type: 'companion_base',
                cornerId: startId
            };
            baseLine.userData.companionLine = companionLine;
            threadsGroup.add(companionLine);

            const pulseMaterial = new THREE.LineBasicMaterial({
                color: activeCol,
                transparent: true,
                opacity: 1.0,
                blending: blendMode,
                depthWrite: false
            });
            const pulseLine = new THREE.Line(pulseGeometry, pulseMaterial);
            pulseLine.userData = {
                type: 'pulse',
                cornerId: startId,
                targetCornerId: targetId,
                currentPoint: Math.random() * 35,
                totalPoints: smoothPoints.length,
                speed: growthSpeed * 1.55
            };
            threadsGroup.add(pulseLine);

            // Pulso gemelo desplazado para mayor grosor en Modo Blanco
            const companionPulse = new THREE.Line(pulseGeometry, pulseMaterial);
            companionPulse.position.set(-1.1, 0.8, -1.1);
            companionPulse.visible = isLightMode;
            companionPulse.userData = {
                type: 'companion_pulse',
                cornerId: startId
            };
            pulseLine.userData.companionPulse = companionPulse;
            threadsGroup.add(companionPulse);
        }

        if (animateTransition && typeof gsap !== 'undefined') {
            gsap.killTweensOf(threadsGroup.scale);
            gsap.fromTo(
                threadsGroup.scale,
                { y: 0.08 },
                { y: 1, duration: 0.95, ease: "expo.out" }
            );
        }
    }

    // --- PLANO TÉCNICO Y LEYENDA DEL MAPA ---
    const planeGeo = new THREE.PlaneGeometry(800, 600);
    const planeMat = new THREE.MeshBasicMaterial({ color: 0x050507, side: THREE.DoubleSide, transparent: true, opacity: 0 });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = Math.PI / 2;
    plane.position.y = -3;
    plane.userData = {
        type: 'map',
        name: 'LA HUELLA PEATONAL VS. TRAZA URBANA',
        color: '#ffffff',
        data: 'Aunque la arquitectura impone calles y cruces habilitados, las ondas muestran cómo las personas fluyen libremente buscando la ruta más eficiente o esquivando barreras.\n\nEntre el 19% y el 56% de los cruces ignora la ortogonalidad de las aceras.'
    };
    concretoGroup.add(plane);
    hitboxes.push(plane);

    const gridDark = new THREE.GridHelper(900, 30, 0x444455, 0x1a1a24);
    gridDark.position.y = -2;
    concretoGroup.add(gridDark);

    const gridLight = new THREE.GridHelper(900, 30, 0x777785, 0xc8c6be);
    gridLight.position.y = -2;
    gridLight.visible = false;
    concretoGroup.add(gridLight);

    const boxMat = new THREE.MeshBasicMaterial({ color: 0x8899aa, wireframe: true, transparent: true, opacity: 0 });
    const islaPratCochrane = new THREE.Mesh(new THREE.BoxGeometry(200, 15, 200), boxMat); islaPratCochrane.position.set(-130, 7.5, 0);
    const islaCochraneBlanco = new THREE.Mesh(new THREE.BoxGeometry(200, 15, 200), boxMat); islaCochraneBlanco.position.set(130, 7.5, 0);
    const mNorteIzq = new THREE.Mesh(new THREE.BoxGeometry(100, 15, 120), boxMat); mNorteIzq.position.set(-330, 7.5, -260);
    const mNorteCentro = new THREE.Mesh(new THREE.BoxGeometry(200, 15, 120), boxMat); mNorteCentro.position.set(-130, 7.5, -260);
    const mNorteDer = new THREE.Mesh(new THREE.BoxGeometry(200, 15, 120), boxMat); mNorteDer.position.set(130, 7.5, -260);
    const mNorteLejos = new THREE.Mesh(new THREE.BoxGeometry(100, 15, 120), boxMat); mNorteLejos.position.set(330, 7.5, -260);
    const mSurIzq = new THREE.Mesh(new THREE.BoxGeometry(100, 15, 120), boxMat); mSurIzq.position.set(-330, 7.5, 260);
    const mSurCentro = new THREE.Mesh(new THREE.BoxGeometry(200, 15, 120), boxMat); mSurCentro.position.set(-130, 7.5, 260);
    const mSurDer = new THREE.Mesh(new THREE.BoxGeometry(200, 15, 120), boxMat); mSurDer.position.set(130, 7.5, 260);
    const mSurLejos = new THREE.Mesh(new THREE.BoxGeometry(100, 15, 120), boxMat); mSurLejos.position.set(330, 7.5, 260);

    concretoGroup.add(islaPratCochrane, islaCochraneBlanco, mNorteIzq, mNorteCentro, mNorteDer, mNorteLejos, mSurIzq, mSurCentro, mSurDer, mSurLejos);
    concretoGroup.visible = false;
    concretoGroup.position.y = -30;

    // --- CAMBIO DINÁMICO ENTRE MODO OSCURO Y MODO BLANCO ---
    const btnTheme = document.getElementById('btn-theme');
    const themeText = document.getElementById('theme-text');
    const btnConcreto = document.getElementById('btn-concreto');

    function updateConcretoButtonStyles() {
        if (!isAbstract) {
            btnConcreto.innerText = "VOLVER AL VOLUMEN ABSTRACTO";
            if (isLightMode) {
                btnConcreto.style.background = "#ffffff";
                btnConcreto.style.color = "#111115";
                btnConcreto.style.borderColor = "#111115";
            } else {
                btnConcreto.style.background = "#222";
                btnConcreto.style.color = "#fff";
                btnConcreto.style.borderColor = "transparent";
            }
        } else {
            btnConcreto.innerText = "REVELAR TERRITORIO";
            if (isLightMode) {
                btnConcreto.style.background = "#111115";
                btnConcreto.style.color = "#ffffff";
                btnConcreto.style.borderColor = "#111115";
            } else {
                btnConcreto.style.background = "#fff";
                btnConcreto.style.color = "#000";
                btnConcreto.style.borderColor = "transparent";
            }
        }
    }

    function applyThemeToScene() {
        document.body.classList.toggle('light-mode', isLightMode);
        if (themeText) {
            themeText.innerText = isLightMode ? 'MODO BLANCO: ACTIVADO' : 'MODO BLANCO: DESACTIVADO';
        }

        // 1. Niebla y fondo 3D
        scene.fog.color.setHex(isLightMode ? 0xf4f3ef : 0x050507);

        // 2. Redibujar etiquetas 3D y actualizar nodos y anillos
        const blendMode = isLightMode ? THREE.NormalBlending : THREE.AdditiveBlending;
        for (let key in corners) {
            const c = corners[key];
            drawCornerLabelCanvas(c);
            if (c.texture) c.texture.needsUpdate = true;
            if (c.dot) {
                c.dot.material.color.setHex(getCornerActiveColor(c));
                const baseScale = isLightMode ? 1.25 : 1.0;
                c.dot.scale.set(baseScale, baseScale, baseScale);
            }
            if (c.ring) {
                c.ring.material.color.setHex(getCornerActiveColor(c));
                c.ring.material.blending = blendMode;
                c.ring.material.needsUpdate = true;
                c.ring.userData.baseOpacity = isLightMode ? 0.65 : 0.45;
            }
            if (c.hitbox) {
                c.hitbox.userData.color = getCornerActiveHex(c);
            }
        }

        // 3. Nodos de relaciones clave (oscuros sobre blanco, blancos sobre negro)
        for (let key in scenariosData) {
            const s = scenariosData[key];
            if (s.dot) {
                s.dot.material.color.setHex(isLightMode ? 0x111115 : 0xffffff);
            }
        }

        // 4. Anillos de fricciones
        for (let fKey in frictionZones) {
            const fRing = frictionRings[fKey];
            const fZone = frictionZones[fKey];
            if (fRing) {
                fRing.material.color.setHex(isLightMode ? fZone.lightColor : fZone.color);
                fRing.material.blending = blendMode;
                fRing.material.needsUpdate = true;
            }
        }

        // 5. Plano territorial y manzanas wireframe
        gridDark.visible = !isLightMode;
        gridLight.visible = isLightMode;
        planeMat.color.setHex(isLightMode ? 0xe8e6df : 0x050507);
        boxMat.color.setHex(isLightMode ? 0x181a20 : 0x8899aa);
        if (!isAbstract) {
            planeMat.opacity = isLightMode ? 0.92 : 0.85;
            boxMat.opacity = isLightMode ? 0.88 : 0.8;
        }
        updateConcretoButtonStyles();

        // 6. Actualizar materiales y hebras gemelas de las ondas activas
        threadsGroup.children.forEach(line => {
            const c = corners[line.userData.cornerId];
            if (!c) return;
            line.material.color.setHex(getCornerActiveColor(c));
            line.material.blending = blendMode;
            line.material.needsUpdate = true;

            if (line.userData.type === 'companion_base' || line.userData.type === 'companion_pulse') {
                line.visible = isLightMode;
            }
        });
        setWaveHighlight(highlightedCornerId, highlightedBaseLine);
    }

    if (btnTheme) {
        btnTheme.addEventListener('click', (e) => {
            e.preventDefault();
            isLightMode = !isLightMode;
            applyThemeToScene();
        });
    }

    // --- FUNCIÓN PARA TERMINAR O SALTAR LA INTRO LIMPIAMENTE ---
    function finishIntro(jumpCamera = true) {
        if (!isIntroPlaying) return;
        isIntroPlaying = false;

        if (skipIntroBtn) skipIntroBtn.classList.add('hidden');
        const cinematicText = document.getElementById('cinematic-text');

        if (introTimeline) introTimeline.kill();
        if (cinematicText && typeof gsap !== 'undefined') {
            gsap.to(cinematicText, { opacity: 0, y: -10, filter: 'blur(8px)', duration: 0.4, ease: "power2.out" });
        }

        if (jumpCamera && typeof gsap !== 'undefined') {
            if (camIntroTween) camIntroTween.kill();
            if (targetIntroTween) targetIntroTween.kill();
            gsap.to(camera.position, {
                x: 0, y: 500, z: 800,
                duration: 1.6,
                ease: "expo.out",
                onComplete: () => { controls.enabled = true; }
            });
            gsap.to(controls.target, {
                x: 0, y: 0, z: 0,
                duration: 1.6,
                ease: "expo.out"
            });
        } else {
            if (camIntroTween) camIntroTween.kill();
            if (targetIntroTween) targetIntroTween.kill();
            controls.enabled = true;
        }
    }

    if (skipIntroBtn) {
        skipIntroBtn.addEventListener('click', (e) => {
            e.preventDefault();
            finishIntro(true);
        });
    }

    // --- SECUENCIA DE APERTURA ---
    document.fonts.ready.then(() => {
        createCornerLabels();
        generateThreads(false);
        animate();

        if (typeof gsap !== 'undefined') {
            const cinematicText = document.getElementById('cinematic-text');
            introTimeline = gsap.timeline({
                onComplete: () => {
                    isIntroPlaying = false;
                    if (skipIntroBtn) skipIntroBtn.classList.add('hidden');
                }
            });

            const phrases = [
                "EL FLUJO DE LA GENTE<br>ES INHERENTE,",
                "EN LAS ÁREAS PÚBLICAS SE DETERMINA<br>POR LA ARQUITECTURA,",
                "PERO LAS PERSONAS FLUYEN<br>COMO SU CONDICIÓN, LIBRES.",
                "<span class='cinematic-gradient-text'>— EXPLORA EL TEJIDO —</span>"
            ];

            phrases.forEach((html, idx) => {
                introTimeline
                    .set(cinematicText, { innerHTML: html, y: 18, scale: 0.96, filter: 'blur(8px)', opacity: 0 })
                    .to(cinematicText, {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        filter: 'blur(0px)',
                        duration: 1.6,
                        delay: idx === 0 ? 0.4 : 0.2,
                        ease: "expo.out"
                    })
                    .to(cinematicText, {
                        opacity: 0,
                        y: -14,
                        scale: 1.02,
                        filter: 'blur(6px)',
                        duration: 1.1,
                        delay: idx === 2 ? 1.8 : 1.3,
                        ease: "power2.in"
                    });
            });

            camIntroTween = gsap.to(camera.position, {
                x: 0, y: 500, z: 800,
                duration: 16,
                ease: "power2.inOut",
                onComplete: () => {
                    controls.enabled = true;
                    isIntroPlaying = false;
                    if (skipIntroBtn) skipIntroBtn.classList.add('hidden');
                }
            });
            targetIntroTween = gsap.to(controls.target, {
                x: 0, y: 0, z: 0,
                duration: 16,
                ease: "power2.inOut"
            });
        } else {
            camera.position.set(0, 500, 800);
            controls.enabled = true;
            isIntroPlaying = false;
            if (skipIntroBtn) skipIntroBtn.classList.add('hidden');
        }
    });

    // --- POSICIONAMIENTO INTELIGENTE DEL TOOLTIP ---
    container.addEventListener('mousemove', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        const maxLeft = window.innerWidth - 355;
        const maxTop = window.innerHeight - 245;
        tooltip.style.left = Math.max(10, Math.min(event.clientX + 16, maxLeft)) + 'px';
        tooltip.style.top = Math.max(10, Math.min(event.clientY + 16, maxTop)) + 'px';
    });

    function focusCameraOn(x, z, type = 'normal') {
        if (typeof gsap === 'undefined' || !isAbstract) return;

        finishIntro(false);
        gsap.killTweensOf(camera.position);
        gsap.killTweensOf(controls.target);
        gsap.killTweensOf(mainGroup.rotation);
        controls.enabled = false;

        gsap.to(mainGroup.rotation, { y: 0, duration: 1.5, ease: "power3.out" });

        if (type === 'scenario') {
            // SECUENCIA 1: Vista de Planta (Ligeramente desfasada en Z para EVITAR GIMBAL LOCK)
            const planX = x;
            const planZ = z + 20;
            const planY = 550;

            // SECUENCIA 2: Desciende a Vista Orbital (Isométrica 45 grados perfecta)
            const orbitX = x + 180;
            const orbitY = 150;
            const orbitZ = z + 180;

            const tlCam = gsap.timeline({ onComplete: () => { controls.enabled = true; } });
            tlCam.to(camera.position, { x: planX, y: planY, z: planZ, duration: 1.5, ease: "power3.out" })
                 .to(camera.position, { x: orbitX, y: orbitY, z: orbitZ, duration: 2.5, ease: "power2.inOut", delay: 0.5 });

            const tlTarget = gsap.timeline();
            tlTarget.to(controls.target, { x: x, y: 0, z: z, duration: 1.5, ease: "power3.out" })
                    .to(controls.target, { x: x, y: 0, z: z, duration: 2.5, ease: "power2.inOut", delay: 0.5 });
        } else {
            // Animación Normal
            const camX = x + 200;
            const camY = 200;
            const camZ = z + 200;

            gsap.to(controls.target, { x: x, y: 0, z: z, duration: 1.5, ease: "power3.out" });
            gsap.to(camera.position, {
                x: camX, y: camY, z: camZ,
                duration: 1.5,
                ease: "power3.out",
                onComplete: () => { controls.enabled = true; }
            });
        }
    }

    function resetCamera() {
        if (typeof gsap === 'undefined' || !isAbstract) return;

        finishIntro(false);
        gsap.killTweensOf(camera.position);
        gsap.killTweensOf(controls.target);
        controls.enabled = false;

        gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 1.5, ease: "power3.out" });
        gsap.to(camera.position, {
            x: 0, y: 500, z: 800,
            duration: 1.5,
            ease: "power3.out",
            onComplete: () => { controls.enabled = true; }
        });
    }

    // --- BUCLE PRINCIPAL DE ANIMACIÓN Y DETECCIÓN DE ONDAS + NODOS ---
    function animate() {
        requestAnimationFrame(animate);

        const elapsed = clock.getElapsedTime();

        if (isAbstract && !hoveredTarget) {
            mainGroup.rotation.y += 0.001;
        }

        // Respiración orgánica de etiquetas y anillos en el suelo
        for (let key in corners) {
            const c = corners[key];
            if (c.sprite && c.sprite.visible) {
                c.sprite.position.y = c.sprite.userData.baseY + Math.sin(elapsed * 2 + c.sprite.userData.phase) * 2.5;
            }
            if (c.ring && c.ring.visible) {
                const s = 1 + Math.sin(elapsed * 2.4 + c.ring.userData.phase) * 0.22;
                c.ring.scale.set(s, s, 1);
                c.ring.material.opacity = c.ring.userData.baseOpacity * (0.75 + Math.sin(elapsed * 2.4 + c.ring.userData.phase) * 0.25);
            }
        }

        for (let fKey in frictionRings) {
            const fRing = frictionRings[fKey];
            if (fRing.visible) {
                const pulse = 1 + Math.sin(elapsed * 3) * 0.04;
                fRing.scale.set(pulse, pulse, 1);
            }
        }

        // Raycasting sobre Nodos/Zonas primero, y luego sobre las Ondas (baseLines)
        raycaster.setFromCamera(mouse, camera);

        let detectedHit = null;
        let detectedWave = null;

        // Bloqueamos todas las interacciones de hover mientras corre la cinemática inicial o un vuelo de cámara
        if (controls.enabled && !isIntroPlaying) {
            // Prioridad 1: Nodos de esquina, escenarios y zonas de fricción
            const nodeIntersects = raycaster.intersectObjects(hitboxes);
            for (let i = 0; i < nodeIntersects.length; i++) {
                let candidate = nodeIntersects[i].object;
                let ud = candidate.userData;
                if (ud.type === 'map') continue;

                let isActive = false;
                if (ud.type === 'corner') isActive = activeCorners[ud.id];
                else if (ud.type === 'friction') isActive = frictions[ud.id];
                else if (ud.type === 'scenario') isActive = (activeScenario === ud.id);

                if (isActive) {
                    detectedHit = candidate;
                    break;
                }
            }

            // Prioridad 2: Ondas / hilos de cada esquina o color (baseLines)
            if (!detectedHit && baseLines.length > 0) {
                const waveIntersects = raycaster.intersectObjects(baseLines);
                if (waveIntersects.length > 0) {
                    detectedWave = waveIntersects[0].object;
                }
            }

            // Prioridad 3: Plano territorial cuando está revelado
            if (!detectedHit && !detectedWave && !isAbstract) {
                const mapIntersects = raycaster.intersectObject(plane);
                if (mapIntersects.length > 0) {
                    detectedHit = plane;
                }
            }
        }

        const defaultDotScale = isLightMode ? 1.25 : 1.0;

        if (detectedHit) {
            let ud = detectedHit.userData;

            if (hoveredTarget !== detectedHit) {
                if (hoveredTarget && hoveredTarget.userData && (hoveredTarget.userData.type === 'corner' || hoveredTarget.userData.type === 'scenario')) {
                    gsap.to(hoveredTarget.userData.dotMesh.scale, { x: defaultDotScale, y: defaultDotScale, z: defaultDotScale, duration: 0.3, ease: "power2.out" });
                }

                hoveredTarget = detectedHit;
                container.style.cursor = 'pointer';

                if (ud.type === 'corner' || ud.type === 'scenario') {
                    gsap.to(ud.dotMesh.scale, { x: 2.9, y: 2.9, z: 2.9, duration: 0.35, ease: "back.out(2)" });
                }

                if (ud.type === 'corner') {
                    setWaveHighlight(ud.id, null);
                    renderCornerTooltip(ud.id, 'corner', null);
                } else {
                    setWaveHighlight(null, null);
                    renderSpecialTooltip(ud);
                }
            }
        } else if (detectedWave) {
            let ud = detectedWave.userData;
            container.style.cursor = 'pointer';

            if (hoveredTarget !== detectedWave) {
                if (hoveredTarget && hoveredTarget.userData && (hoveredTarget.userData.type === 'corner' || hoveredTarget.userData.type === 'scenario')) {
                    gsap.to(hoveredTarget.userData.dotMesh.scale, { x: defaultDotScale, y: defaultDotScale, z: defaultDotScale, duration: 0.3, ease: "power2.out" });
                }
                hoveredTarget = detectedWave;

                const originCorner = corners[ud.cornerId];
                if (originCorner && originCorner.dot) {
                    gsap.to(originCorner.dot.scale, { x: 2.3, y: 2.3, z: 2.3, duration: 0.3, ease: "power2.out" });
                }

                setWaveHighlight(ud.cornerId, detectedWave);
                renderCornerTooltip(ud.cornerId, 'wave', ud.targetCornerId);
            }
        } else {
            if (hoveredTarget) {
                for (let k in corners) {
                    if (corners[k].dot) gsap.to(corners[k].dot.scale, { x: defaultDotScale, y: defaultDotScale, z: defaultDotScale, duration: 0.3, ease: "power2.out" });
                }
                for (let k in scenariosData) {
                    if (scenariosData[k].dot) gsap.to(scenariosData[k].dot.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: "power2.out" });
                }
                hoveredTarget = null;
                setWaveHighlight(null, null);
                container.style.cursor = 'default';
                tooltip.classList.remove('visible');
            }
        }

        // Animación de crecimiento y pulsos viajeros en los hilos (más largos en Modo Blanco)
        const pulseSpan = isLightMode ? 24 : 16;
        threadsGroup.children.forEach(line => {
            if (line.userData.type === 'base') {
                if (line.userData.currentPoint < line.userData.totalPoints) {
                    line.userData.currentPoint += (line.userData.speed * globalSpeed);
                }
                line.geometry.setDrawRange(0, Math.floor(line.userData.currentPoint));
            } else if (line.userData.type === 'pulse') {
                line.userData.currentPoint += (line.userData.speed * globalSpeed);
                if (line.userData.currentPoint > line.userData.totalPoints + pulseSpan + 6) {
                    line.userData.currentPoint = 0;
                }
                let start = Math.floor(line.userData.currentPoint - pulseSpan);
                let count = pulseSpan;
                if (start < 0) { count += start; start = 0; }
                line.geometry.setDrawRange(Math.max(0, start), Math.max(0, count));
            }
        });

        if (controls.enabled) {
            controls.update();
        } else {
            camera.lookAt(controls.target);
        }
        renderer.render(scene, camera);
    }

    // --- CONTROLES DOM Y LÓGICA DE INTERACCIÓN ---
    const speedSlider = document.getElementById('speed-slider');
    speedSlider.addEventListener('input', (e) => { globalSpeed = parseFloat(e.target.value); });

    function toggleFrictionRing(fId, active) {
        const ring = frictionRings[fId];
        if (!ring || typeof gsap === 'undefined') return;
        gsap.killTweensOf(ring.material);
        if (active) {
            ring.visible = true;
            gsap.to(ring.material, { opacity: isLightMode ? 0.65 : 0.45, duration: 0.5, ease: "power2.out" });
        } else {
            gsap.to(ring.material, {
                opacity: 0,
                duration: 0.35,
                ease: "power2.in",
                onComplete: () => { ring.visible = false; }
            });
        }
    }

    document.querySelectorAll('.corner-btn').forEach(btn => {
        btn.addEventListener('mouseenter', function () {
            if (isIntroPlaying || !controls.enabled) return;
            const id = this.dataset.corner;
            if (activeCorners[id]) {
                setWaveHighlight(id, null);
            }
        });
        btn.addEventListener('mouseleave', function () {
            if (isIntroPlaying || !controls.enabled) return;
            if (!hoveredTarget) {
                setWaveHighlight(null, null);
            }
        });
    });

    document.querySelectorAll('.corner-btn, .friction-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            if (isIntroPlaying) return;

            this.classList.toggle('active');
            let isActivating = this.classList.contains('active');
            let focusX = 0, focusZ = 0;

            if (activeScenario) {
                activeScenario = null;
                document.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('active'));
                for (let key in scenariosData) {
                    scenariosData[key].dot.visible = false;
                }
            }

            if (this.dataset.corner) {
                let id = this.dataset.corner;
                activeCorners[id] = isActivating;
                if (corners[id].sprite) corners[id].sprite.visible = isActivating;
                if (corners[id].dot) corners[id].dot.visible = isActivating;
                if (corners[id].ring) corners[id].ring.visible = isActivating;
                focusX = corners[id].x;
                focusZ = corners[id].z;
            }

            if (this.dataset.friction) {
                let fId = this.dataset.friction;
                frictions[fId] = isActivating;
                toggleFrictionRing(fId, isActivating);
                focusX = frictionZones[fId].x;
                focusZ = frictionZones[fId].z;
            }

            generateThreads(true);
            if (isActivating) {
                focusCameraOn(focusX, focusZ, 'normal');
            } else {
                resetCamera();
            }
        });
    });

    document.querySelectorAll('.scenario-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            if (isIntroPlaying) return;

            const wasActive = this.classList.contains('active');

            document.querySelectorAll('.corner-btn, .friction-btn, .scenario-btn').forEach(b => b.classList.remove('active'));
            for (let key in frictions) {
                frictions[key] = false;
                toggleFrictionRing(key, false);
            }
            for (let key in scenariosData) {
                scenariosData[key].dot.visible = false;
            }

            if (wasActive) {
                activeScenario = null;
                for (let key in activeCorners) {
                    activeCorners[key] = true;
                    if (corners[key].sprite) corners[key].sprite.visible = true;
                    if (corners[key].dot) corners[key].dot.visible = true;
                    if (corners[key].ring) corners[key].ring.visible = true;
                }
                document.querySelectorAll('.corner-btn').forEach(b => b.classList.add('active'));
                resetCamera();
            } else {
                for (let key in activeCorners) {
                    activeCorners[key] = false;
                    if (corners[key].sprite) corners[key].sprite.visible = false;
                    if (corners[key].dot) corners[key].dot.visible = false;
                    if (corners[key].ring) corners[key].ring.visible = false;
                }

                this.classList.add('active');
                let id = this.dataset.scenario;
                activeScenario = id;
                let s = scenariosData[id];

                activeCorners[s.p1] = true;
                corners[s.p1].sprite.visible = true;
                corners[s.p1].dot.visible = true;
                corners[s.p1].ring.visible = true;

                activeCorners[s.p2] = true;
                corners[s.p2].sprite.visible = true;
                corners[s.p2].dot.visible = true;
                corners[s.p2].ring.visible = true;

                s.dot.visible = true;

                document.querySelector(`[data-corner="${s.p1}"]`).classList.add('active');
                document.querySelector(`[data-corner="${s.p2}"]`).classList.add('active');

                focusCameraOn(s.x, s.z, 'scenario');
            }

            generateThreads(true);
        });
    });

    btnConcreto.addEventListener('click', (e) => {
        e.preventDefault();
        if (isIntroPlaying) return;
        isAbstract = !isAbstract;

        gsap.killTweensOf(camera.position);
        gsap.killTweensOf(controls.target);
        gsap.killTweensOf(mainGroup.rotation);
        gsap.killTweensOf(concretoGroup.position);
        gsap.killTweensOf(boxMat);
        gsap.killTweensOf(planeMat);
        controls.enabled = false;

        updateConcretoButtonStyles();

        if (typeof gsap !== 'undefined') {
            if (!isAbstract) {
                concretoGroup.visible = true;
                gsap.to(camera.position, {
                    x: 0, y: 1000, z: 5,
                    duration: 2.5,
                    ease: "power3.inOut",
                    onComplete: () => { controls.enabled = true; }
                });
                gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 2.5, ease: "power3.inOut" });
                gsap.to(mainGroup.rotation, { y: 0, duration: 2, ease: "power3.inOut" });
                gsap.to(concretoGroup.position, { y: 0, duration: 1.6, ease: "expo.out" });
                gsap.to(planeMat, { opacity: isLightMode ? 0.92 : 0.85, duration: 1.4, ease: "power2.out" });
                gsap.to(boxMat, { opacity: isLightMode ? 0.88 : 0.8, duration: 1.6, ease: "power2.out" });

                tooltip.classList.remove('visible');
            } else {
                gsap.to(camera.position, {
                    x: 0, y: 500, z: 800,
                    duration: 2.0,
                    ease: "power3.inOut",
                    onComplete: () => { controls.enabled = true; }
                });
                gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 2.0, ease: "power3.inOut" });
                gsap.to(concretoGroup.position, { y: -30, duration: 1.1, ease: "power2.in" });
                gsap.to(planeMat, { opacity: 0, duration: 0.9 });
                gsap.to(boxMat, {
                    opacity: 0,
                    duration: 0.9,
                    onComplete: () => { concretoGroup.visible = false; }
                });
            }
        }
    });

    const btnReset = document.getElementById('btn-reset');
    if (btnReset) {
        btnReset.addEventListener('click', (e) => {
            e.preventDefault();
            finishIntro(false);

            activeScenario = null;
            document.querySelectorAll('.scenario-btn, .friction-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.corner-btn').forEach(b => b.classList.add('active'));

            for (let key in activeCorners) {
                activeCorners[key] = true;
                if (corners[key].sprite) corners[key].sprite.visible = true;
                if (corners[key].dot) corners[key].dot.visible = true;
                if (corners[key].ring) corners[key].ring.visible = true;
            }
            for (let key in frictions) {
                frictions[key] = false;
                toggleFrictionRing(key, false);
            }
            for (let key in scenariosData) {
                scenariosData[key].dot.visible = false;
            }

            if (!isAbstract) {
                btnConcreto.click();
            } else {
                resetCamera();
            }
            generateThreads(true);
        });
    }

    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            const isOpen = sidebar.classList.toggle('open');
            mobileMenuBtn.innerText = isOpen ? 'Cerrar ✕' : 'Controles';
        });
    }

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        updateCameraOffset();
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
});

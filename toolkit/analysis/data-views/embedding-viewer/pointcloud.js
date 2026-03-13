import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CLUSTER_COLORS, OUTLIER_COLOR } from '../lib/colors.js';

export function createPointCloud(container, config) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(
        60,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.set(0, 0, 15);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;

    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 0.3;
    const mouseVec = new THREE.Vector2();

    let points = null;
    let pointsData = [];
    let selectedIndex = null;

    // Selection highlight ring
    const highlightGeom = new THREE.BufferGeometry();
    highlightGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
    const highlightMat = new THREE.PointsMaterial({
        size: (config.pointSize?.scale || 0.25) * 3,
        color: 0xffffff,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.8,
    });
    const highlightPoint = new THREE.Points(highlightGeom, highlightMat);
    highlightPoint.visible = false;
    scene.add(highlightPoint);

    function setData(records) {
        if (points) scene.remove(points);
        pointsData = records;

        const positions = new Float32Array(records.length * 3);
        const colors = new Float32Array(records.length * 3);

        records.forEach((r, i) => {
            positions[i * 3] = r.x;
            positions[i * 3 + 1] = r.y;
            positions[i * 3 + 2] = r.z;

            const hex = r.cluster === -1
                ? OUTLIER_COLOR
                : CLUSTER_COLORS[r.cluster % CLUSTER_COLORS.length];
            const c = new THREE.Color(hex);
            colors[i * 3] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
        });

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: config.pointSize?.scale || 0.25,
            vertexColors: true,
            sizeAttenuation: true,
        });

        points = new THREE.Points(geometry, material);
        scene.add(points);

        // Update selection highlight if needed
        if (selectedIndex !== null && selectedIndex < records.length) {
            updateHighlight(records[selectedIndex]);
        } else {
            highlightPoint.visible = false;
        }
    }

    function updateHighlight(record) {
        if (!record) {
            highlightPoint.visible = false;
            return;
        }
        const pos = highlightGeom.attributes.position;
        pos.setXYZ(0, record.x, record.y, record.z);
        pos.needsUpdate = true;
        highlightPoint.visible = true;
    }

    function pick(clientX, clientY) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouseVec.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouseVec.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouseVec, camera);
        if (!points) return null;
        const intersects = raycaster.intersectObject(points);
        return intersects.length > 0 ? { index: intersects[0].index, record: pointsData[intersects[0].index] } : null;
    }

    function focusOn(record) {
        controls.target.set(record.x, record.y, record.z);
        camera.position.set(record.x, record.y + 2, record.z + 5);
        controls.update();
    }

    function select(index) {
        selectedIndex = index;
        if (index !== null && index < pointsData.length) {
            updateHighlight(pointsData[index]);
        } else {
            highlightPoint.visible = false;
        }
    }

    function resize() {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }

    animate();
    window.addEventListener('resize', resize);

    return { setData, pick, focusOn, select, resize, domElement: renderer.domElement };
}

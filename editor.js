// ═══════════════════════════════════════════════════════════════
// NEXUS ENGINE 2.0 - Visual Game Editor
// Features: Scene graph, Visual scripting, Real-time preview
// ═══════════════════════════════════════════════════════════════

class NexusEditor {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.selectedObject = null;
        this.objects = new Map();
        this.isPlaying = false;
        this.gizmoMode = 'translate';
        this.isLocalSpace = true;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.dragPlane = new THREE.Plane();
        this.isDragging = false;
        this.dragOffset = new THREE.Vector3();
        this.transformStart = null;
        
        this.init();
        this.setupEvents();
        this.animate();
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0d1117);
        this.scene.fog = new THREE.Fog(0x0d1117, 10, 50);

        // Camera
        this.camera = new THREE.PerspectiveCamera(60, 
            (window.innerWidth - 600) / (window.innerHeight - 248), 0.1, 1000);
        this.camera.position.set(5, 5, 10);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        const canvas = document.getElementById('gameCanvas');
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(window.innerWidth - 600, window.innerHeight - 248);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Grid
        const gridHelper = new THREE.GridHelper(30, 30, 0x58a6ff, 0x21262d);
        this.scene.add(gridHelper);

        // Lights
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 5);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        // Gizmo
        this.createGizmo();
        
        // Default objects
        this.createDefaultScene();
    }

    createGizmo() {
        this.gizmo = new THREE.Group();
        
        // X axis (red)
        const xGeo = new THREE.CylinderGeometry(0.05, 0.05, 2);
        const xMat = new THREE.MeshBasicMaterial({ color: 0xf85149 });
        const xAxis = new THREE.Mesh(xGeo, xMat);
        xAxis.rotation.z = -Math.PI / 2;
        xAxis.position.x = 1;
        this.gizmo.add(xAxis);
        
        // Y axis (green)
        const yGeo = new THREE.CylinderGeometry(0.05, 0.05, 2);
        const yMat = new THREE.MeshBasicMaterial({ color: 0x3fb950 });
        const yAxis = new THREE.Mesh(yGeo, yMat);
        yAxis.position.y = 1;
        this.gizmo.add(yAxis);
        
        // Z axis (blue)
        const zGeo = new THREE.CylinderGeometry(0.05, 0.05, 2);
        const zMat = new THREE.MeshBasicMaterial({ color: 0x58a6ff });
        const zAxis = new THREE.Mesh(zGeo, zMat);
        zAxis.rotation.x = Math.PI / 2;
        zAxis.position.z = 1;
        this.gizmo.add(zAxis);
        
        this.gizmo.visible = false;
        this.scene.add(this.gizmo);
    }

    createDefaultScene() {
        // Ground
        const ground = this.createObject('ground', 'box', {
            width: 10, height: 0.5, depth: 10,
            color: 0x21262d,
            position: [0, -0.25, 0]
        });

        // Player
        const player = this.createObject('player', 'capsule', {
            radius: 0.5, length: 1,
            color: 0x58a6ff,
            position: [0, 1, 0]
        });

        // Platform
        const platform = this.createObject('platform1', 'box', {
            width: 3, height: 0.5, depth: 3,
            color: 0xa371f7,
            position: [5, 2, 0]
        });

        this.updateHierarchy();
    }

    createObject(name, type, params = {}) {
        let geometry, material, mesh;
        
        const color = params.color || 0x58a6ff;
        material = new THREE.MeshStandardMaterial({ 
            color,
            roughness: 0.7,
            metalness: 0.3
        });

        switch(type) {
            case 'box':
                geometry = new THREE.BoxGeometry(
                    params.width || 1, 
                    params.height || 1, 
                    params.depth || 1
                );
                break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(params.radius || 0.5, 32, 16);
                break;
            case 'capsule':
                geometry = new THREE.CapsuleGeometry(params.radius || 0.5, params.length || 1, 4, 8);
                break;
            case 'cone':
                geometry = new THREE.ConeGeometry(params.radius || 0.5, params.height || 1, 32);
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(params.radius || 0.5, params.radius || 0.5, params.height || 1, 32);
                break;
        }

        mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...(params.position || [0, 0, 0]));
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        mesh.userData = {
            id: name,
            type: type,
            components: ['Transform', 'Mesh Renderer', 'Collider']
        };

        this.scene.add(mesh);
        this.objects.set(name, mesh);
        
        return mesh;
    }

    setupEvents() {
        const canvas = document.getElementById('gameCanvas');
        
        // Mouse events
        canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        canvas.addEventListener('mouseup', () => this.onMouseUp());
        canvas.addEventListener('wheel', (e) => this.onWheel(e));
        
        // Transform inputs
        ['posX', 'posY', 'posZ', 'rotX', 'rotY', 'rotZ', 'scaleX', 'scaleY', 'scaleZ'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this.updateTransform());
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.selectedObject) {
                this.deleteObject(this.selectedObject.userData.id);
            }
            if (e.key === 'w') setGizmo('translate');
            if (e.key === 'e') setGizmo('rotate');
            if (e.key === 'r') setGizmo('scale');
        });

        window.addEventListener('resize', () => this.onResize());
    }

    onMouseDown(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Check gizmo first
        const gizmoIntersects = this.raycaster.intersectObjects(this.gizmo.children);
        if (gizmoIntersects.length > 0 && this.selectedObject) {
            this.isDragging = true;
            this.dragAxis = gizmoIntersects[0].object;
            
            // Set drag plane
            const normal = new THREE.Vector3();
            if (this.dragAxis === this.gizmo.children[0]) normal.set(0, 1, 0); // X axis - move in YZ plane
            else if (this.dragAxis === this.gizmo.children[1]) normal.set(1, 0, 0); // Y axis - move in XZ plane
            else normal.set(0, 1, 0); // Z axis
            
            this.dragPlane.setFromNormalAndCoplanarPoint(normal, this.selectedObject.position);
            return;
        }

        // Select object
        const intersects = this.raycaster.intersectObjects([...this.objects.values()]);
        if (intersects.length > 0) {
            this.selectObject(intersects[0].object);
        } else {
            this.selectObject(null);
        }
    }

    onMouseMove(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        if (this.isDragging && this.selectedObject) {
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersectPoint = new THREE.Vector3();
            this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
            
            if (intersectPoint) {
                if (this.gizmoMode === 'translate') {
                    if (this.dragAxis === this.gizmo.children[0]) {
                        this.selectedObject.position.x = intersectPoint.x;
                    } else if (this.dragAxis === this.gizmo.children[1]) {
                        this.selectedObject.position.y = intersectPoint.y;
                    } else {
                        this.selectedObject.position.z = intersectPoint.z;
                    }
                }
                this.syncTransformUI();
                this.updateGizmo();
            }
        }
    }

    onMouseUp() {
        this.isDragging = false;
    }

    onWheel(event) {
        const zoomSpeed = 0.1;
        this.camera.position.multiplyScalar(1 + event.deltaY * 0.001);
    }

    selectObject(object) {
        this.selectedObject = object;
        
        // Update UI
        document.querySelectorAll('.tree-item').forEach(item => {
            item.classList.remove('selected');
            if (object && item.dataset.id === object.userData.id) {
                item.classList.add('selected');
            }
        });

        this.gizmo.visible = !!object;
        this.updateGizmo();
        this.syncTransformUI();
    }

    updateGizmo() {
        if (!this.selectedObject) return;
        this.gizmo.position.copy(this.selectedObject.position);
        this.gizmo.rotation.copy(this.selectedObject.rotation);
    }

    syncTransformUI() {
        if (!this.selectedObject) return;
        
        const p = this.selectedObject.position;
        const r = this.selectedObject.rotation;
        const s = this.selectedObject.scale;
        
        document.getElementById('posX').value = p.x.toFixed(2);
        document.getElementById('posY').value = p.y.toFixed(2);
        document.getElementById('posZ').value = p.z.toFixed(2);
        
        document.getElementById('rotX').value = (r.x * 180 / Math.PI).toFixed(1);
        document.getElementById('rotY').value = (r.y * 180 / Math.PI).toFixed(1);
        document.getElementById('rotZ').value = (r.z * 180 / Math.PI).toFixed(1);
        
        document.getElementById('scaleX').value = s.x.toFixed(2);
        document.getElementById('scaleY').value = s.y.toFixed(2);
        document.getElementById('scaleZ').value = s.z.toFixed(2);
    }

    updateTransform() {
        if (!this.selectedObject) return;
        
        this.selectedObject.position.set(
            parseFloat(document.getElementById('posX').value) || 0,
            parseFloat(document.getElementById('posY').value) || 0,
            parseFloat(document.getElementById('posZ').value) || 0
        );
        
        this.selectedObject.rotation.set(
            (parseFloat(document.getElementById('rotX').value) || 0) * Math.PI / 180,
            (parseFloat(document.getElementById('rotY').value) || 0) * Math.PI / 180,
            (parseFloat(document.getElementById('rotZ').value) || 0) * Math.PI / 180
        );
        
        this.selectedObject.scale.set(
            parseFloat(document.getElementById('scaleX').value) || 1,
            parseFloat(document.getElementById('scaleY').value) || 1,
            parseFloat(document.getElementById('scaleZ').value) || 1
        );
        
        this.updateGizmo();
    }

    updateHierarchy() {
        const tree = document.getElementById('sceneTree');
        tree.innerHTML = '';
        
        this.objects.forEach((obj, name) => {
            const li = document.createElement('li');
            li.className = 'tree-item';
            li.dataset.id = name;
            if (obj === this.selectedObject) li.classList.add('selected');
            
            const icon = obj.userData.type === 'light' ? '💡' : 
                        obj.userData.type === 'camera' ? '📷' : '📦';
            
            li.innerHTML = `<span class="tree-icon">${icon}</span><span>${name}</span>`;
            li.onclick = () => this.selectObject(obj);
            tree.appendChild(li);
        });
    }

    deleteObject(name) {
        const obj = this.objects.get(name);
        if (obj) {
            this.scene.remove(obj);
            this.objects.delete(name);
            if (this.selectedObject === obj) this.selectObject(null);
            this.updateHierarchy();
        }
    }

    onResize() {
        const width = window.innerWidth - 600;
        const height = window.innerHeight - 248;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update stats
        document.getElementById('stats').textContent = 
            `FPS: 60 | Objects: ${this.objects.size} | Selected: ${this.selectedObject?.userData.id || 'None'}`;
        
        this.renderer.render(this.scene, this.camera);
    }

    // Export scene data
    exportScene() {
        const data = {
            objects: [],
            events: window.events || []
        };
        
        this.objects.forEach((obj, name) => {
            data.objects.push({
                name,
                type: obj.userData.type,
                position: obj.position.toArray(),
                rotation: obj.rotation.toArray(),
                scale: obj.scale.toArray(),
                components: obj.userData.components
            });
        });
        
        return JSON.stringify(data, null, 2);
    }
}

// ═══════════════════════════════════════════════════════════════
// GLOBAL FUNCTIONS
// ═══════════════════════════════════════════════════════════════

let editor;

window.onload = () => {
    editor = new NexusEditor();
};

function addObject() {
    const types = ['box', 'sphere', 'capsule', 'cone', 'cylinder'];
    const type = types[Math.floor(Math.random() * types.length)];
    const name = `object_${Date.now()}`;
    editor.createObject(name, type, {
        position: [Math.random() * 4 - 2, 2, Math.random() * 4 - 2],
        color: Math.random() * 0xffffff
    });
    editor.updateHierarchy();
}

function deleteSelected() {
    if (editor.selectedObject) {
        editor.deleteObject(editor.selectedObject.userData.id);
    }
}

function setGizmo(mode) {
    editor.gizmoMode = mode;
    document.querySelectorAll('.viewport-overlay .btn').forEach((btn, i) => {
        btn.classList.toggle('btn-primary', 
            (mode === 'translate' && i === 0) ||
            (mode === 'rotate' && i === 1) ||
            (mode === 'scale' && i === 2)
        );
    });
}

function toggleSpace() {
    editor.isLocalSpace = !editor.isLocalSpace;
    document.getElementById('gizmo-local').classList.toggle('active');
}

function focusSelected() {
    if (editor.selectedObject) {
        editor.camera.lookAt(editor.selectedObject.position);
    }
}

function playGame() {
    document.getElementById('playOverlay').classList.add('active');
    editor.isPlaying = true;
    console.log('Starting game with scene:', editor.exportScene());
}

function pauseGame() {
    editor.isPlaying = false;
}

function stopGame() {
    document.getElementById('playOverlay').classList.remove('active');
    editor.isPlaying = false;
}

function toggleEventSheet() {
    document.getElementById('eventSheet').classList.toggle('active');
}

function toggleAssets() {
    document.getElementById('assetModal').classList.toggle('active');
}

function addEvent() {
    console.log('Adding new event...');
}

function addComponent() {
    console.log('Adding component...');
}

function exportGame() {
    const data = editor.exportScene();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'game-scene.json';
    a.click();
}

function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
}

function fileMenu() { alert('File Menu: New, Open, Save, Export'); }
function editMenu() { alert('Edit Menu: Undo, Redo, Cut, Copy, Paste'); }
function viewMenu() { alert('View Menu: Grid, Gizmos, Stats, Fullscreen'); }

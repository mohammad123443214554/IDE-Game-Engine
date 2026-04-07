// ═══════════════════════════════════════════════════════════════
// NEXUS RUNTIME - Executes games created in the editor
// ═══════════════════════════════════════════════════════════════

class NexusRuntime {
    constructor(canvas, sceneData) {
        this.canvas = canvas;
        this.sceneData = sceneData;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.objects = new Map();
        this.events = [];
        this.keys = {};
        this.isRunning = false;
        
        this.init();
    }

    init() {
        // Three.js setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        
        this.camera = new THREE.PerspectiveCamera(75, 
            this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 1000);
        
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.shadowMap.enabled = true;

        // Build scene from data
        this.buildScene();
        this.setupEvents();
    }

    buildScene() {
        // Add lights
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        // Build objects
        this.sceneData.objects?.forEach(objData => {
            this.createRuntimeObject(objData);
        });

        // Setup events
        this.events = this.sceneData.events || [];
    }

    createRuntimeObject(data) {
        let geometry, material;
        
        material = new THREE.MeshStandardMaterial({ color: 0x58a6ff });
        
        switch(data.type) {
            case 'box':
                geometry = new THREE.BoxGeometry(1, 1, 1);
                break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(0.5, 32, 16);
                break;
            case 'capsule':
                geometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
                break;
            default:
                geometry = new THREE.BoxGeometry(1, 1, 1);
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.fromArray(data.position);
        mesh.rotation.fromArray(data.rotation);
        mesh.scale.fromArray(data.scale);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        mesh.userData = { 
            name: data.name,
            components: data.components,
            velocity: new THREE.Vector3(),
            isGrounded: false
        };

        // Add physics if Rigidbody component exists
        if (data.components.includes('Rigidbody')) {
            mesh.userData.hasPhysics = true;
            mesh.userData.mass = 1;
        }

        // Add player controller
        if (data.name === 'player') {
            this.player = mesh;
            this.camera.position.set(0, 5, 10);
            this.camera.lookAt(mesh.position);
        }

        this.scene.add(mesh);
        this.objects.set(data.name, mesh);
    }

    setupEvents() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            this.checkEventTriggers('keydown', e.code);
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    checkEventTriggers(type, key) {
        this.events.forEach(event => {
            event.conditions.forEach(condition => {
                if (condition.type === 'keyboard' && 
                    condition.key === key && 
                    condition.trigger === type) {
                    this.executeActions(event.actions);
                }
            });
        });
    }

    executeActions(actions) {
        actions.forEach(action => {
            switch(action.type) {
                case 'jump':
                    if (this.player && this.player.userData.isGrounded) {
                        this.player.userData.velocity.y = 10;
                        this.player.userData.isGrounded = false;
                    }
                    break;
                case 'move':
                    if (this.player) {
                        const speed = 5;
                        const dir = new THREE.Vector3(action.x, 0, action.z).normalize();
                        this.player.userData.velocity.x = dir.x * speed;
                        this.player.userData.velocity.z = dir.z * speed;
                    }
                    break;
            }
        });
    }

    update(delta) {
        // Physics update
        this.objects.forEach(obj => {
            if (obj.userData.hasPhysics) {
                // Gravity
                if (!obj.userData.isGrounded) {
                    obj.userData.velocity.y -= 20 * delta;
                }

                // Apply velocity
                obj.position.x += obj.userData.velocity.x * delta;
                obj.position.y += obj.userData.velocity.y * delta;
                obj.position.z += obj.userData.velocity.z * delta;

                // Ground collision
                if (obj.position.y < 0.5) {
                    obj.position.y = 0.5;
                    obj.userData.velocity.y = 0;
                    obj.userData.isGrounded = true;
                }

                // Damping
                obj.userData.velocity.x *= 0.9;
                obj.userData.velocity.z *= 0.9;
            }
        });

        // Player input
        if (this.player) {
            if (this.keys['KeyW'] || this.keys['ArrowUp']) {
                this.player.position.z -= 5 * delta;
            }
            if (this.keys['KeyS'] || this.keys['ArrowDown']) {
                this.player.position.z += 5 * delta;
            }
            if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
                this.player.position.x -= 5 * delta;
            }
            if (this.keys['KeyD'] || this.keys['ArrowRight']) {
                this.player.position.x += 5 * delta;
            }
            if (this.keys['Space']) {
                if (this.player.userData.isGrounded) {
                    this.player.userData.velocity.y = 10;
                    this.player.userData.isGrounded = false;
                }
            }

            // Camera follow
            this.camera.position.x = this.player.position.x;
            this.camera.position.z = this.player.position.z + 10;
            this.camera.lookAt(this.player.position);
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    start() {
        this.isRunning = true;
        const clock = new THREE.Clock();
        
        const loop = () => {
            if (!this.isRunning) return;
            
            const delta = clock.getDelta();
            this.update(delta);
            this.render();
            requestAnimationFrame(loop);
        };
        
        loop();
    }

    stop() {
        this.isRunning = false;
    }
}

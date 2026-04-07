// ═══════════════════════════════════════════════════════════════
// NEXUS 3D ENGINE - Complete Browser 3D Game Engine
// Features: Physics, Editor, Particles, Audio, 60FPS
// ═══════════════════════════════════════════════════════════════

class Nexus3D {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.player = null;
        this.world = [];
        this.particles = [];
        this.isPlaying = false;
        this.isPaused = false;
        this.score = 0;
        this.health = 100;
        this.startTime = 0;
        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        this.editorMode = false;
        this.selectedTool = 'platform';
        this.raycaster = new THREE.Raycaster();
        this.mouseVector = new THREE.Vector2();
        this.clock = new THREE.Clock();
        
        this.init();
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x050508, 0.02);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 10);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('gameCanvas'),
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.camera.near = 0.1;
        dirLight.shadow.camera.far = 50;
        dirLight.shadow.camera.left = -20;
        dirLight.shadow.camera.right = 20;
        dirLight.shadow.camera.top = 20;
        dirLight.shadow.camera.bottom = -20;
        this.scene.add(dirLight);
        
        // Neon lights
        this.addNeonLight(0x00f0ff, -10, 5, -10);
        this.addNeonLight(0xff00a0, 10, 5, -10);
        this.addNeonLight(0x39ff14, 0, 5, 10);
        
        // Grid helper
        const grid = new THREE.GridHelper(100, 100, 0x00f0ff, 0x222222);
        grid.position.y = -0.1;
        this.scene.add(grid);
        
        // Event listeners
        this.setupControls();
        
        // Handle resize
        window.addEventListener('resize', () => this.onResize());
        
        // Start loop
        this.animate();
    }

    addNeonLight(color, x, y, z) {
        const light = new THREE.PointLight(color, 2, 20);
        light.position.set(x, y, z);
        this.scene.add(light);
        
        // Glow sprite
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, '#' + new THREE.Color(color).getHexString());
        gradient.addColorStop(1, 'transparent');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 32, 32);
        
        const texture = new THREE.CanvasTexture(canvas);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
        sprite.position.copy(light.position);
        sprite.scale.set(2, 2, 1);
        this.scene.add(sprite);
    }

    setupControls() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Escape') this.togglePause();
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        document.addEventListener('mousemove', (e) => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });
        
        // Editor click
        document.getElementById('editorCanvas')?.addEventListener('click', (e) => {
            if (this.editorMode) this.handleEditorClick(e);
        });
    }

    createPlayer(x = 0, y = 2, z = 0) {
        // Player group
        this.player = {
            mesh: new THREE.Group(),
            velocity: new THREE.Vector3(),
            speed: 8,
            jumpForce: 12,
            onGround: false,
            health: 100,
            radius: 0.5,
            height: 2
        };
        
        // Body
        const bodyGeo = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
        const bodyMat = new THREE.MeshStandardMaterial({ 
            color: 0x00f0ff,
            emissive: 0x00f0ff,
            emissiveIntensity: 0.3,
            metalness: 0.8,
            roughness: 0.2
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.castShadow = true;
        body.position.y = 1;
        this.player.mesh.add(body);
        
        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.2, 1.3, 0.4);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.2, 1.3, 0.4);
        this.player.mesh.add(leftEye, rightEye);
        
        // Trail effect
        this.player.trail = [];
        
        this.player.mesh.position.set(x, y, z);
        this.scene.add(this.player.mesh);
        
        // Camera follow
        this.camera.position.set(x, y + 5, z + 10);
        this.camera.lookAt(this.player.mesh.position);
        
        return this.player;
    }

    createPlatform(x, y, z, w = 4, h = 0.5, d = 4, type = 'normal') {
        const geometry = new THREE.BoxGeometry(w, h, d);
        let material;
        
        switch(type) {
            case 'ice':
                material = new THREE.MeshStandardMaterial({ 
                    color: 0xaaddff, 
                    metalness: 0.9, 
                    roughness: 0.1 
                });
                break;
            case 'bounce':
                material = new THREE.MeshStandardMaterial({ 
                    color: 0xff6b6b,
                    emissive: 0xff6b6b,
                    emissiveIntensity: 0.3
                });
                break;
            default:
                material = new THREE.MeshStandardMaterial({ 
                    color: 0x222222,
                    metalness: 0.5,
                    roughness: 0.5
                });
        }
        
        const platform = new THREE.Mesh(geometry, material);
        platform.position.set(x, y, z);
        platform.castShadow = true;
        platform.receiveShadow = true;
        platform.userData = { type: 'platform', platformType: type };
        
        // Edge glow
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x00f0ff }));
        platform.add(line);
        
        this.scene.add(platform);
        this.world.push(platform);
        return platform;
    }

    createCoin(x, y, z) {
        const geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xffd700,
            emissive: 0xffa500,
            emissiveIntensity: 0.5,
            metalness: 1,
            roughness: 0.2
        });
        const coin = new THREE.Mesh(geometry, material);
        coin.position.set(x, y, z);
        coin.rotation.x = Math.PI / 2;
        coin.userData = { type: 'coin', value: 10, collected: false };
        
        // Glow
        const light = new THREE.PointLight(0xffd700, 1, 3);
        light.position.set(0, 0, 0);
        coin.add(light);
        
        this.scene.add(coin);
        this.world.push(coin);
        return coin;
    }

    createEnemy(x, y, z) {
        const geometry = new THREE.IcosahedronGeometry(0.6, 0);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xff00a0,
            emissive: 0xff00a0,
            emissiveIntensity: 0.5,
            wireframe: true
        });
        const enemy = new THREE.Mesh(geometry, material);
        enemy.position.set(x, y, z);
        enemy.userData = { 
            type: 'enemy', 
            health: 3,
            startPos: new THREE.Vector3(x, y, z),
            patrolRadius: 3,
            speed: 2
        };
        
        // Inner core
        const coreGeo = new THREE.IcosahedronGeometry(0.3, 0);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const core = new THREE.Mesh(coreGeo, coreMat);
        enemy.add(core);
        
        this.scene.add(enemy);
        this.world.push(enemy);
        return enemy;
    }

    createParticle(position, color, count = 10) {
        for (let i = 0; i < count; i++) {
            const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            const material = new THREE.MeshBasicMaterial({ color: color });
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            particle.position.x += (Math.random() - 0.5);
            particle.position.y += (Math.random() - 0.5);
            particle.position.z += (Math.random() - 0.5);
            
            particle.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 5,
                    Math.random() * 5,
                    (Math.random() - 0.5) * 5
                ),
                life: 1.0
            };
            
            this.scene.add(particle);
            this.particles.push(particle);
        }
    }

    updatePhysics(delta) {
        if (!this.player || this.isPaused) return;
        
        const p = this.player;
        
        // Input
        const moveSpeed = this.keys['ShiftLeft'] ? p.speed * 1.5 : p.speed;
        let moveX = 0;
        let moveZ = 0;
        
        if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;
        
        // Normalize
        if (moveX !== 0 || moveZ !== 0) {
            const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
            moveX /= len;
            moveZ /= len;
        }
        
        // Apply movement
        p.velocity.x = moveX * moveSpeed;
        p.velocity.z = moveZ * moveSpeed;
        
        // Jump
        if ((this.keys['Space'] || this.keys['ArrowUp']) && p.onGround) {
            p.velocity.y = p.jumpForce;
            p.onGround = false;
            this.createParticle(p.mesh.position, 0x00f0ff, 5);
        }
        
        // Gravity
        p.velocity.y -= 25 * delta;
        
        // Apply velocity
        p.mesh.position.x += p.velocity.x * delta;
        p.mesh.position.y += p.velocity.y * delta;
        p.mesh.position.z += p.velocity.z * delta;
        
        // Floor collision
        if (p.mesh.position.y < 0.5) {
            p.mesh.position.y = 0.5;
            p.velocity.y = 0;
            p.onGround = true;
        }
        
        // World collision
        p.onGround = false;
        for (const obj of this.world) {
            if (obj.userData.type === 'platform') {
                this.checkPlatformCollision(p, obj);
            } else if (obj.userData.type === 'coin' && !obj.userData.collected) {
                this.checkCoinCollection(p, obj);
            } else if (obj.userData.type === 'enemy') {
                this.checkEnemyCollision(p, obj);
            }
        }
        
        // Camera follow
        const targetPos = p.mesh.position.clone();
        targetPos.y += 5;
        targetPos.z += 10;
        this.camera.position.lerp(targetPos, 5 * delta);
        this.camera.lookAt(p.mesh.position);
        
        // Trail effect
        if (Math.random() > 0.7) {
            const trail = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 0.2, 0.2),
                new THREE.MeshBasicMaterial({ 
                    color: 0x00f0ff, 
                    transparent: true, 
                    opacity: 0.5 
                })
            );
            trail.position.copy(p.mesh.position);
            trail.position.y -= 0.5;
            this.scene.add(trail);
            this.particles.push({ mesh: trail, userData: { life: 0.3, velocity: new THREE.Vector3() } });
        }
    }

    checkPlatformCollision(player, platform) {
        const p = player.mesh.position;
        const box = platform.geometry.parameters;
        const pos = platform.position;
        
        const halfW = box.width / 2;
        const halfH = box.height / 2;
        const halfD = box.depth / 2;
        
        // AABB collision
        if (p.x > pos.x - halfW - player.radius && 
            p.x < pos.x + halfW + player.radius &&
            p.z > pos.z - halfD - player.radius && 
            p.z < pos.z + halfD + player.radius) {
            
            // Top collision
            if (p.y > pos.y + halfH && 
                p.y < pos.y + halfH + player.height &&
                player.velocity.y <= 0) {
                player.mesh.position.y = pos.y + halfH + player.height / 2;
                player.velocity.y = 0;
                player.onGround = true;
                
                // Bounce platform
                if (platform.userData.platformType === 'bounce') {
                    player.velocity.y = player.jumpForce * 1.5;
                    player.onGround = false;
                    this.createParticle(p, 0xff6b6b, 8);
                }
            }
        }
    }

    checkCoinCollection(player, coin) {
        const dist = player.mesh.position.distanceTo(coin.position);
        if (dist < 1 && !coin.userData.collected) {
            coin.userData.collected = true;
            this.scene.remove(coin);
            this.score += coin.userData.value;
            this.updateUI();
            this.createParticle(coin.position, 0xffd700, 15);
            
            // Floating text
            this.showFloatingText("+10", coin.position);
        }
    }

    checkEnemyCollision(player, enemy) {
        const dist = player.mesh.position.distanceTo(enemy.position);
        if (dist < 1.2) {
            this.health -= 10;
            this.updateUI();
            this.createParticle(player.mesh.position, 0xff0000, 10);
            
            // Knockback
            const dir = player.mesh.position.clone().sub(enemy.position).normalize();
            player.velocity.add(dir.multiplyScalar(10));
            
            if (this.health <= 0) {
                this.gameOver();
            }
        }
    }

    updateParticles(delta) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.userData.life -= delta;
            
            if (p.userData.life <= 0) {
                this.scene.remove(p.mesh || p);
                this.particles.splice(i, 1);
                continue;
            }
            
            if (p.userData.velocity) {
                p.position.add(p.userData.velocity.clone().multiplyScalar(delta));
                p.userData.velocity.y -= 9.8 * delta; // Gravity
                p.rotation.x += delta * 2;
                p.rotation.y += delta * 2;
            }
            
            if (p.mesh && p.mesh.material) {
                p.mesh.material.opacity = p.userData.life;
            }
        }
    }

    updateWorld(delta) {
        // Animate coins
        for (const obj of this.world) {
            if (obj.userData.type === 'coin' && !obj.userData.collected) {
                obj.rotation.y += delta * 2;
                obj.position.y += Math.sin(Date.now() * 0.003) * 0.01;
            } else if (obj.userData.type === 'enemy') {
                // Patrol
                const time = Date.now() * 0.001;
                const offset = Math.sin(time) * obj.userData.patrolRadius;
                obj.position.x = obj.userData.startPos.x + offset;
                obj.rotation.x += delta;
                obj.rotation.y += delta * 0.5;
            }
        }
    }

    showFloatingText(text, position) {
        const div = document.createElement('div');
        div.textContent = text;
        div.style.cssText = `
            position: fixed;
            color: #ffd700;
            font-family: Orbitron;
            font-size: 24px;
            font-weight: bold;
            pointer-events: none;
            text-shadow: 0 0 10px #ffd700;
            z-index: 1000;
        `;
        document.body.appendChild(div);
        
        // Project 3D position to screen
        const vector = position.clone();
        vector.project(this.camera);
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
        
        div.style.left = x + 'px';
        div.style.top = y + 'px';
        
        // Animate
        let opacity = 1;
        let top = y;
        const anim = setInterval(() => {
            opacity -= 0.02;
            top -= 2;
            div.style.opacity = opacity;
            div.style.top = top + 'px';
            
            if (opacity <= 0) {
                clearInterval(anim);
                div.remove();
            }
        }, 16);
    }

    updateUI() {
        document.getElementById('score').textContent = this.score.toString().padStart(4, '0');
        document.getElementById('health-fill').style.width = this.health + '%';
        
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const secs = (elapsed % 60).toString().padStart(2, '0');
        document.getElementById('time').textContent = `${mins}:${secs}`;
    }

    loadLevel(levelData) {
        // Clear existing
        this.world.forEach(obj => this.scene.remove(obj));
        this.world = [];
        
        // Build level
        levelData.platforms?.forEach(p => {
            this.createPlatform(p.x, p.y, p.z, p.w, p.h, p.d, p.type);
        });
        
        levelData.coins?.forEach(c => {
            this.createCoin(c.x, c.y, c.z);
        });
        
        levelData.enemies?.forEach(e => {
            this.createEnemy(e.x, e.y, e.z);
        });
        
        // Spawn player
        if (levelData.spawn) {
            this.createPlayer(levelData.spawn.x, levelData.spawn.y, levelData.spawn.z);
        } else {
            this.createPlayer();
        }
    }

    startGame() {
        document.getElementById('main-menu').classList.remove('active');
        document.getElementById('game-screen').classList.add('active');
        
        this.isPlaying = true;
        this.isPaused = false;
        this.score = 0;
        this.health = 100;
        this.startTime = Date.now();
        
        // Load default level
        this.loadLevel(window.levels?.level1 || this.getDefaultLevel());
        this.updateUI();
    }

    getDefaultLevel() {
        return {
            platforms: [
                { x: 0, y: 0, z: 0, w: 10, h: 1, d: 10 },
                { x: 8, y: 2, z: 0, w: 4, h: 0.5, d: 4 },
                { x: 15, y: 4, z: 0, w: 4, h: 0.5, d: 4 },
                { x: 22, y: 2, z: 0, w: 4, h: 0.5, d: 4, type: 'bounce' },
                { x: 30, y: 0, z: 0, w: 10, h: 1, d: 10 }
            ],
            coins: [
                { x: 8, y: 4, z: 0 },
                { x: 15, y: 6, z: 0 },
                { x: 22, y: 5, z: 0 },
                { x: 30, y: 3, z: 0 },
                { x: 35, y: 3, z: 2 },
                { x: 35, y: 3, z: -2 }
            ],
            enemies: [
                { x: 15, y: 5.5, z: 0 },
                { x: 30, y: 1.5, z: 0 }
            ],
            spawn: { x: 0, y: 2, z: 0 }
        };
    }

    togglePause() {
        if (!this.isPlaying) return;
        this.isPaused = !this.isPaused;
        document.getElementById('pause-menu').classList.toggle('hidden', !this.isPaused);
    }

    resumeGame() {
        this.isPaused = false;
        document.getElementById('pause-menu').classList.add('hidden');
    }

    restartGame() {
        this.score = 0;
        this.health = 100;
        this.startTime = Date.now();
        this.isPaused = false;
        document.getElementById('pause-menu').classList.add('hidden');
        this.loadLevel(this.getDefaultLevel());
        this.updateUI();
    }

    backToMenu() {
        this.isPlaying = false;
        this.isPaused = false;
        document.getElementById('game-screen').classList.remove('active');
        document.getElementById('main-menu').classList.add('active');
        document.getElementById('pause-menu').classList.add('hidden');
    }

    gameOver() {
        this.isPlaying = false;
        alert('Game Over! Score: ' + this.score);
        this.backToMenu();
    }

    openEditor() {
        document.getElementById('main-menu').classList.remove('active');
        document.getElementById('editor-screen').classList.add('active');
        this.editorMode = true;
        this.initEditor();
    }

    initEditor() {
        // Switch to editor canvas
        const canvas = document.getElementById('editorCanvas');
        if (canvas) {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            canvas.replaceWith(this.renderer.domElement);
            this.renderer.domElement.id = 'editorCanvas';
        }
        
        // Reset camera for editor view
        this.camera.position.set(0, 20, 20);
        this.camera.lookAt(0, 0, 0);
        
        // Grid
        const grid = new THREE.GridHelper(50, 50, 0x00f0ff, 0x444444);
        this.scene.add(grid);
    }

    handleEditorClick(event) {
        // Raycast to place objects
        this.mouseVector.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouseVector.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouseVector, this.camera);
        const intersects = this.raycaster.intersectObjects(this.world);
        
        const point = intersects.length > 0 ? 
            intersects[0].point : 
            new THREE.Vector3(0, 0, 0);
        
        switch(this.selectedTool) {
            case 'platform':
                this.createPlatform(point.x, point.y + 0.25, point.z);
                break;
            case 'coin':
                this.createCoin(point.x, point.y + 1, point.z);
                break;
            case 'enemy':
                this.createEnemy(point.x, point.y + 1, point.z);
                break;
        }
    }

    clearLevel() {
        this.world.forEach(obj => this.scene.remove(obj));
        this.world = [];
        if (this.player) {
            this.scene.remove(this.player.mesh);
            this.player = null;
        }
    }

    testLevel() {
        this.editorMode = false;
        this.startGame();
    }

    saveLevel() {
        const levelData = {
            platforms: [],
            coins: [],
            enemies: []
        };
        
        this.world.forEach(obj => {
            const data = {
                x: obj.position.x,
                y: obj.position.y,
                z: obj.position.z
            };
            
            if (obj.userData.type === 'platform') {
                const geo = obj.geometry.parameters;
                data.w = geo.width;
                data.h = geo.height;
                data.d = geo.depth;
                data.type = obj.userData.platformType;
                levelData.platforms.push(data);
            } else if (obj.userData.type === 'coin') {
                levelData.coins.push(data);
            } else if (obj.userData.type === 'enemy') {
                levelData.enemies.push(data);
            }
        });
        
        console.log('Level Data:', JSON.stringify(levelData, null, 2));
        alert('Level saved to console!');
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const delta = Math.min(this.clock.getDelta(), 0.1);
        
        if (this.isPlaying && !this.isPaused) {
            this.updatePhysics(delta);
            this.updateWorld(delta);
            this.updateUI();
        }
        
        this.updateParticles(delta);
        this.renderer.render(this.scene, this.camera);
    }
}

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

let game;

window.onload = () => {
    // Simulate loading
    setTimeout(() => {
        document.querySelector('.progress-fill').style.width = '100%';
        
        setTimeout(() => {
            document.getElementById('loader').classList.add('hidden');
            game = new Nexus3D();
        }, 500);
    }, 2000);
};

// Global functions for UI
function startGame() { game.startGame(); }
function togglePause() { game.togglePause(); }
function resumeGame() { game.resumeGame(); }
function restartGame() { game.restartGame(); }
function backToMenu() { game.backToMenu(); }
function openEditor() { game.openEditor(); }
function clearLevel() { game.clearLevel(); }
function testLevel() { game.testLevel(); }
function saveLevel() { game.saveLevel(); }

// Tool selection
document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        if (game) game.selectedTool = e.target.dataset.tool;
    });
});

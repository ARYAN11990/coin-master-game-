// ===== SECTION 1: CONSTANTS & CONFIGURATION =====
const CONFIG = {
    LANE_WIDTH: 2.5,
    LANE_POSITIONS: [-2.5, 0, 2.5],
    TRACK_WIDTH: 10,
    VISIBLE_DISTANCE: 120,
    GROUND_Y: 0,
    PLAYER_HEIGHT: 1.8,
    CAMERA_HEIGHT: 6,
    CAMERA_DISTANCE: 10,
    CAMERA_FOV: 70,
    
    BASE_SPEED: 18,
    MAX_SPEED: 40,
    ACCELERATION: 0.3,
    
    JUMP_HEIGHT: 3.2,
    JUMP_DURATION: 550,
    SLIDE_DURATION: 500,
    LANE_SWITCH_DURATION: 150,
    
    COIN_RADIUS: 0.35,
    COIN_SPIN_SPEED: 180,
    
    OBSTACLE_MIN_GAP: 15,
    OBSTACLE_MAX_GAP: 35
};

const COLORS = {
    SKY_TOP: '#87CEEB',
    SKY_BOTTOM: '#E0F4FF',
    GROUND: '#8B7355',
    RAIL: '#708090',
    TIE: '#654321',
    GRAFFITI: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA'],
    WALL: ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6'],
    TRAIN: '#2C3E50',
    TRAIN_STRIPE: '#E74C3C',
    COIN: '#FFD700',
    COIN_EDGE: '#FFA500'
};

// ===== SECTION 2: UTILITY FUNCTIONS =====
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeInCubic = t => t * t * t;
const easeOutQuad = t => 1 - (1 - t) * (1 - t);
const easeInQuad = t => t * t;
const randomRange = (min, max) => Math.random() * (max - min) + min;
const randomChoice = arr => arr[Math.floor(Math.random() * arr.length)];

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// ===== SECTION 3: 3D MATH & PROJECTION =====
class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    
    clone() {
        return new Vector3(this.x, this.y, this.z);
    }
    
    add(v) {
        return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
    }
    
    sub(v) {
        return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
    }
    
    scale(s) {
        return new Vector3(this.x * s, this.y * s, this.z * s);
    }
    
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    
    normalize() {
        const len = this.length();
        if (len === 0) return new Vector3();
        return this.scale(1 / len);
    }
}

class Camera {
    constructor() {
        this.position = new Vector3(0, CONFIG.CAMERA_HEIGHT, -CONFIG.CAMERA_DISTANCE);
        this.target = new Vector3(0, 1, 20);
        this.fov = CONFIG.CAMERA_FOV;
        this.shake = { x: 0, y: 0, intensity: 0 };
    }
    
    project(point, screenWidth, screenHeight) {
        const relativePos = point.sub(this.position);
        
        if (relativePos.z <= 0.1) return null;
        
        const fovRad = this.fov * Math.PI / 180;
        const aspect = screenWidth / screenHeight;
        const scale = 1 / Math.tan(fovRad / 2);
        
        const x = (relativePos.x * scale / relativePos.z) / aspect;
        const y = -(relativePos.y * scale / relativePos.z);
        
        const screenX = (x + 1) * screenWidth / 2 + this.shake.x;
        const screenY = (y + 1) * screenHeight / 2 + this.shake.y;
        
        return {
            x: screenX,
            y: screenY,
            z: relativePos.z,
            scale: scale / relativePos.z
        };
    }
    
    updateShake(dt) {
        if (this.shake.intensity > 0) {
            this.shake.x = (Math.random() - 0.5) * this.shake.intensity * 20;
            this.shake.y = (Math.random() - 0.5) * this.shake.intensity * 20;
            this.shake.intensity *= 0.9;
            if (this.shake.intensity < 0.01) this.shake.intensity = 0;
        }
    }
    
    addShake(intensity) {
        this.shake.intensity = Math.min(1, this.shake.intensity + intensity);
    }
}

// ===== SECTION 4: RENDERER CLASS =====
class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }
    
    clear() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, COLORS.SKY_TOP);
        gradient.addColorStop(1, COLORS.SKY_BOTTOM);
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
    
    drawQuad(p1, p2, p3, p4, color) {
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.lineTo(p3.x, p3.y);
        this.ctx.lineTo(p4.x, p4.y);
        this.ctx.closePath();
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }
    
    drawLine(p1, p2, color, width = 1) {
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.stroke();
    }
    
    drawCircle(x, y, radius, color) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }
    
    drawEllipse(x, y, radiusX, radiusY, color) {
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }
}

// ===== SECTION 5: PLAYER CLASS =====
class Player {
    constructor() {
        this.lane = 1;
        this.targetLane = 1;
        this.x = 0;
        this.y = 0;
        this.z = 0;
        
        this.state = 'RUNNING';
        this.stateTime = 0;
        this.animTime = 0;
        
        this.laneChangeStart = 0;
        this.laneChangeFrom = 0;
        this.jumpStartY = 0;
        
        this.speed = CONFIG.BASE_SPEED;
        
        this.colors = {
            skin: '#F4C7A1',
            shirt: '#4A90D9',
            pants: '#2C3E50',
            shoes: '#E74C3C',
            hair: '#5D4E37'
        };
    }
    
    update(dt) {
        this.animTime += dt * 1000;
        this.stateTime += dt * 1000;
        
        // Lane changing
        if (this.state === 'LANE_CHANGE' || this.lane !== this.targetLane) {
            const progress = Math.min(1, this.stateTime / CONFIG.LANE_SWITCH_DURATION);
            const eased = easeOutCubic(progress);
            this.x = lerp(
                CONFIG.LANE_POSITIONS[this.laneChangeFrom],
                CONFIG.LANE_POSITIONS[this.targetLane],
                eased
            );
            
            if (progress >= 1) {
                this.lane = this.targetLane;
                this.x = CONFIG.LANE_POSITIONS[this.lane];
                if (this.state === 'LANE_CHANGE') {
                    this.setState('RUNNING');
                }
            }
        } else {
            this.x = CONFIG.LANE_POSITIONS[this.lane];
        }
        
        // Jumping
        if (this.state === 'JUMPING') {
            const progress = this.stateTime / CONFIG.JUMP_DURATION;
            if (progress < 0.45) {
                const t = progress / 0.45;
                this.y = this.jumpStartY + CONFIG.JUMP_HEIGHT * easeOutQuad(t);
            } else if (progress < 1) {
                const t = (progress - 0.45) / 0.55;
                this.y = this.jumpStartY + CONFIG.JUMP_HEIGHT * (1 - easeInQuad(t));
            } else {
                this.y = 0;
                this.setState('RUNNING');
            }
        }
        
        // Sliding
        if (this.state === 'SLIDING') {
            if (this.stateTime >= CONFIG.SLIDE_DURATION) {
                this.setState('RUNNING');
            }
        }
        
        // Speed increase
        if (this.speed < CONFIG.MAX_SPEED) {
            this.speed += CONFIG.ACCELERATION * dt;
        }
    }
    
    setState(newState) {
        this.state = newState;
        this.stateTime = 0;
        
        if (newState === 'JUMPING') {
            this.jumpStartY = this.y;
        }
    }
    
    jump() {
        if (this.state === 'RUNNING' || this.state === 'LANE_CHANGE') {
            this.setState('JUMPING');
        }
    }
    
    slide() {
        if (this.state === 'RUNNING' || this.state === 'LANE_CHANGE') {
            this.setState('SLIDING');
        }
    }
    
    moveLeft() {
        if (this.targetLane > 0) {
            this.laneChangeFrom = this.targetLane;
            this.targetLane--;
            if (this.state !== 'JUMPING' && this.state !== 'SLIDING') {
                this.setState('LANE_CHANGE');
            } else {
                this.stateTime = 0;
            }
        }
    }
    
    moveRight() {
        if (this.targetLane < 2) {
            this.laneChangeFrom = this.targetLane;
            this.targetLane++;
            if (this.state !== 'JUMPING' && this.state !== 'SLIDING') {
                this.setState('LANE_CHANGE');
            } else {
                this.stateTime = 0;
            }
        }
    }
    
    getHitbox() {
        const height = this.state === 'SLIDING' ? 0.8 : 1.6;
        const yOffset = this.state === 'SLIDING' ? 0.4 : 0.8;
        return {
            x: this.x - 0.4,
            y: this.y + yOffset - height / 2,
            z: this.z - 0.3,
            width: 0.8,
            height: height,
            depth: 0.6
        };
    }
    
    render(renderer, camera) {
        const basePos = new Vector3(this.x, this.y, this.z);
        
        // Animation calculations
        const runCycle = (this.animTime % 300) / 300;
        const bobHeight = Math.sin(runCycle * Math.PI * 2) * 0.08;
        const armSwing = Math.sin(runCycle * Math.PI * 2) * 0.3;
        const legSwing = Math.sin(runCycle * Math.PI * 2) * 0.4;
        
        if (this.state === 'SLIDING') {
            this.renderSliding(renderer, camera, basePos);
        } else if (this.state === 'JUMPING') {
            this.renderJumping(renderer, camera, basePos);
        } else {
            this.renderRunning(renderer, camera, basePos, bobHeight, armSwing, legSwing);
        }
    }
    
    renderRunning(renderer, camera, basePos, bob, armSwing, legSwing) {
        const scale = this.getScale(camera, basePos);
        if (!scale) return;
        
        // Legs
        const leftLegOffset = legSwing * 0.5;
        const rightLegOffset = -legSwing * 0.5;
        
        this.renderLimb(renderer, camera, 
            basePos.add(new Vector3(-0.15, 0.4 + bob, leftLegOffset * 0.3)),
            0.12, 0.45, this.colors.pants);
        this.renderLimb(renderer, camera,
            basePos.add(new Vector3(0.15, 0.4 + bob, rightLegOffset * 0.3)),
            0.12, 0.45, this.colors.pants);
        
        // Shoes
        this.renderLimb(renderer, camera,
            basePos.add(new Vector3(-0.15, 0.1, leftLegOffset * 0.5)),
            0.14, 0.12, this.colors.shoes);
        this.renderLimb(renderer, camera,
            basePos.add(new Vector3(0.15, 0.1, rightLegOffset * 0.5)),
            0.14, 0.12, this.colors.shoes);
        
        // Body
        this.renderLimb(renderer, camera,
            basePos.add(new Vector3(0, 1.0 + bob, 0)),
            0.28, 0.5, this.colors.shirt);
        
        // Arms
        this.renderLimb(renderer, camera,
            basePos.add(new Vector3(-0.35, 1.0 + bob, -armSwing * 0.4)),
            0.1, 0.4, this.colors.shirt);
        this.renderLimb(renderer, camera,
            basePos.add(new Vector3(0.35, 1.0 + bob, armSwing * 0.4)),
            0.1, 0.4, this.colors.shirt);
        
        // Hands
        this.renderCircle3D(renderer, camera,
            basePos.add(new Vector3(-0.35, 0.7 + bob, -armSwing * 0.5)),
            0.08, this.colors.skin);
        this.renderCircle3D(renderer, camera,
            basePos.add(new Vector3(0.35, 0.7 + bob, armSwing * 0.5)),
            0.08, this.colors.skin);
        
        // Head
        this.renderCircle3D(renderer, camera,
            basePos.add(new Vector3(0, 1.55 + bob * 0.5, 0)),
            0.25, this.colors.skin);
        
        // Hair
        this.renderCircle3D(renderer, camera,
            basePos.add(new Vector3(0, 1.7 + bob * 0.5, -0.05)),
            0.22, this.colors.hair);
    }
    
    renderJumping(renderer, camera, basePos) {
        const jumpProgress = this.stateTime / CONFIG.JUMP_DURATION;
        const tuck = Math.sin(jumpProgress * Math.PI) * 0.3;
        
        // Tucked legs
        this.renderLimb(renderer, camera,
            basePos.add(new Vector3(-0.15, 0.5 + tuck, 0.2)),
            0.12, 0.35, this.colors.pants);
        this.renderLimb(renderer, camera,
            basePos.add(new Vector3(0.15, 0.5 + tuck, 0.2)),
            0.12, 0.35, this.colors.pants);
        
        // Body
        this.renderLimb(renderer, camera,
            basePos.add(new Vector3(0, 1.0, 0)),
            0.28, 0.5, this.colors.shirt);
        
        // Arms spread
        this.renderLimb(renderer, camera,
            basePos.add(new Vector3(-0.45, 1.1, 0)),
            0.1, 0.35, this.colors.shirt);
        this.renderLimb(renderer, camera,
            basePos.add(new Vector3(0.45, 1.1, 0)),
            0.1, 0.35, this.colors.shirt);
        
        // Head
        this.renderCircle3D(renderer, camera,
            basePos.add(new Vector3(0, 1.55, 0)),
            0.25, this.colors.skin);
        this.renderCircle3D(renderer, camera,
            basePos.add(new Vector3(0, 1.7, -0.05)),
            0.22, this.colors.hair);
    }
    
    renderSliding(renderer, camera, basePos) {
        // Sliding pose - low and extended
        const slideY = 0.35;
        
        // Extended leg
        this.renderLimb(renderer, camera,
            basePos.add(new Vector3(0, slideY, 0.4)),
            0.15, 0.6, this.colors.pants);
        
        // Bent leg
        this.renderLimb(renderer, camera,
            basePos.add(new Vector3(-0.2, slideY + 0.15, -0.1)),
            0.12, 0.35, this.colors.pants);
        
        // Body leaning back
        this.renderLimb(renderer, camera,
            basePos.add(new Vector3(0, slideY + 0.3, -0.2)),
            0.28, 0.45, this.colors.shirt);
        
        // Arms back for balance
        this.renderLimb(renderer, camera,
            basePos.add(new Vector3(-0.3, slideY + 0.35, -0.3)),
            0.1, 0.3, this.colors.shirt);
        this.renderLimb(renderer, camera,
            basePos.add(new Vector3(0.3, slideY + 0.35, -0.3)),
            0.1, 0.3, this.colors.shirt);
        
        // Head
        this.renderCircle3D(renderer, camera,
            basePos.add(new Vector3(0, slideY + 0.65, -0.25)),
            0.23, this.colors.skin);
        this.renderCircle3D(renderer, camera,
            basePos.add(new Vector3(0, slideY + 0.78, -0.28)),
            0.2, this.colors.hair);
    }
    
    renderLimb(renderer, camera, pos, width, height, color) {
        const proj = camera.project(pos, renderer.width, renderer.height);
        if (!proj || proj.z <= 0) return;
        
        const w = width * proj.scale * renderer.height;
        const h = height * proj.scale * renderer.height;
        
        renderer.ctx.fillStyle = color;
        renderer.ctx.beginPath();
        renderer.ctx.roundRect(proj.x - w/2, proj.y - h/2, w, h, w/3);
        renderer.ctx.fill();
        
        // Outline
        renderer.ctx.strokeStyle = this.darkenColor(color, 30);
        renderer.ctx.lineWidth = 2;
        renderer.ctx.stroke();
    }
    
    renderCircle3D(renderer, camera, pos, radius, color) {
        const proj = camera.project(pos, renderer.width, renderer.height);
        if (!proj || proj.z <= 0) return;
        
        const r = radius * proj.scale * renderer.height;
        
        renderer.ctx.fillStyle = color;
        renderer.ctx.beginPath();
        renderer.ctx.arc(proj.x, proj.y, r, 0, Math.PI * 2);
        renderer.ctx.fill();
        
        renderer.ctx.strokeStyle = this.darkenColor(color, 30);
        renderer.ctx.lineWidth = 2;
        renderer.ctx.stroke();
    }
    
    getScale(camera, pos) {
        const proj = camera.project(pos, 1, 1);
        return proj ? proj.scale : null;
    }
    
    darkenColor(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - amount);
        const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - amount);
        const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - amount);
        return `rgb(${r},${g},${b})`;
    }
}

// ===== SECTION 6: TRACK SYSTEM =====
class TrackSystem {
    constructor() {
        this.offset = 0;
        this.segments = [];
        this.decorations = [];
        
        this.generateInitialTrack();
    }
    
    generateInitialTrack() {
        for (let i = 0; i < 5; i++) {
            this.segments.push(this.createSegment(i * 30));
        }
        
        for (let i = 0; i < 20; i++) {
            this.decorations.push(this.createDecoration(i * 15));
        }
    }
    
    createSegment(z) {
        return {
            z: z,
            leftWallColor: randomChoice(COLORS.WALL),
            rightWallColor: randomChoice(COLORS.WALL),
            graffitiColor: randomChoice(COLORS.GRAFFITI),
            hasGraffiti: Math.random() > 0.5
        };
    }
    
    createDecoration(z) {
        return {
            z: z,
            side: Math.random() > 0.5 ? 1 : -1,
            type: randomChoice(['building', 'warehouse', 'fence']),
            height: randomRange(5, 15),
            color: randomChoice(COLORS.WALL)
        };
    }
    
    update(dt, speed) {
        this.offset += speed * dt;
        
        // Recycle segments
        this.segments = this.segments.filter(s => s.z - this.offset > -30);
        while (this.segments.length < 5) {
            const lastZ = this.segments.length > 0 
                ? this.segments[this.segments.length - 1].z 
                : this.offset;
            this.segments.push(this.createSegment(lastZ + 30));
        }
        
        // Recycle decorations
        this.decorations = this.decorations.filter(d => d.z - this.offset > -20);
        while (this.decorations.length < 20) {
            const lastZ = this.decorations.length > 0
                ? this.decorations[this.decorations.length - 1].z
                : this.offset;
            this.decorations.push(this.createDecoration(lastZ + 15));
        }
    }
    
    render(renderer, camera) {
        // Render ground
        this.renderGround(renderer, camera);
        
        // Render rails
        this.renderRails(renderer, camera);
        
        // Render decorations (sorted by distance)
        this.decorations.sort((a, b) => b.z - a.z);
        this.decorations.forEach(d => this.renderDecoration(renderer, camera, d));
        
        // Render walls
        this.segments.forEach(s => this.renderWalls(renderer, camera, s));
    }
    
    renderGround(renderer, camera) {
        const groundWidth = 8;
        const near = this.offset - 5;
        const far = this.offset + CONFIG.VISIBLE_DISTANCE;
        
        for (let z = near; z < far; z += 3) {
            const relZ = z - this.offset;
            
            const p1 = camera.project(new Vector3(-groundWidth, 0, relZ), renderer.width, renderer.height);
            const p2 = camera.project(new Vector3(groundWidth, 0, relZ), renderer.width, renderer.height);
            const p3 = camera.project(new Vector3(groundWidth, 0, relZ + 3), renderer.width, renderer.height);
            const p4 = camera.project(new Vector3(-groundWidth, 0, relZ + 3), renderer.width, renderer.height);
            
            if (p1 && p2 && p3 && p4 && p1.z > 0) {
                const shade = Math.floor(z / 3) % 2 === 0 ? COLORS.GROUND : '#7A6449';
                renderer.drawQuad(p1, p2, p3, p4, shade);
            }
        }
        
        // Draw track ties
        for (let z = near; z < far; z += 1.5) {
            const relZ = z - this.offset;
            
            const p1 = camera.project(new Vector3(-4, 0.02, relZ), renderer.width, renderer.height);
            const p2 = camera.project(new Vector3(4, 0.02, relZ), renderer.width, renderer.height);
            const p3 = camera.project(new Vector3(4, 0.02, relZ + 0.3), renderer.width, renderer.height);
            const p4 = camera.project(new Vector3(-4, 0.02, relZ + 0.3), renderer.width, renderer.height);
            
            if (p1 && p2 && p3 && p4 && p1.z > 0) {
                renderer.drawQuad(p1, p2, p3, p4, COLORS.TIE);
            }
        }
    }
    
    renderRails(renderer, camera) {
        const railHeight = 0.1;
        
        CONFIG.LANE_POSITIONS.forEach(laneX => {
            [-0.3, 0.3].forEach(offset => {
                const x = laneX + offset;
                const near = this.offset - 5;
                const far = this.offset + CONFIG.VISIBLE_DISTANCE;
                
                for (let z = near; z < far; z += 5) {
                    const relZ = z - this.offset;
                    
                    const p1 = camera.project(new Vector3(x - 0.05, railHeight, relZ), renderer.width, renderer.height);
                    const p2 = camera.project(new Vector3(x + 0.05, railHeight, relZ), renderer.width, renderer.height);
                    const p3 = camera.project(new Vector3(x + 0.05, railHeight, relZ + 5), renderer.width, renderer.height);
                    const p4 = camera.project(new Vector3(x - 0.05, railHeight, relZ + 5), renderer.width, renderer.height);
                    
                    if (p1 && p2 && p3 && p4 && p1.z > 0) {
                        renderer.drawQuad(p1, p2, p3, p4, COLORS.RAIL);
                    }
                }
            });
        });
    }
    
    renderWalls(renderer, camera, segment) {
        const relZ = segment.z - this.offset;
        if (relZ < -10 || relZ > CONFIG.VISIBLE_DISTANCE) return;
        
        const wallHeight = 4;
        const wallX = 6;
        
        // Left wall
        const l1 = camera.project(new Vector3(-wallX, 0, relZ), renderer.width, renderer.height);
        const l2 = camera.project(new Vector3(-wallX, wallHeight, relZ), renderer.width, renderer.height);
        const l3 = camera.project(new Vector3(-wallX, wallHeight, relZ + 30), renderer.width, renderer.height);
        const l4 = camera.project(new Vector3(-wallX, 0, relZ + 30), renderer.width, renderer.height);
        
        if (l1 && l2 && l3 && l4 && l1.z > 0) {
            renderer.drawQuad(l1, l2, l3, l4, segment.leftWallColor);
            
            if (segment.hasGraffiti) {
                const g1 = camera.project(new Vector3(-wallX + 0.01, 1, relZ + 5), renderer.width, renderer.height);
                const g2 = camera.project(new Vector3(-wallX + 0.01, 2.5, relZ + 5), renderer.width, renderer.height);
                const g3 = camera.project(new Vector3(-wallX + 0.01, 2.5, relZ + 12), renderer.width, renderer.height);
                const g4 = camera.project(new Vector3(-wallX + 0.01, 1, relZ + 12), renderer.width, renderer.height);
                
                if (g1 && g2 && g3 && g4) {
                    renderer.drawQuad(g1, g2, g3, g4, segment.graffitiColor);
                }
            }
        }
        
        // Right wall
        const r1 = camera.project(new Vector3(wallX, 0, relZ), renderer.width, renderer.height);
        const r2 = camera.project(new Vector3(wallX, wallHeight, relZ), renderer.width, renderer.height);
        const r3 = camera.project(new Vector3(wallX, wallHeight, relZ + 30), renderer.width, renderer.height);
        const r4 = camera.project(new Vector3(wallX, 0, relZ + 30), renderer.width, renderer.height);
        
        if (r1 && r2 && r3 && r4 && r1.z > 0) {
            renderer.drawQuad(r1, r2, r3, r4, segment.rightWallColor);
        }
    }
    
    renderDecoration(renderer, camera, deco) {
        const relZ = deco.z - this.offset;
        if (relZ < -10 || relZ > CONFIG.VISIBLE_DISTANCE) return;
        
        const x = deco.side * 12;
        const width = 4;
        
        const p1 = camera.project(new Vector3(x - width/2, 0, relZ), renderer.width, renderer.height);
        const p2 = camera.project(new Vector3(x + width/2, 0, relZ), renderer.width, renderer.height);
        const p3 = camera.project(new Vector3(x + width/2, deco.height, relZ), renderer.width, renderer.height);
        const p4 = camera.project(new Vector3(x - width/2, deco.height, relZ), renderer.width, renderer.height);
        
        if (p1 && p2 && p3 && p4 && p1.z > 0) {
            renderer.drawQuad(p1, p2, p3, p4, deco.color);
            
            // Windows
            const windowColor = '#85C1E9';
            for (let row = 0; row < Math.min(3, deco.height / 3); row++) {
                const wy = 2 + row * 2.5;
                const w1 = camera.project(new Vector3(x - 1, wy, relZ + 0.01), renderer.width, renderer.height);
                const w2 = camera.project(new Vector3(x + 1, wy, relZ + 0.01), renderer.width, renderer.height);
                const w3 = camera.project(new Vector3(x + 1, wy + 1.2, relZ + 0.01), renderer.width, renderer.height);
                const w4 = camera.project(new Vector3(x - 1, wy + 1.2, relZ + 0.01), renderer.width, renderer.height);
                
                if (w1 && w2 && w3 && w4) {
                    renderer.drawQuad(w1, w2, w3, w4, windowColor);
                }
            }
        }
    }
}

// ===== SECTION 7: OBSTACLE MANAGER =====
class ObstacleManager {
    constructor() {
        this.obstacles = [];
        this.nextSpawnZ = 50;
        this.minGap = CONFIG.OBSTACLE_MIN_GAP;
    }
    
    reset() {
        this.obstacles = [];
        this.nextSpawnZ = 50;
    }
    
    update(dt, speed, trackOffset, distance) {
        // Move obstacles
        this.obstacles.forEach(obs => {
            if (obs.moving) {
                obs.z -= obs.moveSpeed * dt;
            }
        });
        
        // Remove passed obstacles
        this.obstacles = this.obstacles.filter(obs => obs.z - trackOffset > -10);
        
        // Spawn new obstacles
        while (this.nextSpawnZ - trackOffset < CONFIG.VISIBLE_DISTANCE) {
            this.spawnObstacle(this.nextSpawnZ, distance);
            this.nextSpawnZ += randomRange(this.minGap, CONFIG.OBSTACLE_MAX_GAP);
            
            // Decrease min gap as game progresses
            this.minGap = Math.max(10, CONFIG.OBSTACLE_MIN_GAP - distance / 500);
        }
    }
    
    spawnObstacle(z, distance) {
        const patterns = this.getAvailablePatterns(distance);
        const pattern = randomChoice(patterns);
        
        pattern.forEach(obs => {
            this.obstacles.push({
                ...obs,
                z: z + (obs.zOffset || 0),
                active: true
            });
        });
    }
    
    getAvailablePatterns(distance) {
        const patterns = [
            // Single barrier
            [{ lane: Math.floor(Math.random() * 3), type: 'barrier', width: 2.2, height: 1.2, depth: 0.8 }],
            
            // Double barrier (leaves one lane)
            [
                { lane: 0, type: 'barrier', width: 2.2, height: 1.2, depth: 0.8 },
                { lane: 1, type: 'barrier', width: 2.2, height: 1.2, depth: 0.8 }
            ],
            [
                { lane: 1, type: 'barrier', width: 2.2, height: 1.2, depth: 0.8 },
                { lane: 2, type: 'barrier', width: 2.2, height: 1.2, depth: 0.8 }
            ],
            
            // Overhead (slide under)
            [{ lane: Math.floor(Math.random() * 3), type: 'overhead', width: 2.4, height: 1.0, depth: 0.5, y: 1.3 }],
        ];
        
        // Add harder patterns after distance
        if (distance > 300) {
            patterns.push(
                // Full overhead
                [{ lane: -1, type: 'overhead_full', width: 8, height: 1.2, depth: 0.5, y: 1.2 }],
                
                // Trains (single lane blockers)
                [{ lane: Math.floor(Math.random() * 3), type: 'train', width: 2.3, height: 3.5, depth: 15 }]
            );
        }
        
        if (distance > 600) {
            patterns.push(
                // Double train corridor
                [
                    { lane: 0, type: 'train', width: 2.3, height: 3.5, depth: 20 },
                    { lane: 2, type: 'train', width: 2.3, height: 3.5, depth: 20 }
                ],
                
                // Jump then slide
                [
                    { lane: 1, type: 'barrier', width: 2.2, height: 1.2, depth: 0.8, zOffset: 0 },
                    { lane: 1, type: 'overhead', width: 2.4, height: 1.0, depth: 0.5, y: 1.3, zOffset: 8 }
                ]
            );
        }
        
        if (distance > 1000) {
            patterns.push(
                // Moving train
                [{ lane: Math.floor(Math.random() * 3), type: 'train', width: 2.3, height: 3.5, depth: 12, moving: true, moveSpeed: 15 }]
            );
        }
        
        return patterns;
    }
    
    render(renderer, camera, trackOffset) {
        // Sort by distance for proper rendering
        const sorted = [...this.obstacles].sort((a, b) => b.z - a.z);
        
        sorted.forEach(obs => {
            const relZ = obs.z - trackOffset;
            if (relZ < -5 || relZ > CONFIG.VISIBLE_DISTANCE) return;
            
            const x = obs.lane >= 0 ? CONFIG.LANE_POSITIONS[obs.lane] : 0;
            const y = obs.y || 0;
            
            switch (obs.type) {
                case 'barrier':
                    this.renderBarrier(renderer, camera, x, y, relZ, obs);
                    break;
                case 'overhead':
                case 'overhead_full':
                    this.renderOverhead(renderer, camera, x, y, relZ, obs);
                    break;
                case 'train':
                    this.renderTrain(renderer, camera, x, y, relZ, obs);
                    break;
            }
        });
    }
    
    renderBarrier(renderer, camera, x, y, z, obs) {
        const hw = obs.width / 2;
        const hd = obs.depth / 2;
        
        // Front face
        const f1 = camera.project(new Vector3(x - hw, y, z - hd), renderer.width, renderer.height);
        const f2 = camera.project(new Vector3(x + hw, y, z - hd), renderer.width, renderer.height);
        const f3 = camera.project(new Vector3(x + hw, y + obs.height, z - hd), renderer.width, renderer.height);
        const f4 = camera.project(new Vector3(x - hw, y + obs.height, z - hd), renderer.width, renderer.height);
        
        if (f1 && f2 && f3 && f4) {
            renderer.drawQuad(f1, f2, f3, f4, '#FF6B35');
            
            // Stripes
            const stripeCount = 3;
            for (let i = 0; i < stripeCount; i++) {
                const sy = y + (obs.height / stripeCount) * i;
                const s1 = camera.project(new Vector3(x - hw, sy, z - hd - 0.01), renderer.width, renderer.height);
                const s2 = camera.project(new Vector3(x + hw, sy, z - hd - 0.01), renderer.width, renderer.height);
                const s3 = camera.project(new Vector3(x + hw, sy + obs.height / stripeCount / 2, z - hd - 0.01), renderer.width, renderer.height);
                const s4 = camera.project(new Vector3(x - hw, sy + obs.height / stripeCount / 2, z - hd - 0.01), renderer.width, renderer.height);
                
                if (s1 && s2 && s3 && s4) {
                    renderer.drawQuad(s1, s2, s3, s4, i % 2 === 0 ? '#FFE66D' : '#FF6B35');
                }
            }
        }
        
        // Top face
        const t1 = camera.project(new Vector3(x - hw, y + obs.height, z - hd), renderer.width, renderer.height);
        const t2 = camera.project(new Vector3(x + hw, y + obs.height, z - hd), renderer.width, renderer.height);
        const t3 = camera.project(new Vector3(x + hw, y + obs.height, z + hd), renderer.width, renderer.height);
        const t4 = camera.project(new Vector3(x - hw, y + obs.height, z + hd), renderer.width, renderer.height);
        
        if (t1 && t2 && t3 && t4) {
            renderer.drawQuad(t1, t2, t3, t4, '#E55A2B');
        }
    }
    
    renderOverhead(renderer, camera, x, y, z, obs) {
        const hw = obs.width / 2;
        const hd = obs.depth / 2;
        
        // Support poles
        if (obs.type === 'overhead_full') {
            [-3.5, 3.5].forEach(px => {
                const pole1 = camera.project(new Vector3(px - 0.15, 0, z), renderer.width, renderer.height);
                const pole2 = camera.project(new Vector3(px + 0.15, 0, z), renderer.width, renderer.height);
                const pole3 = camera.project(new Vector3(px + 0.15, y + obs.height, z), renderer.width, renderer.height);
                const pole4 = camera.project(new Vector3(px - 0.15, y + obs.height, z), renderer.width, renderer.height);
                
                if (pole1 && pole2 && pole3 && pole4) {
                    renderer.drawQuad(pole1, pole2, pole3, pole4, '#555');
                }
            });
        }
        
        // Overhead bar - bottom
        const b1 = camera.project(new Vector3(x - hw, y, z - hd), renderer.width, renderer.height);
        const b2 = camera.project(new Vector3(x + hw, y, z - hd), renderer.width, renderer.height);
        const b3 = camera.project(new Vector3(x + hw, y, z + hd), renderer.width, renderer.height);
        const b4 = camera.project(new Vector3(x - hw, y, z + hd), renderer.width, renderer.height);
        
        if (b1 && b2 && b3 && b4) {
            renderer.drawQuad(b1, b2, b3, b4, '#27AE60');
        }
        
        // Front face
        const f1 = camera.project(new Vector3(x - hw, y, z - hd), renderer.width, renderer.height);
        const f2 = camera.project(new Vector3(x + hw, y, z - hd), renderer.width, renderer.height);
        const f3 = camera.project(new Vector3(x + hw, y + obs.height, z - hd), renderer.width, renderer.height);
        const f4 = camera.project(new Vector3(x - hw, y + obs.height, z - hd), renderer.width, renderer.height);
        
        if (f1 && f2 && f3 && f4) {
            renderer.drawQuad(f1, f2, f3, f4, '#2ECC71');
        }
    }
    
    renderTrain(renderer, camera, x, y, z, obs) {
        const hw = obs.width / 2;
        const depth = obs.depth;
        
        // Main body - left side
        const l1 = camera.project(new Vector3(x - hw, y, z), renderer.width, renderer.height);
        const l2 = camera.project(new Vector3(x - hw, y + obs.height, z), renderer.width, renderer.height);
        const l3 = camera.project(new Vector3(x - hw, y + obs.height, z + depth), renderer.width, renderer.height);
        const l4 = camera.project(new Vector3(x - hw, y, z + depth), renderer.width, renderer.height);
        
        if (l1 && l2 && l3 && l4 && l1.z > 0) {
            renderer.drawQuad(l1, l2, l3, l4, COLORS.TRAIN);
        }
        
        // Right side
        const r1 = camera.project(new Vector3(x + hw, y, z), renderer.width, renderer.height);
        const r2 = camera.project(new Vector3(x + hw, y + obs.height, z), renderer.width, renderer.height);
        const r3 = camera.project(new Vector3(x + hw, y + obs.height, z + depth), renderer.width, renderer.height);
        const r4 = camera.project(new Vector3(x + hw, y, z + depth), renderer.width, renderer.height);
        
        if (r1 && r2 && r3 && r4 && r1.z > 0) {
            renderer.drawQuad(r1, r2, r3, r4, '#3D566E');
        }
        
        // Front face
        const f1 = camera.project(new Vector3(x - hw, y, z), renderer.width, renderer.height);
        const f2 = camera.project(new Vector3(x + hw, y, z), renderer.width, renderer.height);
        const f3 = camera.project(new Vector3(x + hw, y + obs.height, z), renderer.width, renderer.height);
        const f4 = camera.project(new Vector3(x - hw, y + obs.height, z), renderer.width, renderer.height);
        
        if (f1 && f2 && f3 && f4 && f1.z > 0) {
            renderer.drawQuad(f1, f2, f3, f4, '#1A252F');
        }
        
        // Roof
        const roof1 = camera.project(new Vector3(x - hw, y + obs.height, z), renderer.width, renderer.height);
        const roof2 = camera.project(new Vector3(x + hw, y + obs.height, z), renderer.width, renderer.height);
        const roof3 = camera.project(new Vector3(x + hw, y + obs.height, z + depth), renderer.width, renderer.height);
        const roof4 = camera.project(new Vector3(x - hw, y + obs.height, z + depth), renderer.width, renderer.height);
        
        if (roof1 && roof2 && roof3 && roof4 && roof1.z > 0) {
            renderer.drawQuad(roof1, roof2, roof3, roof4, '#4A6278');
        }
        
        // Red stripe
        const stripeY = y + obs.height * 0.6;
        const stripe1 = camera.project(new Vector3(x - hw - 0.01, stripeY, z), renderer.width, renderer.height);
        const stripe2 = camera.project(new Vector3(x - hw - 0.01, stripeY + 0.4, z), renderer.width, renderer.height);
        const stripe3 = camera.project(new Vector3(x - hw - 0.01, stripeY + 0.4, z + depth), renderer.width, renderer.height);
        const stripe4 = camera.project(new Vector3(x - hw - 0.01, stripeY, z + depth), renderer.width, renderer.height);
        
        if (stripe1 && stripe2 && stripe3 && stripe4 && stripe1.z > 0) {
            renderer.drawQuad(stripe1, stripe2, stripe3, stripe4, COLORS.TRAIN_STRIPE);
        }
        
        // Windows
        const windowY = y + obs.height * 0.55;
        for (let wz = z + 2; wz < z + depth - 2; wz += 3) {
            const w1 = camera.project(new Vector3(x - hw - 0.02, windowY, wz), renderer.width, renderer.height);
            const w2 = camera.project(new Vector3(x - hw - 0.02, windowY + 1.2, wz), renderer.width, renderer.height);
            const w3 = camera.project(new Vector3(x - hw - 0.02, windowY + 1.2, wz + 1.8), renderer.width, renderer.height);
            const w4 = camera.project(new Vector3(x - hw - 0.02, windowY, wz + 1.8), renderer.width, renderer.height);
            
            if (w1 && w2 && w3 && w4 && w1.z > 0) {
                renderer.drawQuad(w1, w2, w3, w4, '#85C1E9');
            }
        }
    }
    
    checkCollision(playerHitbox, trackOffset) {
        for (const obs of this.obstacles) {
            if (!obs.active) continue;
            
            const relZ = obs.z - trackOffset;
            const x = obs.lane >= 0 ? CONFIG.LANE_POSITIONS[obs.lane] : 0;
            const y = obs.y || 0;
            
            const obsBox = {
                x: x - obs.width / 2,
                y: y,
                z: relZ - (obs.depth || 0.8) / 2,
                width: obs.width,
                height: obs.height,
                depth: obs.depth || 0.8
            };
            
            if (this.boxIntersect(playerHitbox, obsBox)) {
                return true;
            }
        }
        return false;
    }
    
    boxIntersect(a, b) {
        return (
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y &&
            a.z < b.z + b.depth &&
            a.z + a.depth > b.z
        );
    }
}

// ===== SECTION 8: COIN MANAGER =====
class CoinManager {
    constructor() {
        this.coins = [];
        this.nextSpawnZ = 30;
        this.rotation = 0;
    }
    
    reset() {
        this.coins = [];
        this.nextSpawnZ = 30;
    }
    
    update(dt, speed, trackOffset) {
        this.rotation += CONFIG.COIN_SPIN_SPEED * dt;
        
        // Remove collected or passed coins
        this.coins = this.coins.filter(c => c.active && c.z - trackOffset > -5);
        
        // Spawn new coins
        while (this.nextSpawnZ - trackOffset < CONFIG.VISIBLE_DISTANCE) {
            this.spawnCoinPattern(this.nextSpawnZ);
            this.nextSpawnZ += randomRange(15, 30);
        }
    }
    
    spawnCoinPattern(z) {
        const patterns = ['line', 'arc', 'diagonal', 'zigzag'];
        const pattern = randomChoice(patterns);
        const lane = Math.floor(Math.random() * 3);
        
        switch (pattern) {
            case 'line':
                for (let i = 0; i < 5; i++) {
                    this.coins.push({
                        x: CONFIG.LANE_POSITIONS[lane],
                        y: 1,
                        z: z + i * 2,
                        active: true
                    });
                }
                break;
                
            case 'arc':
                for (let i = 0; i < 7; i++) {
                    const arcY = 1 + Math.sin(i / 6 * Math.PI) * 2;
                    this.coins.push({
                        x: CONFIG.LANE_POSITIONS[lane],
                        y: arcY,
                        z: z + i * 1.5,
                        active: true
                    });
                }
                break;
                
            case 'diagonal':
                const dir = Math.random() > 0.5 ? 1 : -1;
                for (let i = 0; i < 5; i++) {
                    const l = clamp(lane + (i - 2) * dir, 0, 2);
                    this.coins.push({
                        x: CONFIG.LANE_POSITIONS[l],
                        y: 1,
                        z: z + i * 2,
                        active: true
                    });
                }
                break;
                
            case 'zigzag':
                for (let i = 0; i < 6; i++) {
                    const l = (lane + (i % 2)) % 3;
                    this.coins.push({
                        x: CONFIG.LANE_POSITIONS[l],
                        y: 1,
                        z: z + i * 2,
                        active: true
                    });
                }
                break;
        }
    }
    
    render(renderer, camera, trackOffset) {
        this.coins.forEach(coin => {
            if (!coin.active) return;
            
            const relZ = coin.z - trackOffset;
            if (relZ < 0 || relZ > CONFIG.VISIBLE_DISTANCE) return;
            
            const bobY = Math.sin(Date.now() / 200 + coin.z) * 0.1;
            const pos = new Vector3(coin.x, coin.y + bobY, relZ);
            const proj = camera.project(pos, renderer.width, renderer.height);
            
            if (!proj || proj.z <= 0) return;
            
            const radius = CONFIG.COIN_RADIUS * proj.scale * renderer.height;
            const scaleX = Math.abs(Math.cos(this.rotation * Math.PI / 180));
            
            // Coin glow
            const gradient = renderer.ctx.createRadialGradient(
                proj.x, proj.y, 0,
                proj.x, proj.y, radius * 1.5
            );
            gradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
            renderer.ctx.fillStyle = gradient;
            renderer.ctx.beginPath();
            renderer.ctx.arc(proj.x, proj.y, radius * 1.5, 0, Math.PI * 2);
            renderer.ctx.fill();
            
            // Coin body
            renderer.ctx.fillStyle = COLORS.COIN;
            renderer.ctx.beginPath();
            renderer.ctx.ellipse(proj.x, proj.y, radius * scaleX, radius, 0, 0, Math.PI * 2);
            renderer.ctx.fill();
            
            // Edge
            renderer.ctx.strokeStyle = COLORS.COIN_EDGE;
            renderer.ctx.lineWidth = 2;
            renderer.ctx.stroke();
            
            // Shine
            if (scaleX > 0.5) {
                renderer.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                renderer.ctx.beginPath();
                renderer.ctx.ellipse(proj.x - radius * 0.2, proj.y - radius * 0.2, 
                    radius * 0.3 * scaleX, radius * 0.3, 0, 0, Math.PI * 2);
                renderer.ctx.fill();
            }
        });
    }
    
    checkCollection(playerHitbox, trackOffset) {
        let collected = 0;
        
        this.coins.forEach(coin => {
            if (!coin.active) return;
            
            const relZ = coin.z - trackOffset;
            const dx = coin.x - (playerHitbox.x + playerHitbox.width / 2);
            const dy = coin.y - (playerHitbox.y + playerHitbox.height / 2);
            const dz = relZ - (playerHitbox.z + playerHitbox.depth / 2);
            
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            if (dist < 1.5) {
                coin.active = false;
                collected++;
            }
        });
        
        return collected;
    }
}

// ===== SECTION 9: PARTICLE SYSTEM =====
class ParticleSystem {
    constructor() {
        this.particles = [];
    }
    
    emit(x, y, count, color, speed = 5) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * speed,
                vy: (Math.random() - 0.5) * speed - 2,
                life: 1,
                decay: 0.02 + Math.random() * 0.02,
                size: 3 + Math.random() * 5,
                color: color
            });
        }
    }
    
    update(dt) {
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2; // Gravity
            p.life -= p.decay;
            return p.life > 0;
        });
    }
    
    render(renderer) {
        this.particles.forEach(p => {
            renderer.ctx.globalAlpha = p.life;
            renderer.ctx.fillStyle = p.color;
            renderer.ctx.beginPath();
            renderer.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            renderer.ctx.fill();
        });
        renderer.ctx.globalAlpha = 1;
    }
}

// ===== SECTION 10: INPUT HANDLER =====
class InputHandler {
    constructor(game) {
        this.game = game;
        this.keysPressed = new Set();
        this.touchStart = null;
        this.init();
    }
    
    init() {
        // Keyboard
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Touch
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    }
    
    handleKeyDown(e) {
        if (this.keysPressed.has(e.code)) return;
        this.keysPressed.add(e.code);
        
        if (this.game.state === 'MENU') {
            if (e.code === 'Space' || e.code === 'Enter') {
                this.game.startGame();
            }
            return;
        }
        
        if (this.game.state === 'GAME_OVER') {
            if (e.code === 'Space' || e.code === 'Enter') {
                this.game.startGame();
            }
            return;
        }
        
        if (this.game.state === 'PAUSED') {
            if (e.code === 'Escape' || e.code === 'KeyP') {
                this.game.resumeGame();
            }
            return;
        }
        
        if (this.game.state === 'PLAYING') {
            switch (e.code) {
                case 'ArrowLeft':
                case 'KeyA':
                    this.game.player.moveLeft();
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.game.player.moveRight();
                    break;
                case 'ArrowUp':
                case 'KeyW':
                case 'Space':
                    this.game.player.jump();
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.game.player.slide();
                    break;
                case 'Escape':
                case 'KeyP':
                    this.game.pauseGame();
                    break;
            }
        }
    }
    
    handleKeyUp(e) {
        this.keysPressed.delete(e.code);
    }
    
    handleTouchStart(e) {
        if (e.target.classList.contains('ui-element') || e.target.classList.contains('menu-btn')) {
            return;
        }
        e.preventDefault();
        
        this.touchStart = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            time: Date.now()
        };
    }
    
    handleTouchEnd(e) {
        if (!this.touchStart) return;
        if (e.target.classList.contains('ui-element') || e.target.classList.contains('menu-btn')) {
            return;
        }
        
        const touch = e.changedTouches[0];
        const dx = touch.clientX - this.touchStart.x;
        const dy = touch.clientY - this.touchStart.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const elapsed = Date.now() - this.touchStart.time;
        
        if (this.game.state === 'MENU' || this.game.state === 'GAME_OVER') {
            if (distance < 30) {
                this.game.startGame();
            }
            this.touchStart = null;
            return;
        }
        
        if (this.game.state !== 'PLAYING') {
            this.touchStart = null;
            return;
        }
        
        if (distance < 30) {
            // Tap - jump
            this.game.player.jump();
        } else if (elapsed < 300) {
            // Swipe
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            
            if (angle > -45 && angle <= 45) {
                // Right
                this.game.player.moveRight();
            } else if (angle > 45 && angle <= 135) {
                // Down
                this.game.player.slide();
            } else if (angle > -135 && angle <= -45) {
                // Up
                this.game.player.jump();
            } else {
                // Left
                this.game.player.moveLeft();
            }
        }
        
        this.touchStart = null;
    }
}

// ===== SECTION 11: UI MANAGER =====
class UIManager {
    constructor(game) {
        this.game = game;
        this.container = document.getElementById('ui-container');
    }
    
    showHUD() {
        this.container.innerHTML = `
            <button id="pauseBtn" class="ui-element">❚❚</button>
            <div id="scoreContainer">
                <div id="score">0</div>
                <div id="coinCount">
                    <div class="coin-icon"></div>
                    <span id="coins">0</span>
                </div>
            </div>
            <div id="distance">0m</div>
        `;
        
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.game.pauseGame();
        });
    }
    
    updateHUD(score, coins, distance) {
        const scoreEl = document.getElementById('score');
        const coinsEl = document.getElementById('coins');
        const distanceEl = document.getElementById('distance');
        
        if (scoreEl) scoreEl.textContent = formatNumber(Math.floor(score));
        if (coinsEl) coinsEl.textContent = formatNumber(coins);
        if (distanceEl) distanceEl.textContent = Math.floor(distance) + 'm';
    }
    
    showMainMenu() {
        const highScore = localStorage.getItem('highScore') || 0;
        
        this.container.innerHTML = `
            <div class="overlay">
                <div class="menu-panel">
                    <div class="game-title">SUBWAY RUSH</div>
                    <button class="menu-btn btn-play ui-element" id="playBtn">
                        ▶ PLAY
                    </button>
                    <div class="high-score-display">
                        HIGH SCORE: ${formatNumber(parseInt(highScore))}
                    </div>
                    <div id="instructions">
                        <strong>Controls:</strong><br>
                        ← → or A/D: Change lanes<br>
                        ↑ or W or Space: Jump<br>
                        ↓ or S: Slide<br><br>
                        <strong>Touch:</strong><br>
                        Swipe to move, Tap to jump
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('playBtn').addEventListener('click', () => {
            this.game.startGame();
        });
    }
    
    showPauseMenu() {
        this.container.innerHTML += `
            <div class="overlay" id="pauseOverlay">
                <div class="menu-panel">
                    <div class="game-title" style="font-size: 32px;">PAUSED</div>
                    <button class="menu-btn btn-play ui-element" id="resumeBtn">
                        ▶ RESUME
                    </button>
                    <button class="menu-btn btn-secondary ui-element" id="menuBtn">
                        ⌂ MENU
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('resumeBtn').addEventListener('click', () => {
            this.game.resumeGame();
        });
        
        document.getElementById('menuBtn').addEventListener('click', () => {
            this.game.goToMenu();
        });
    }
    
    hidePauseMenu() {
        const overlay = document.getElementById('pauseOverlay');
        if (overlay) overlay.remove();
    }
    
    showGameOver(score, coins, distance, highScore, isNewRecord) {
        this.container.innerHTML = `
            <div class="overlay">
                <div class="menu-panel">
                    <div class="game-title" style="font-size: 32px; color: #E74C3C;">GAME OVER</div>
                    
                    <div class="stat-row">
                        <span>SCORE</span>
                        <span class="stat-value">${formatNumber(Math.floor(score))}</span>
                    </div>
                    <div class="stat-row">
                        <span>COINS</span>
                        <span class="stat-value">${formatNumber(coins)}</span>
                    </div>
                    <div class="stat-row">
                        <span>DISTANCE</span>
                        <span class="stat-value">${Math.floor(distance)}m</span>
                    </div>
                    <div class="stat-row">
                        <span>BEST</span>
                        <span class="stat-value ${isNewRecord ? 'new-record' : ''}">
                            ${formatNumber(highScore)}${isNewRecord ? ' NEW!' : ''}
                        </span>
                    </div>
                    
                    <button class="menu-btn btn-play ui-element" id="retryBtn" style="margin-top: 20px;">
                        ↻ PLAY AGAIN
                    </button>
                    <button class="menu-btn btn-secondary ui-element" id="menuBtn2">
                        ⌂ MENU
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('retryBtn').addEventListener('click', () => {
            this.game.startGame();
        });
        
        document.getElementById('menuBtn2').addEventListener('click', () => {
            this.game.goToMenu();
        });
    }
}

// ===== SECTION 12: MAIN GAME CLASS =====
class SubwaySurfersGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        
        // Core systems
        this.renderer = new Renderer(this.canvas);
        this.camera = new Camera();
        this.player = new Player();
        this.track = new TrackSystem();
        this.obstacleManager = new ObstacleManager();
        this.coinManager = new CoinManager();
        this.particles = new ParticleSystem();
        this.ui = new UIManager(this);
        this.input = new InputHandler(this);
        
        // Game state
        this.state = 'MENU';
        this.score = 0;
        this.coins = 0;
        this.distance = 0;
        this.highScore = parseInt(localStorage.getItem('highScore')) || 0;
        
        // Time management
        this.lastTime = 0;
        this.deltaTime = 0;
        
        this.init();
    }
    
    init() {
        this.ui.showMainMenu();
        this.startGameLoop();
    }
    
    startGame() {
        this.state = 'PLAYING';
        this.score = 0;
        this.coins = 0;
        this.distance = 0;
        
        this.player = new Player();
        this.track = new TrackSystem();
        this.obstacleManager.reset();
        this.coinManager.reset();
        this.particles = new ParticleSystem();
        
        this.ui.showHUD();
    }
    
    pauseGame() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            this.ui.showPauseMenu();
        }
    }
    
    resumeGame() {
        if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            this.ui.hidePauseMenu();
        }
    }
    
    goToMenu() {
        this.state = 'MENU';
        this.ui.showMainMenu();
    }
    
    gameOver() {
        this.state = 'GAME_OVER';
        
        const isNewRecord = this.score > this.highScore;
        if (isNewRecord) {
            this.highScore = Math.floor(this.score);
            localStorage.setItem('highScore', this.highScore);
        }
        
        // Screen shake
        this.camera.addShake(1);
        
        // Particles
        const proj = this.camera.project(
            new Vector3(this.player.x, this.player.y + 1, this.player.z),
            this.renderer.width, this.renderer.height
        );
        if (proj) {
            this.particles.emit(proj.x, proj.y, 30, '#FF6B6B', 10);
        }
        
        setTimeout(() => {
            this.ui.showGameOver(this.score, this.coins, this.distance, this.highScore, isNewRecord);
        }, 500);
    }
    
    startGameLoop() {
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    gameLoop(currentTime) {
        this.deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;
        
        if (this.state === 'PLAYING') {
            this.update(this.deltaTime);
        }
        
        this.render();
        
        if (this.state === 'GAME_OVER') {
            this.camera.updateShake(this.deltaTime);
            this.particles.update(this.deltaTime);
        }
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(dt) {
        // Update player
        this.player.update(dt);
        
        // Update track
        const trackOffset = this.distance;
        this.track.update(dt, this.player.speed);
        
        // Update obstacles
        this.obstacleManager.update(dt, this.player.speed, trackOffset, this.distance);
        
        // Update coins
        this.coinManager.update(dt, this.player.speed, trackOffset);
        
        // Update particles
        this.particles.update(dt);
        
        // Update camera
        this.camera.updateShake(dt);
        
        // Update distance and score
        this.distance += this.player.speed * dt;
        this.score += this.player.speed * dt * 2;
        
        // Check coin collection
        const collected = this.coinManager.checkCollection(this.player.getHitbox(), trackOffset);
        if (collected > 0) {
            this.coins += collected;
            this.score += collected * 100;
            
            // Coin particle effect
            const proj = this.camera.project(
                new Vector3(this.player.x, this.player.y + 1, this.player.z),
                this.renderer.width, this.renderer.height
            );
            if (proj) {
                this.particles.emit(proj.x, proj.y, 5, COLORS.COIN, 3);
            }
        }
        
        // Check collision
        if (this.obstacleManager.checkCollision(this.player.getHitbox(), trackOffset)) {
            this.gameOver();
        }
        
        // Update UI
        this.ui.updateHUD(this.score, this.coins, this.distance);
    }
    
    render() {
        // Clear and draw sky
        this.renderer.clear();
        
        if (this.state === 'MENU') {
            // Render background scene for menu
            this.track.render(this.renderer, this.camera);
            return;
        }
        
        const trackOffset = this.distance;
        
        // Render track
        this.track.render(this.renderer, this.camera);
        
        // Render obstacles
        this.obstacleManager.render(this.renderer, this.camera, trackOffset);
        
        // Render coins
        this.coinManager.render(this.renderer, this.camera, trackOffset);
        
        // Render player
        this.player.render(this.renderer, this.camera);
        
        // Render particles
        this.particles.render(this.renderer);
    }
}

// ===== SECTION 13: INITIALIZATION =====
window.onload = () => {
    const game = new SubwaySurfersGame('gameCanvas');
};
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 30;
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 6;
        this.jumpPower = 15;
        this.isJumping = false;
        this.canDoubleJump = true;
        this.isDashing = false;
        this.dashCooldown = 0;
        this.gravity = 0.6;
    }

    update() {
        this.velocityY += this.gravity;
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        if (this.dashCooldown > 0) {
            this.dashCooldown--;
        }
    }

    draw(ctx, theme) {
        ctx.fillStyle = this.isDashing ? theme.playerDash : theme.player;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        
        ctx.fillStyle = 'white';
        ctx.fillRect(this.x - 8, this.y - 8, 5, 5);
        ctx.fillRect(this.x + 3, this.y - 8, 5, 5);
        
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x - 7, this.y - 7, 2, 2);
        ctx.fillRect(this.x + 4, this.y - 7, 2, 2);
    }

    moveLeft() {
        this.velocityX = -this.speed;
    }

    moveRight() {
        this.velocityX = this.speed;
    }

    stop() {
        this.velocityX = 0;
    }

    jump() {
        if (!this.isJumping) {
            this.velocityY = -this.jumpPower;
            this.isJumping = true;
            this.canDoubleJump = true;
        } else if (this.canDoubleJump) {
            this.velocityY = -this.jumpPower;
            this.canDoubleJump = false;
        }
    }

    dash(direction) {
        if (this.dashCooldown <= 0) {
            this.isDashing = true;
            this.velocityX = direction * 20;
            this.dashCooldown = 20;
            setTimeout(() => { this.isDashing = false; }, 150);
        }
    }

    getRect() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }
}

class Platform {
    constructor(x, y, width, height, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
        this.moveDir = 1;
        this.moveSpeed = 2;
        this.originalX = x;
        this.moveRange = 100;
        this.isFalling = false;
        this.fallDelay = 0;
        this.bouncePower = 20;
    }

    update() {
        if (this.type === 'moving') {
            this.x += this.moveSpeed * this.moveDir;
            if (Math.abs(this.x - this.originalX) > this.moveRange) {
                this.moveDir *= -1;
            }
        }

        if (this.type === 'falling' && this.isFalling) {
            this.fallDelay--;
            if (this.fallDelay <= 0) {
                this.y += 8;
            }
        }
    }

    draw(ctx, theme) {
        ctx.fillStyle = theme[this.type] || theme.normal;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        if (this.type === 'spike') {
            ctx.fillStyle = theme.spike;
            for (let i = 0; i < this.width; i += 10) {
                ctx.beginPath();
                ctx.moveTo(this.x + i, this.y);
                ctx.lineTo(this.x + i + 5, this.y - 8);
                ctx.lineTo(this.x + i + 10, this.y);
                ctx.fill();
            }
        }

        if (this.type === 'bouncy') {
            ctx.fillStyle = theme.bouncy;
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    collidesWith(rect) {
        return rect.x < this.x + this.width &&
               rect.x + rect.width > this.x &&
               rect.y < this.y + this.height &&
               rect.y + rect.height > this.y;
    }

    touchesTop(rect) {
        return rect.y + rect.height >= this.y &&
               rect.y + rect.height <= this.y + 8 &&
               rect.x < this.x + this.width &&
               rect.x + rect.width > this.x;
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();

        this.player = null;
        this.platforms = [];
        this.currentLevel = 0;
        this.gameRunning = false;
        this.levelStartTime = 0;
        
        this.levelThemes = [
            { name: 'Urban Jungle', bg: '#1a472a', player: '#00ff41', playerDash: '#39ff14', normal: '#00cc33', moving: '#ff9500', falling: '#8b4513', bouncy: '#ff00ff', spike: '#ff0000', border: '#00ff00' },
            { name: 'Icy Peaks', bg: '#1a3a52', player: '#00bfff', playerDash: '#00ffff', normal: '#87ceeb', moving: '#4169e1', falling: '#1e90ff', bouncy: '#00ced1', spike: '#4682b4', border: '#00bfff' },
            { name: 'Lava Fortress', bg: '#2d1810', player: '#ffaa00', playerDash: '#ffff00', normal: '#ff6600', moving: '#ff3300', falling: '#cc2200', bouncy: '#ff9900', spike: '#ff0000', border: '#ff8800' },
            { name: 'Neon Void', bg: '#0a0a0a', player: '#ff006e', playerDash: '#ff00ff', normal: '#00f5ff', moving: '#ff006e', falling: '#8338ec', bouncy: '#ffbe0b', spike: '#ff006e', border: '#ff006e' },
            { name: 'Crystal Cavern', bg: '#1a1a3e', player: '#9d00ff', playerDash: '#ff00ff', normal: '#7b68ee', moving: '#ba55d3', falling: '#4b0082', bouncy: '#00ffff', spike: '#ff1493', border: '#9d00ff' },
            { name: 'Sunset Bridge', bg: '#2d1b1b', player: '#ffcc00', playerDash: '#ff6600', normal: '#ff9999', moving: '#ff6600', falling: '#cc3300', bouncy: '#ffaa00', spike: '#ff0000', border: '#ffcc00' },
            { name: 'Cyber Grid', bg: '#0f0f2e', player: '#00ff88', playerDash: '#00ffff', normal: '#0099ff', moving: '#00ff88', falling: '#ff0088', bouncy: '#ffff00', spike: '#ff0088', border: '#00ff88' },
            { name: 'Mystical Forest', bg: '#0d2818', player: '#99ff99', playerDash: '#00ff00', normal: '#66cc66', moving: '#ff99cc', falling: '#993333', bouncy: '#ffff00', spike: '#ff6666', border: '#99ff99' },
            { name: 'Starlight Realm', bg: '#1a0033', player: '#ff99ff', playerDash: '#ffff00', normal: '#cc99ff', moving: '#99ccff', falling: '#663399', bouncy: '#ffff99', spike: '#ff3399', border: '#ff99ff' },
            { name: 'Inferno Peak', bg: '#330000', player: '#ffff00', playerDash: '#ff00ff', normal: '#ff3300', moving: '#ff0000', falling: '#990000', bouncy: '#ffaa00', spike: '#ff6600', border: '#ffff00' }
        ];

        this.keys = {};
        this.setupEventListeners();
        this.createLevels();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            if (e.key === ' ') {
                e.preventDefault();
                if (this.player) this.player.jump();
            }
            if (e.key === 'Shift') {
                e.preventDefault();
                if (this.player) {
                    const direction = this.keys['arrowright'] || this.keys['d'] ? 1 : -1;
                    this.player.dash(direction);
                }
            }
            if (e.key.toLowerCase() === 'r') {
                this.restartLevel();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }

    createLevels() {
    this.levels = [
        // Level 1
        [
            new Platform(0, 600, 400, 50, 'normal'),
            new Platform(450, 550, 100, 20, 'normal'),
            new Platform(600, 500, 100, 20, 'normal'),
            new Platform(750, 450, 100, 20, 'normal'),
            new Platform(900, 500, 100, 20, 'normal'),
            new Platform(1050, 400, 100, 20, 'normal'),
            new Platform(1200, 450, 100, 20, 'normal'),
            new Platform(100, 350, 100, 20, 'normal'),
            new Platform(250, 380, 100, 20, 'normal'),
            new Platform(400, 320, 100, 20, 'normal'),
            new Platform(550, 280, 100, 20, 'normal'),
            new Platform(700, 340, 100, 20, 'normal'),
            new Platform(850, 280, 100, 20, 'normal'),
            new Platform(1000, 360, 100, 20, 'normal'),
            new Platform(1150, 280, 100, 20, 'normal'),
            new Platform(200, 220, 100, 20, 'normal'),
            new Platform(400, 160, 100, 20, 'normal'),
            new Platform(600, 200, 100, 20, 'normal'),
            new Platform(800, 140, 100, 20, 'normal'),
            new Platform(1000, 200, 100, 20, 'normal'),
            new Platform(600, 60, 400, 20, 'normal'),
        ],
        // Level 2
        [
            new Platform(0, 600, 400, 50, 'normal'),
            new Platform(450, 550, 100, 20, 'moving'),
            new Platform(600, 500, 100, 20, 'normal'),
            new Platform(750, 480, 100, 20, 'moving'),
            new Platform(900, 420, 100, 20, 'normal'),
            new Platform(1050, 460, 100, 20, 'moving'),
            new Platform(200, 360, 100, 20, 'normal'),
            new Platform(350, 380, 100, 20, 'moving'),
            new Platform(500, 320, 100, 20, 'normal'),
            new Platform(650, 340, 100, 20, 'moving'),
            new Platform(800, 280, 100, 20, 'normal'),
            new Platform(950, 300, 100, 20, 'moving'),
            new Platform(1100, 220, 100, 20, 'normal'),
            new Platform(150, 220, 100, 20, 'moving'),
            new Platform(300, 180, 100, 20, 'normal'),
            new Platform(450, 160, 100, 20, 'moving'),
            new Platform(600, 120, 100, 20, 'normal'),
            new Platform(750, 100, 100, 20, 'moving'),
            new Platform(900, 140, 100, 20, 'normal'),
            new Platform(600, 20, 400, 20, 'normal'),
        ],
        // Level 3
        [
            new Platform(0, 600, 400, 50, 'normal'),
            new Platform(450, 540, 100, 20, 'bouncy'),
            new Platform(600, 480, 100, 20, 'normal'),
            new Platform(750, 480, 100, 20, 'bouncy'),
            new Platform(900, 420, 100, 20, 'normal'),
            new Platform(1050, 440, 100, 20, 'bouncy'),
            new Platform(200, 380, 100, 20, 'bouncy'),
            new Platform(350, 360, 100, 20, 'normal'),
            new Platform(500, 320, 100, 20, 'bouncy'),
            new Platform(650, 300, 100, 20, 'normal'),
            new Platform(800, 320, 100, 20, 'bouncy'),
            new Platform(950, 260, 100, 20, 'normal'),
            new Platform(100, 240, 100, 20, 'bouncy'),
            new Platform(250, 200, 100, 20, 'normal'),
            new Platform(400, 220, 100, 20, 'bouncy'),
            new Platform(550, 160, 100, 20, 'normal'),
            new Platform(700, 180, 100, 20, 'bouncy'),
            new Platform(850, 120, 100, 20, 'normal'),
            new Platform(1000, 140, 100, 20, 'bouncy'),
            new Platform(600, 40, 400, 20, 'normal'),
        ],
        // Level 4
        [
            new Platform(0, 600, 400, 50, 'normal'),
            new Platform(450, 550, 100, 20, 'normal'),
            new Platform(600, 500, 100, 20, 'falling'),
            new Platform(750, 520, 100, 20, 'normal'),
            new Platform(900, 460, 100, 20, 'falling'),
            new Platform(1050, 480, 100, 20, 'normal'),
            new Platform(200, 400, 100, 20, 'falling'),
            new Platform(350, 420, 100, 20, 'normal'),
            new Platform(500, 360, 100, 20, 'falling'),
            new Platform(650, 380, 100, 20, 'normal'),
            new Platform(800, 320, 100, 20, 'falling'),
            new Platform(950, 340, 100, 20, 'normal'),
            new Platform(100, 280, 100, 20, 'falling'),
            new Platform(250, 300, 100, 20, 'normal'),
            new Platform(400, 240, 100, 20, 'falling'),
            new Platform(550, 260, 100, 20, 'normal'),
            new Platform(700, 200, 100, 20, 'falling'),
            new Platform(850, 220, 100, 20, 'normal'),
            new Platform(1000, 180, 100, 20, 'falling'),
            new Platform(600, 80, 400, 20, 'normal'),
        ],
        // Level 5
        [
            new Platform(0, 600, 400, 50, 'normal'),
            new Platform(450, 540, 100, 20, 'moving'),
            new Platform(600, 500, 100, 20, 'bouncy'),
            new Platform(750, 480, 100, 20, 'normal'),
            new Platform(900, 440, 100, 20, 'falling'),
            new Platform(1050, 460, 100, 20, 'moving'),
            new Platform(200, 380, 100, 20, 'bouncy'),
            new Platform(350, 360, 100, 20, 'normal'),
            new Platform(500, 320, 100, 20, 'moving'),
            new Platform(650, 300, 100, 20, 'falling'),
            new Platform(800, 340, 100, 20, 'bouncy'),
            new Platform(950, 280, 100, 20, 'normal'),
            new Platform(100, 240, 100, 20, 'moving'),
            new Platform(250, 220, 100, 20, 'falling'),
            new Platform(400, 200, 100, 20, 'bouncy'),
            new Platform(550, 180, 100, 20, 'normal'),
            new Platform(700, 160, 100, 20, 'moving'),
            new Platform(850, 140, 100, 20, 'bouncy'),
            new Platform(1000, 160, 100, 20, 'falling'),
            new Platform(1150, 120, 100, 20, 'normal'),
            new Platform(600, 40, 400, 20, 'normal'),
        ],
        // Level 6
        [
            new Platform(0, 600, 400, 50, 'normal'),
            new Platform(450, 560, 80, 20, 'normal'),
            new Platform(600, 520, 80, 20, 'normal'),
            new Platform(750, 480, 80, 20, 'normal'),
            new Platform(900, 520, 80, 20, 'normal'),
            new Platform(1050, 460, 80, 20, 'normal'),
            new Platform(200, 400, 80, 20, 'normal'),
            new Platform(350, 380, 80, 20, 'normal'),
            new Platform(500, 340, 80, 20, 'normal'),
            new Platform(650, 320, 80, 20, 'normal'),
            new Platform(800, 360, 80, 20, 'normal'),
            new Platform(950, 300, 80, 20, 'normal'),
            new Platform(100, 260, 80, 20, 'normal'),
            new Platform(250, 240, 80, 20, 'normal'),
            new Platform(400, 280, 80, 20, 'normal'),
            new Platform(550, 220, 80, 20, 'normal'),
            new Platform(700, 200, 80, 20, 'normal'),
            new Platform(850, 240, 80, 20, 'normal'),
            new Platform(1000, 180, 80, 20, 'normal'),
            new Platform(1150, 160, 80, 20, 'normal'),
            new Platform(600, 60, 400, 20, 'normal'),
        ],
        // Level 7
        [
            new Platform(0, 600, 400, 50, 'normal'),
            new Platform(450, 550, 100, 20, 'normal'),
            new Platform(600, 500, 100, 20, 'spike'),
            new Platform(750, 520, 100, 20, 'normal'),
            new Platform(900, 460, 100, 20, 'spike'),
            new Platform(1050, 480, 100, 20, 'normal'),
            new Platform(200, 400, 100, 20, 'normal'),
            new Platform(350, 420, 100, 20, 'spike'),
            new Platform(500, 360, 100, 20, 'normal'),
            new Platform(650, 380, 100, 20, 'spike'),
            new Platform(800, 320, 100, 20, 'normal'),
            new Platform(950, 340, 100, 20, 'spike'),
            new Platform(100, 280, 100, 20, 'normal'),
            new Platform(250, 300, 100, 20, 'spike'),
            new Platform(400, 240, 100, 20, 'normal'),
            new Platform(550, 260, 100, 20, 'spike'),
            new Platform(700, 200, 100, 20, 'normal'),
            new Platform(850, 220, 100, 20, 'spike'),
            new Platform(1000, 180, 100, 20, 'normal'),
            new Platform(600, 80, 400, 20, 'normal'),
        ],
        // Level 8
        [
            new Platform(0, 600, 400, 50, 'normal'),
            new Platform(450, 540, 100, 20, 'bouncy'),
            new Platform(600, 500, 100, 20, 'normal'),
            new Platform(750, 480, 100, 20, 'falling'),
            new Platform(900, 440, 100, 20, 'moving'),
            new Platform(1050, 460, 100, 20, 'bouncy'),
            new Platform(200, 380, 100, 20, 'normal'),
            new Platform(350, 360, 100, 20, 'falling'),
            new Platform(500, 320, 100, 20, 'bouncy'),
            new Platform(650, 300, 100, 20, 'moving'),
            new Platform(800, 340, 100, 20, 'normal'),
            new Platform(950, 280, 100, 20, 'spike'),
            new Platform(100, 240, 100, 20, 'bouncy'),
            new Platform(250, 220, 100, 20, 'moving'),
            new Platform(400, 200, 100, 20, 'falling'),
            new Platform(550, 180, 100, 20, 'bouncy'),
            new Platform(700, 160, 100, 20, 'normal'),
            new Platform(850, 140, 100, 20, 'moving'),
            new Platform(1000, 160, 100, 20, 'bouncy'),
            new Platform(1150, 120, 100, 20, 'spike'),
            new Platform(300, 80, 100, 20, 'normal'),
            new Platform(600, 40, 400, 20, 'normal'),
        ],
        // Level 9
        [
            new Platform(0, 600, 400, 50, 'normal'),
            new Platform(450, 540, 100, 20, 'moving'),
            new Platform(600, 500, 100, 20, 'spike'),
            new Platform(750, 480, 100, 20, 'bouncy'),
            new Platform(900, 440, 100, 20, 'falling'),
            new Platform(1050, 460, 100, 20, 'normal'),
            new Platform(200, 380, 100, 20, 'bouncy'),
            new Platform(350, 360, 100, 20, 'moving'),
            new Platform(500, 320, 100, 20, 'spike'),
            new Platform(650, 300, 100, 20, 'bouncy'),
            new Platform(800, 340, 100, 20, 'falling'),
            new Platform(950, 280, 100, 20, 'normal'),
            new Platform(100, 240, 100, 20, 'moving'),
            new Platform(250, 220, 100, 20, 'bouncy'),
            new Platform(400, 200, 100, 20, 'spike'),
            new Platform(550, 180, 100, 20, 'falling'),
            new Platform(700, 160, 100, 20, 'bouncy'),
            new Platform(850, 140, 100, 20, 'moving'),
            new Platform(1000, 160, 100, 20, 'normal'),
            new Platform(1150, 120, 100, 20, 'spike'),
            new Platform(300, 80, 100, 20, 'bouncy'),
            new Platform(600, 40, 400, 20, 'normal'),
        ],
        // Level 10
        [
            new Platform(0, 600, 400, 50, 'normal'),
            new Platform(450, 540, 100, 20, 'spike'),
            new Platform(600, 500, 100, 20, 'bouncy'),
            new Platform(750, 480, 100, 20, 'moving'),
            new Platform(900, 440, 100, 20, 'falling'),
            new Platform(1050, 460, 100, 20, 'spike'),
            new Platform(200, 380, 100, 20, 'bouncy'),
            new Platform(350, 360, 100, 20, 'spike'),
            new Platform(500, 320, 100, 20, 'moving'),
            new Platform(650, 300, 100, 20, 'falling'),
            new Platform(800, 340, 100, 20, 'bouncy'),
            new Platform(950, 280, 100, 20, 'spike'),
            new Platform(100, 240, 100, 20, 'moving'),
            new Platform(250, 220, 100, 20, 'spike'),
            new Platform(400, 200, 100, 20, 'bouncy'),
            new Platform(550, 180, 100, 20, 'falling'),
            new Platform(700, 160, 100, 20, 'spike'),
            new Platform(850, 140, 100, 20, 'bouncy'),
            new Platform(1000, 160, 100, 20, 'moving'),
            new Platform(1150, 120, 100, 20, 'spike'),
            new Platform(300, 80, 100, 20, 'bouncy'),
            new Platform(450, 60, 100, 20, 'moving'),
            new Platform(600, 40, 400, 20, 'normal'),
        ]
    ];
}

    startGame() {
        this.currentLevel = 0;
        this.gameRunning = true;
        document.getElementById('main-menu').classList.add('hidden');
        this.loadLevel(0);
        this.gameLoop();
    }

    loadLevel(levelIndex) {
        this.currentLevel = levelIndex;
        this.platforms = this.levels[levelIndex];
        
        // Spawn on the first platform
        const firstPlatform = this.platforms[0];
        this.player = new Player(firstPlatform.x + firstPlatform.width / 2, firstPlatform.y - 40);
        
        this.levelStartTime = Date.now();
        document.getElementById('level-number').textContent = levelIndex + 1;
        document.getElementById('level-title').textContent = this.levelThemes[levelIndex].name;
    }

    gameLoop() {
        const theme = this.levelThemes[this.currentLevel];
        
        this.ctx.fillStyle = theme.bg;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.keys['arrowright'] || this.keys['d']) {
            this.player.moveRight();
        } else if (this.keys['arrowleft'] || this.keys['a']) {
            this.player.moveLeft();
        } else {
            this.player.stop();
        }

        this.player.update();

        for (let platform of this.platforms) {
            platform.update();
            platform.draw(this.ctx, theme);

            if (platform.collidesWith(this.player.getRect())) {
                if (platform.type === 'spike') {
                    this.endLevel(false);
                    return;
                }

                if (platform.touchesTop(this.player.getRect())) {
                    this.player.velocityY = 0;
                    this.player.y = platform.y - this.player.height / 2;
                    this.player.isJumping = false;

                    if (platform.type === 'bouncy') {
                        this.player.velocityY = -platform.bouncePower;
                        this.player.canDoubleJump = true;
                    }

                    if (platform.type === 'falling') {
                        platform.isFalling = true;
                        platform.fallDelay = 30;
                    }
                }
            }
        }

        this.player.draw(this.ctx, theme);

        if (this.player.y > this.canvas.height || this.player.x < -50 || this.player.x > this.canvas.width + 50) {
            this.endLevel(false);
            return;
        }

        const topPlatform = this.platforms[this.platforms.length - 1];
        if (this.player.getRect().y < topPlatform.y && 
            this.player.getRect().x < topPlatform.x + topPlatform.width &&
            this.player.getRect().x + this.player.getRect().width > topPlatform.x) {
            this.endLevel(true);
            return;
        }

        const elapsed = (Date.now() - this.levelStartTime) / 1000;
        document.getElementById('timer').textContent = elapsed.toFixed(1) + 's';

        if (this.gameRunning) {
            requestAnimationFrame(() => this.gameLoop());
        }
    }

    endLevel(won) {
        this.gameRunning = false;
        const elapsed = (Date.now() - this.levelStartTime) / 1000;
        document.getElementById('completion-time').textContent = `Time: ${elapsed.toFixed(1)}s`;

        if (won) {
            if (this.currentLevel < 9) {
                document.getElementById('level-complete').classList.remove('hidden');
            } else {
                document.getElementById('level-complete').innerHTML = `
                    <div class="modal-content">
                        <h2>🎉 All Levels Complete! 🎉</h2>
                        <p>You've mastered Parkour Masters!</p>
                        <p id="completion-time">Total Time: ${elapsed.toFixed(1)}s</p>
                        <button onclick="goToMenu()">Main Menu</button>
                    </div>
                `;
                document.getElementById('level-complete').classList.remove('hidden');
            }
        } else {
            document.getElementById('game-over').classList.remove('hidden');
        }
    }

    restartLevel() {
        document.getElementById('level-complete').classList.add('hidden');
        document.getElementById('game-over').classList.add('hidden');
        this.loadLevel(this.currentLevel);
        this.gameRunning = true;
        this.gameLoop();
    }
}

let game;

function startGame() {
    game = new Game();
    game.startGame();
}

function nextLevel() {
    if (game.currentLevel < 9) {
        document.getElementById('level-complete').classList.add('hidden');
        game.loadLevel(game.currentLevel + 1);
        game.gameRunning = true;
        game.gameLoop();
    }
}

function restartLevel() {
    game.restartLevel();
}

function goToMenu() {
    document.getElementById('level-complete').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
}

// Event listeners - CSP compliant
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-start-game').addEventListener('click', () => {
        gameInstance = new Game();
        gameInstance.startGame();
    });

    document.getElementById('btn-next-level').addEventListener('click', () => {
        if (gameInstance.currentLevel < 9) {
            document.getElementById('level-complete').classList.add('hidden');
            gameInstance.loadLevel(gameInstance.currentLevel + 1);
            gameInstance.gameRunning = true;
            gameInstance.gameLoop();
        }
    });

    document.getElementById('btn-retry-level').addEventListener('click', () => {
        gameInstance.restartLevel();
    });

    document.getElementById('btn-menu-from-gameover').addEventListener('click', () => {
        document.getElementById('level-complete').classList.add('hidden');
        document.getElementById('game-over').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    });
});

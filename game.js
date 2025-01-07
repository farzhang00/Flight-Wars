// 在文件开头添加触摸事件相关变量
let touchStartX = 0;
let touchStartY = 0;
let isTouching = false;
let gameInstance = null; // 添加全局游戏实例

// 添加触摸事件监听
document.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isTouching = true;
    e.preventDefault(); // 防止页面滚动
});

document.addEventListener('touchmove', (e) => {
    if (!isTouching || !gameInstance) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    
    const player = gameInstance.player;
    const canvas = gameInstance.canvas;
    
    if (player) {
        const newX = player.x + deltaX;
        const newY = player.y + deltaY;
        
        player.x = Math.max(0, Math.min(canvas.width - player.width, newX));
        player.y = Math.max(0, Math.min(canvas.height - player.height, newY));
    }
    
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    e.preventDefault();
});

document.addEventListener('touchend', () => {
    isTouching = false;
});

// 定义子弹类型
const BULLET_TYPES = {
    NORMAL: 'normal',
    SCATTER: 'scatter',
    LASER: 'laser',
    MISSILE: 'missile'
};

// 键盘控制状态
const keys = {
    left: false,
    right: false,
    up: false,
    down: false,
    m: false
};

// 键盘事件监听
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'ArrowRight') keys.right = true;
    if (e.key === 'ArrowUp') keys.up = true;
    if (e.key === 'ArrowDown') keys.down = true;
    if (e.key === 'm' || e.key === 'M') keys.m = true;
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'ArrowRight') keys.right = false;
    if (e.key === 'ArrowUp') keys.up = false;
    if (e.key === 'ArrowDown') keys.down = false;
    if (e.key === 'm' || e.key === 'M') keys.m = false;
});

// 碰撞检测函数
function checkCollision(rect1, rect2) {
    const tolerance = Math.min(rect1.width, rect1.height, rect2.width, rect2.height) * 0.1;
    
    const r1 = {
        left: rect1.x + tolerance,
        right: rect1.x + rect1.width - tolerance,
        top: rect1.y + tolerance,
        bottom: rect1.y + rect1.height - tolerance
    };
    
    const r2 = {
        left: rect2.x + tolerance,
        right: rect2.x + rect2.width - tolerance,
        top: rect2.y + tolerance,
        bottom: rect2.y + rect2.height - tolerance
    };
    
    return !(r1.left > r2.right || 
             r1.right < r2.left || 
             r1.top > r2.bottom ||
             r1.bottom < r2.top);
}

// 在文件开头添加资源路径配置
const ASSETS = {
    PLAYER: 'assets/images/Player.png',
    ENEMY: 'assets/images/Enemy.png',
    ENEMY_ELITE: 'assets/images/Enemy02.png',
    POWERUP: {
        NORMAL: 'assets/images/01.png',
        SCATTER: 'assets/images/02.png',
        LASER: 'assets/images/03.png',
        MISSILE: 'assets/images/04.png'
    }
};

// Player 类
class Player {
    constructor(x, y, canvas) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 50;
        this.speed = 8;
        this.score = 0;
        this.lives = 3;
        this.missiles = 3;
        this.bulletType = BULLET_TYPES.NORMAL;
        this.bulletLevel = 1;
        this.lastShot = 0;
        this.shootInterval = 200;
        this.canvas = canvas;
        this.invincible = false;
        this.visible = true;
        this.image = new Image();
        this.image.src = ASSETS.PLAYER;
    }

    move() {
        if (keys.left && this.x > 0) this.x -= this.speed;
        if (keys.right && this.x < this.canvas.width - this.width) this.x += this.speed;
        if (keys.up && this.y > 0) this.y -= this.speed;
        if (keys.down && this.y < this.canvas.height - this.height) this.y += this.speed;
    }

    draw(ctx) {
        if (!this.visible) return;
        
        ctx.globalAlpha = this.invincible ? 0.5 : 1;
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        ctx.globalAlpha = 1;
    }

    shoot() {
        const currentTime = Date.now();
        if (currentTime - this.lastShot < this.shootInterval) return [];

        this.lastShot = currentTime;
        const newBullets = [];

        switch (this.bulletType) {
            case BULLET_TYPES.NORMAL:
                newBullets.push(new Bullet(
                    this.x + this.width / 2 - 2.5,
                    this.y,
                    0,
                    this.bulletType,
                    this.bulletLevel
                ));
                break;
            case BULLET_TYPES.SCATTER:
                const angles = [-30, 0, 30];
                for (let i = 0; i < this.bulletLevel; i++) {
                    angles.forEach(angle => {
                        newBullets.push(new Bullet(
                            this.x + this.width / 2 - 2.5,
                            this.y,
                            angle,
                            this.bulletType,
                            this.bulletLevel
                        ));
                    });
                }
                break;
            case BULLET_TYPES.LASER:
                newBullets.push(new Bullet(
                    this.x + this.width / 2 - 2.5 * this.bulletLevel,
                    this.y,
                    0,
                    this.bulletType,
                    this.bulletLevel
                ));
                break;
        }
        return newBullets;
    }

    fireMissile(missilesArray) {
        if (this.missiles > 0) {
            this.missiles--;
            const missileX = this.x + this.width / 2 - 5; // 导弹从玩家中心发射
            const missileY = this.y;
            const missile = new Missile(missileX, missileY);
            missilesArray.push(missile);
        } else {
            console.log("没有剩余的导弹。");
        }
    }
}

// Bullet 类
class Bullet {
    constructor(x, y, angle, type, level) {
        this.x = x;
        this.y = y;
        this.speed = 7;
        this.type = type;
        this.level = level;
        this.angle = angle * Math.PI / 180; // 转换为弧度

        switch (type) {
            case BULLET_TYPES.NORMAL:
                this.width = 5;
                this.height = 10;
                this.damage = 1;
                break;
            case BULLET_TYPES.SCATTER:
                this.width = 4;
                this.height = 8;
                this.damage = 1;
                break;
            case BULLET_TYPES.LASER:
                this.width = 5 * level;
                this.height = 15;
                this.damage = 2;
                break;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        switch (this.type) {
            case BULLET_TYPES.NORMAL:
                ctx.fillStyle = 'yellow';
                break;
            case BULLET_TYPES.SCATTER:
                ctx.fillStyle = 'orange';
                break;
            case BULLET_TYPES.LASER:
                ctx.fillStyle = 'cyan';
                break;
        }

        ctx.fillRect(0, 0, this.width, this.height);
        ctx.restore();
    }

    update() {
        const speedX = Math.sin(this.angle) * this.speed;
        const speedY = -Math.cos(this.angle) * this.speed;
        this.x += speedX;
        this.y += speedY;
    }
}

// PowerUp 类
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.type = type;
        this.speed = 2;
        this.image = new Image();
        
        // 根据类型加载对应图片
        switch(type) {
            case BULLET_TYPES.NORMAL:
                this.image.src = ASSETS.POWERUP.NORMAL;
                break;
            case BULLET_TYPES.SCATTER:
                this.image.src = ASSETS.POWERUP.SCATTER;
                break;
            case BULLET_TYPES.LASER:
                this.image.src = ASSETS.POWERUP.LASER;
                break;
            case BULLET_TYPES.MISSILE:
                this.image.src = ASSETS.POWERUP.MISSILE;
                break;
        }
    }

    draw(ctx) {
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    }

    update() {
        this.y += this.speed;
    }
}

// Enemy 类
class Enemy {
    constructor(type = 'normal', canvas) {
        this.type = type;
        this.width = type === 'boss' ? 100 : type === 'elite' ? 60 : 40;
        this.height = type === 'boss' ? 100 : type === 'elite' ? 60 : 40;
        
        // 确保敌人在画布顶部之外生成
        this.y = -this.height * 2;
        
        // 限制生成位置范围，避免靠近边缘
        const margin = 50;
        this.x = Math.random() * (canvas.width - this.width - margin * 2) + margin;
        
        // 调整速度
        this.speed = type === 'elite' ? 1.5 : 1;
        this.health = type === 'boss' ? 200 : type === 'elite' ? 8 : 2;
        this.maxHealth = this.health;
        this.canvas = canvas;
        
        if (type === 'elite') {
            this.angle = Math.random() * Math.PI * 2;
            this.changeDirectionTime = Date.now() + Math.random() * 2000 + 1000;
        }

        // 加载不同类型敌机的图像
        this.image = new Image();
        if (this.type === 'elite') {
            this.image.src = ASSETS.ENEMY_ELITE;
        } else if (this.type === 'boss') {
            this.image.src = ASSETS.ENEMY; // 暂时使用普通敌机图片
        } else {
            this.image.src = ASSETS.ENEMY;
        }
    }

    draw(ctx) {
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);

        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        const healthBarWidth = this.width;
        const healthBarHeight = 5;
        const healthPercentage = this.health / this.maxHealth;

        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y - 10, healthBarWidth, healthBarHeight);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x, this.y - 10, healthBarWidth * healthPercentage, healthBarHeight);
    }

    update() {
        this.y += this.speed; // 敌人向下移动
    }

    takeDamage(damage) {
        this.health -= damage;
        return this.health <= 0;
    }
}

// 增加精英飞机的攻击
class EliteEnemy extends Enemy {
    constructor(canvas) {
        super('elite', canvas);
        this.shootInterval = 1000; // 每秒发射一次
        this.lastShot = 0;
    }

    update() {
        super.update();
        const currentTime = Date.now();
        if (currentTime - this.lastShot > this.shootInterval) {
            this.shoot(); // 直接调用 shoot 方法
            this.lastShot = currentTime;
        }
    }

    shoot() {
        // 发射子弹的逻辑
        const bullet = new Bullet(this.x + this.width / 2, this.y + this.height, 180, BULLET_TYPES.NORMAL, 1);
        if (gameInstance) { // 使用全局的 gameInstance
            gameInstance.bullets.push(bullet);
        }
    }
}

// 增加BOSS
class BossEnemy extends Enemy {
    constructor(canvas) {
        super('boss', canvas);
        this.health = 200; // BOSS的血量
        this.attackModes = ['normal', 'scatter', 'laser'];
        this.currentMode = 0;
        this.shootInterval = 2000; // 每2秒切换攻击模式
        this.lastModeChange = 0;
    }

    update() {
        super.update();
        const currentTime = Date.now();
        if (currentTime - this.lastModeChange > this.shootInterval) {
            this.currentMode = (this.currentMode + 1) % this.attackModes.length;
            this.lastModeChange = currentTime;
        }
        this.shoot();
    }

    shoot() {
        // 根据当前模式发射子弹
        switch (this.attackModes[this.currentMode]) {
            case 'normal':
                game.bullets.push(new Bullet(this.x + this.width / 2, this.y + this.height, 180, BULLET_TYPES.NORMAL, 1));
                break;
            case 'scatter':
                const angles = [160, 180, 200];
                angles.forEach(angle => {
                    game.bullets.push(new Bullet(this.x + this.width / 2, this.y + this.height, angle, BULLET_TYPES.SCATTER, 1));
                });
                break;
            case 'laser':
                game.bullets.push(new Bullet(this.x + this.width / 2, this.y + this.height, 180, BULLET_TYPES.LASER, 1));
                break;
        }
    }
}

// 游戏配置
const GAME_CONFIG = {
    SPAWN_RATES: {
        NORMAL_ENEMY: 2000,  // 普通敌人生成间隔(ms)
        ELITE_ENEMY: 5000,   // 精英敌人生成间隔(ms)
        BOSS: 180000         // Boss生成时间(ms)
    },
    POWERUP: {
        DROP_CHANCE: 0.2,    // 道具掉落概率
        MAX_LEVEL: 3         // 最大等级
    },
    PLAYER: {
        INITIAL_LIVES: 3,
        INVINCIBLE_TIME: 2000,
        INITIAL_MISSILES: 3
    }
};

// 游戏状态管理
const gameState = {
    isRunning: false,
    isPaused: false,
    wave: 1,
    bossSpawned: false,
    startTime: 0,
    lastSpawnTimes: {
        normalEnemy: 0,
        eliteEnemy: 0
    },
    statistics: {
        enemiesDestroyed: 0,
        powerUpsCollected: 0,
        missilesUsed: 0
    }
};

// 修改初始化游戏函数
function initGame() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    
    // 设置画布大小为窗口大小
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Failed to get canvas context!');
        return;
    }
    
    // 初始化游戏状态
    gameState.isRunning = true;
    gameState.isPaused = false;
    gameState.wave = 1;
    gameState.startTime = Date.now();
    gameState.bossSpawned = false;
    
    // 创建游戏对象
    const game = {
        canvas,
        ctx,
        player: new Player(canvas.width / 2 - 25, canvas.height - 100, canvas),
        bullets: [],
        enemies: [],
        powerUps: [],
        missiles: [],
        lastEnemySpawn: 0,
        lastEliteSpawn: 0
    };
    
    // 隐藏加载提示
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
    
    return game;
}

// 修改游戏主循环
function gameLoop(game) {
    if (!game || !gameState.isRunning) {
        console.error('Game not properly initialized!');
        return;
    }
    
    const { canvas, ctx, player, bullets, enemies, powerUps, missiles } = game;
    
    if (gameState.isPaused) {
        requestAnimationFrame(() => gameLoop(game));
        return;
    }
    
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制背景
    drawBackground(ctx, canvas);
    
    // 更新玩家
    player.move();
    player.draw(ctx);
    
    // 检查玩家生命值
    if (player.lives <= 0) {
        gameOver(game); // 调用游戏结束处理函数
        return; // 结束游戏循环
    }
    
    // 处理射击
    const newBullets = player.shoot();
    bullets.push(...newBullets);
    
    // 生成敌人
    const currentTime = Date.now();
    if (currentTime - game.lastEnemySpawn > GAME_CONFIG.SPAWN_RATES.NORMAL_ENEMY) {
        enemies.push(spawnEnemy('normal', canvas, player));
        game.lastEnemySpawn = currentTime;
    }
    
    if (currentTime - game.lastEliteSpawn > GAME_CONFIG.SPAWN_RATES.ELITE_ENEMY) {
        enemies.push(spawnEnemy('elite', canvas, player));
        game.lastEliteSpawn = currentTime;
    }
    
    // 更新和绘制子弹
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update();
        bullets[i].draw(ctx);
        
        // 移除超出屏幕的子弹
        if (bullets[i].y < 0) {
            bullets.splice(i, 1);
        }
    }
    
    // 更新和绘制敌人
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update();
        enemies[i].draw(ctx);
        
        // 移除超出屏幕的敌人
        if (enemies[i].y > canvas.height) {
            enemies.splice(i, 1);
        }
    }
    
    // 更新和绘制道具
    for (let i = powerUps.length - 1; i >= 0; i--) {
        powerUps[i].update();
        powerUps[i].draw(ctx);
        
        // 移除超出屏幕的道具
        if (powerUps[i].y > canvas.height) {
            powerUps.splice(i, 1);
        }
    }
    
    // 更新和绘制导弹
    for (let i = missiles.length - 1; i >= 0; i--) {
        missiles[i].update();
        missiles[i].draw(ctx);
        
        // 移除超出屏幕的导弹
        if (missiles[i].y < 0) {
            missiles.splice(i, 1);
        }
    }
    
    // 检查碰撞
    checkCollisions(game);
    
    // 绘制UI
    drawUI(ctx, player, gameState, canvas);
    
    // 继续游戏循环
    requestAnimationFrame(() => gameLoop(game));
}

// 生成道具
function spawnPowerUp(x, y) {
    if (Math.random() < GAME_CONFIG.POWERUP.DROP_CHANCE) {
        const types = Object.values(BULLET_TYPES);
        const randomType = types[Math.floor(Math.random() * types.length)];
        return new PowerUp(x, y, randomType);
    }
    return null;
}

// 添加碰撞检测函数
function checkCollisions(game) {
    const { player, bullets, enemies, powerUps, missiles } = game;
    
    // 检查子弹与敌人的碰撞
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (checkCollision(bullets[i], enemies[j])) {
                const isDestroyed = enemies[j].takeDamage(bullets[i].damage);
                
                if (isDestroyed) {
                    player.score += enemies[j].type === 'elite' ? 5 : 2;
                    gameState.statistics.enemiesDestroyed++;
                    
                    // 生成道具
                    const powerUp = spawnPowerUp(enemies[j].x, enemies[j].y);
                    if (powerUp) {
                        powerUps.push(powerUp);
                    }
                    
                    enemies.splice(j, 1);
                }
                
                if (bullets[i].type !== BULLET_TYPES.LASER) {
                    bullets.splice(i, 1);
                    break;
                }
            }
        }
    }
    
    // 检查玩家与道具的碰撞
    for (let i = powerUps.length - 1; i >= 0; i--) {
        if (checkCollision(player, powerUps[i])) {
            if (powerUps[i].type === BULLET_TYPES.MISSILE) {
                player.missiles++;
            } else {
                if (player.bulletType === powerUps[i].type) {
                    player.bulletLevel = Math.min(player.bulletLevel + 1, 3);
                } else {
                    player.bulletType = powerUps[i].type;
                    player.bulletLevel = 1;
                }
            }
            gameState.statistics.powerUpsCollected++;
            powerUps.splice(i, 1);
        }
    }
    
    // 检查玩家与敌人的碰撞
    if (!player.invincible) {
        for (let i = enemies.length - 1; i >= 0; i--) {
            if (checkCollision(player, enemies[i])) {
                player.lives--;
                player.invincible = true;
                setTimeout(() => {
                    player.invincible = false;
                }, GAME_CONFIG.PLAYER.INVINCIBLE_TIME);
                
                enemies.splice(i, 1);
                break;
            }
        }
    }
}

// 添加 drawBackground 函数
function drawBackground(ctx, canvas) {
    // 绘制黑色背景
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制星星
    ctx.fillStyle = 'white';
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ctx.fillRect(x, y, 1, 1);
    }
}

// 添加 spawnEnemy 函数
function spawnEnemy(type, canvas, player) {
    if (type === 'elite') {
        return new EliteEnemy(canvas);
    } else {
        return new Enemy('normal', canvas);
    }
}

// 添加 drawUI 函数
function drawUI(ctx, player, gameState, canvas) {
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    
    // 显示分数
    ctx.fillText(`分数: ${player.score}`, 10, 30);
    
    // 显示生命值
    ctx.fillText(`生命: ${player.lives}`, 10, 60);
    
    // 显示导弹数量
    ctx.fillText(`导弹: ${player.missiles}`, 10, 90);
    
    // 显示当前武器类型和等级
    ctx.fillText(`武器: ${player.bulletType} Lv.${player.bulletLevel}`, 10, 120);
}

// 在文件开头添加 gameStartTime 变量
let gameStartTime = 0;

// 修改游戏启动代码，确保在所有资源加载完成后才开始游戏
document.addEventListener('DOMContentLoaded', () => {
    // 预加载所有图片资源
    const images = [
        ASSETS.PLAYER,
        ASSETS.ENEMY,
        ASSETS.ENEMY_ELITE,
        ASSETS.POWERUP.NORMAL,
        ASSETS.POWERUP.SCATTER,
        ASSETS.POWERUP.LASER,
        ASSETS.POWERUP.MISSILE
    ];

    let loadedImages = 0;
    let loadedSuccessfully = true;

    images.forEach(src => {
        const img = new Image();
        img.onload = () => {
            loadedImages++;
            if (loadedImages === images.length && loadedSuccessfully) {
                // 所有图片加载完成后启动游戏
                gameInstance = initGame();
                if (gameInstance) {
                    gameStartTime = Date.now();
                    gameLoop(gameInstance);
                }
            }
        };
        img.onerror = () => {
            loadedSuccessfully = false;
            console.error(`Failed to load image: ${src}`);
            const loadingElement = document.getElementById('loading');
            if (loadingElement) {
                loadingElement.textContent = '图片资源加载失败，请刷新页面重试';
            }
        };
        img.src = src;
    });
});

// 假设有一个角色对象，包含速度和攻击力属性
let player = {
    speed: 10, // 初始速度
    attackPower: 5, // 初始攻击力
    // ...
};

// 假设有一个函数用于处理道具升级
function upgradeItem() {
    // 增加速度和攻击力
    player.speed += 5; // 每次升级增加5点速度
    player.attackPower += 3; // 每次升级增加3点攻击力

    console.log(`Player speed: ${player.speed}, attack power: ${player.attackPower}`);
}

// 假设有一个函数用于发射导弹
function fireMissile() {
    // 检查导弹是否可以发射
    if (canFireMissile()) {
        // 发射导弹的逻辑
        console.log("Missile fired!");
        // 这里可以添加导弹发射的具体实现
    } else {
        console.log("Cannot fire missile.");
    }
}

function canFireMissile() {
    // 检查导弹发射条件
    // 例如：检查是否有足够的导弹库存
    return true; // 假设条件满足
}

class Missile {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 10;
        this.height = 30;
        this.speed = 7;
        this.active = true;
    }

    draw(ctx) {
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    update() {
        this.y -= this.speed;
    }
}

// 游戏结束处理函数
function gameOver(game) {
    gameState.isRunning = false; // 停止游戏运行

    const ctx = game.ctx;
    const canvas = game.canvas;

    // 绘制半透明黑色背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 显示游戏结束信息
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 50);
    ctx.font = '24px Arial';
    ctx.fillText(`最终得分: ${game.player.score}`, canvas.width / 2, canvas.height / 2);
    ctx.fillText('按空格键重新开始', canvas.width / 2, canvas.height / 2 + 50);

    // 添加空格键重新开始游戏的事件监听
    document.addEventListener('keydown', function restartGame(e) {
        if (e.code === 'Space') {
            document.removeEventListener('keydown', restartGame); // 移除事件监听器
            gameInstance = initGame(); // 重新初始化游戏
            if (gameInstance) {
                gameStartTime = Date.now();
                gameLoop(gameInstance); // 启动游戏循环
            }
        }
    });
} 

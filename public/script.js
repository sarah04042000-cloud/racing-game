const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Load Images
const playerCarImg = new Image();
playerCarImg.src = 'images/player_car.png';

const enemyCarRedImg = new Image();
enemyCarRedImg.src = 'images/enemy_car_red.png';

const enemyCarYellowImg = new Image();
enemyCarYellowImg.src = 'images/enemy_car_yellow.png';

const enemyCarGreenImg = new Image();
enemyCarGreenImg.src = 'images/enemy_car_green.png';

const enemyCarPurpleImg = new Image();
enemyCarPurpleImg.src = 'images/enemy_car_purple.png';

const enemyImages = [enemyCarRedImg, enemyCarYellowImg, enemyCarGreenImg, enemyCarPurpleImg];

// Game UI Elements
const startScreen = document.getElementById('startScreen');
const gameScreen = document.getElementById('gameScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const leaderboardScreen = document.getElementById('leaderboardScreen');
const currentScoreEl = document.getElementById('currentScore');
const finalScoreEl = document.getElementById('finalScore');
const submitMessage = document.getElementById('submitMessage');
const leaderboardBody = document.getElementById('leaderboardBody');
const usernameInput = document.getElementById('usernameInput');

// Buttons
const startBtn = document.getElementById('startBtn');
const viewLeaderboardBtn = document.getElementById('viewLeaderboardBtn');
const restartBtn = document.getElementById('restartBtn');
const gameOverLeaderboardBtn = document.getElementById('gameOverLeaderboardBtn');
const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
const submitScoreBtn = document.getElementById('submitScoreBtn');

// Set canvas dimensions to match container
canvas.width = 400;
canvas.height = 700;

// Game State
let isPlaying = false;
let score = 0;
let frameCount = 0;
let animationId;
let gameSpeed = 5;

// Audio context variables
let audioCtx;
let engineOscillator;
let engineGain;
let engineFilter;

// Entities
const player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 100,
    width: 50,
    height: 80,
    speed: 7,
    dx: 0,
    color: '#3b82f6'
};

let enemies = [];
let lines = [];

// Input handling
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    a: false,
    d: false
};

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
});

// Touch input handling
let touchX = null;

window.addEventListener('touchstart', (e) => {
    if (isPlaying && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
        e.preventDefault(); 
    }
    touchX = e.touches[0].clientX;
    handleTouch(touchX);
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    if (isPlaying && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
    }
    touchX = e.touches[0].clientX;
    handleTouch(touchX);
}, { passive: false });

window.addEventListener('touchend', (e) => {
    if (isPlaying && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
    }
    touchX = null;
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
});

function handleTouch(x) {
    if (!isPlaying) return;
    if (x < window.innerWidth / 2) {
        keys.ArrowLeft = true;
        keys.ArrowRight = false;
    } else {
        keys.ArrowLeft = false;
        keys.ArrowRight = true;
    }
}

// Device orientation (tilt to move)
window.addEventListener('deviceorientation', (e) => {
    if (!isPlaying) return;
    
    // gamma is the left-to-right tilt in degrees, where right is positive
    const tilt = e.gamma;
    
    // Check if device orientation data is available
    if (tilt !== null) {
        if (tilt > 15) { // Tilt right
            keys.ArrowRight = true;
            keys.ArrowLeft = false;
        } else if (tilt < -15) { // Tilt left
            keys.ArrowLeft = true;
            keys.ArrowRight = false;
        } else { // Neutral
            if (touchX === null) {
                keys.ArrowLeft = false;
                keys.ArrowRight = false;
            }
        }
    }
});

// Engine Sound Audio
function initAudio() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function startEngineSound() {
    if (!audioCtx) initAudio();
    if (!audioCtx) return; 
    
    if (engineOscillator) {
        try { engineOscillator.stop(); } catch(e) {}
    }
    
    engineOscillator = audioCtx.createOscillator();
    engineFilter = audioCtx.createBiquadFilter();
    engineGain = audioCtx.createGain();
    
    engineOscillator.type = 'sawtooth';
    engineOscillator.frequency.value = 50; 
    
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 400; 
    
    engineGain.gain.setValueAtTime(0, audioCtx.currentTime);
    engineGain.gain.linearRampToValueAtTime(0.8, audioCtx.currentTime + 0.5); 
    
    engineOscillator.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(audioCtx.destination);
    
    engineOscillator.start();
}

function stopEngineSound() {
    if (engineGain && audioCtx) {
        engineGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
        setTimeout(() => {
            if (engineOscillator) {
                try { engineOscillator.stop(); } catch(e) {}
                engineOscillator.disconnect();
                engineOscillator = null;
            }
        }, 200);
    }
}

function updateEngineSound() {
    if (engineOscillator && audioCtx && isPlaying) {
        let targetFreq = 30 + (gameSpeed * 6); 
        if (keys.ArrowLeft || keys.ArrowRight) {
            targetFreq += 10; 
        }
        engineOscillator.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.1);
    }
}

function playCrashSound() {
    if (!audioCtx) return;
    
    const bufferSize = audioCtx.sampleRate * 2; // 2 seconds
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1; // White noise
    }
    
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.5); // Filter sweeps down
    
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(2.0, audioCtx.currentTime); // VERY LOUD
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.0); // Fades out
    
    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    noiseSource.start();
    noiseSource.stop(audioCtx.currentTime + 2);
}

// Initialize road lines
function initLines() {
    lines = [];
    for (let i = 0; i < canvas.height / 50; i++) {
        lines.push({
            x: canvas.width / 2 - 5,
            y: i * 50,
            width: 10,
            height: 30,
            speed: gameSpeed
        });
    }
}

// Reset Game
function resetGame() {
    player.x = canvas.width / 2 - 25;
    player.dx = 0;
    enemies = [];
    score = 0;
    frameCount = 0;
    gameSpeed = 5;
    currentScoreEl.textContent = score;
    initLines();
    submitMessage.textContent = '';
    submitMessage.style.color = '';
    submitScoreBtn.disabled = false;
    usernameInput.value = '';
}

// Draw Player Car
function drawPlayer() {
    if (playerCarImg.complete && playerCarImg.naturalHeight !== 0) {
        ctx.shadowColor = player.color;
        ctx.shadowBlur = 15;
        ctx.drawImage(playerCarImg, player.x, player.y, player.width, player.height);
        ctx.shadowBlur = 0;
    } else {
        // Fallback Glow effect
        ctx.shadowColor = player.color;
        ctx.shadowBlur = 15;
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, player.width, player.height);
        
        // Details
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(player.x + 5, player.y + 10, player.width - 10, player.height - 20);
        // Window
        ctx.fillStyle = '#93c5fd';
        ctx.fillRect(player.x + 10, player.y + 20, player.width - 20, 15);
    }
}

// Draw Enemies
function drawEnemies() {
    enemies.forEach(enemy => {
        if (enemy.image && enemy.image.complete && enemy.image.naturalHeight !== 0) {
            ctx.shadowColor = enemy.color;
            ctx.shadowBlur = 10;
            ctx.drawImage(enemy.image, enemy.x, enemy.y, enemy.width, enemy.height);
            ctx.shadowBlur = 0;
        } else {
            ctx.shadowColor = enemy.color;
            ctx.shadowBlur = 10;
            ctx.fillStyle = enemy.color;
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            ctx.shadowBlur = 0;
        }
    });
}

// Draw Road Lines
function drawLines() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    lines.forEach(line => {
        ctx.fillRect(line.x, line.y, line.width, line.height);
    });
}

// Update Game State
function update() {
    // Player Movement
    if ((keys.ArrowLeft || keys.a) && player.x > 0) {
        player.dx = -player.speed;
    } else if ((keys.ArrowRight || keys.d) && player.x + player.width < canvas.width) {
        player.dx = player.speed;
    } else {
        player.dx = 0;
    }
    player.x += player.dx;

    // Line movement
    lines.forEach(line => {
        line.y += gameSpeed;
        if (line.y > canvas.height) {
            line.y = -50;
        }
    });

    // Spawn Enemies - Dynamic traffic handling
    const spawnRate = Math.max(30, 80 - Math.floor(gameSpeed * 2));
    if (frameCount % spawnRate === 0) {
        // Divide road into 4 distinct lanes
        const lanes = [25, 125, 225, 325];
        const enemyX = lanes[Math.floor(Math.random() * lanes.length)];
        
        const enemyColors = ['#ef4444', '#f59e0b', '#10b981', '#a855f7'];
        const randomIdx = Math.floor(Math.random() * enemyColors.length);
        
        // Ensure traffic isn't too clustered by checking if a car just spawned in this lane
        let safeToSpawn = true;
        for (let enemy of enemies) {
            if (enemy.x === enemyX && enemy.y < 100) {
                safeToSpawn = false;
                break;
            }
        }
        
        if (safeToSpawn) {
            enemies.push({
                x: enemyX,
                y: -100,
                width: 50,
                height: 80,
                speed: gameSpeed * (Math.random() * 0.4 + 0.8), // Variable traffic speed
                color: enemyColors[randomIdx],
                image: enemyImages[randomIdx]
            });
        }
    }

    // Update Enemies
    for (let i = 0; i < enemies.length; i++) {
        let enemy = enemies[i];
        enemy.y += enemy.speed;

        // Collision Detection
        if (
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.height + player.y > enemy.y
        ) {
            gameOver();
        }

        // Remove off-screen enemies and increase score
        if (enemy.y > canvas.height) {
            enemies.splice(i, 1);
            i--;
            score += 10;
            currentScoreEl.textContent = score;
            
            // Increase difficulty
            if (score % 100 === 0) {
                gameSpeed += 0.5;
            }
        }
    }

    // Score over time
    if (frameCount % 10 === 0) {
        score++;
        currentScoreEl.textContent = score;
    }

    // Update engine pitch based on game state
    updateEngineSound();

    frameCount++;
}

// Game Loop
function gameLoop() {
    if (!isPlaying) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawLines();
    drawPlayer();
    drawEnemies();
    update();

    animationId = requestAnimationFrame(gameLoop);
}

// Start Game
function startGame() {
    initAudio(); 
    resetGame();
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    leaderboardScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    isPlaying = true;
    startEngineSound();
    gameLoop();
}

// Game Over
function gameOver() {
    if (!isPlaying) return; // Prevent multiple triggers
    isPlaying = false;
    stopEngineSound();
    playCrashSound(); // Trigger loud crash sound
    cancelAnimationFrame(animationId);
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    finalScoreEl.textContent = score;
}

// API Integration
const API_URL = '/api/scores';

async function submitScore() {
    const username = usernameInput.value.trim();
    if (!username) {
        submitMessage.textContent = 'Please enter a username';
        submitMessage.style.color = '#ef4444';
        return;
    }

    submitScoreBtn.disabled = true;
    submitMessage.textContent = 'Submitting...';
    submitMessage.style.color = 'var(--text-muted)';

    const localScore = { username, score };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(localScore)
        });

        if (response.ok) {
            submitMessage.textContent = 'Score submitted successfully!';
            submitMessage.style.color = '#10b981';
            submitScoreBtn.style.display = 'none';
        } else {
            throw new Error('Failed to submit');
        }
    } catch (error) {
        // Fallback to offline localStorage
        let offlineScores = JSON.parse(localStorage.getItem('offlineScores') || '[]');
        offlineScores.push(localScore);
        offlineScores.sort((a, b) => b.score - a.score);
        offlineScores = offlineScores.slice(0, 10); // Keep top 10
        localStorage.setItem('offlineScores', JSON.stringify(offlineScores));
        
        submitMessage.textContent = 'Saved offline!';
        submitMessage.style.color = '#f59e0b';
        submitScoreBtn.style.display = 'none';
    }
}

async function fetchLeaderboard() {
    leaderboardBody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';
    
    try {
        const response = await fetch(`${API_URL}/top`);
        if (!response.ok) throw new Error('Network response not ok');
        const scores = await response.json();
        renderLeaderboard(scores);
    } catch (error) {
        // Fallback to offline scores
        const offlineScores = JSON.parse(localStorage.getItem('offlineScores') || '[]');
        renderLeaderboard(offlineScores, true);
    }
}

function renderLeaderboard(scores, isOffline = false) {
    leaderboardBody.innerHTML = '';
    if (scores.length === 0) {
        leaderboardBody.innerHTML = '<tr><td colspan="3">No scores yet. Be the first!</td></tr>';
        return;
    }

    scores.forEach((entry, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${index + 1}</td>
            <td>${escapeHTML(entry.username)}${isOffline ? ' (Offline)' : ''}</td>
            <td>${entry.score}</td>
        `;
        leaderboardBody.appendChild(row);
    });
}

function showLeaderboard() {
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    leaderboardScreen.classList.remove('hidden');
    fetchLeaderboard();
}

// Utility to prevent XSS
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Event Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', () => {
    submitScoreBtn.style.display = 'block'; // Reset button visibility
    startGame();
});
viewLeaderboardBtn.addEventListener('click', showLeaderboard);
gameOverLeaderboardBtn.addEventListener('click', showLeaderboard);
closeLeaderboardBtn.addEventListener('click', () => {
    leaderboardScreen.classList.add('hidden');
    if (score > 0 && !isPlaying) {
        gameOverScreen.classList.remove('hidden');
    } else {
        startScreen.classList.remove('hidden');
    }
});
submitScoreBtn.addEventListener('click', submitScore);

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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
    // Glow effect
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

// Draw Enemies
function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.shadowColor = enemy.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        ctx.shadowBlur = 0;
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

    // Spawn Enemies
    if (frameCount % 60 === 0) {
        const enemyX = Math.random() * (canvas.width - 50);
        const enemyColors = ['#ef4444', '#f59e0b', '#10b981', '#a855f7'];
        enemies.push({
            x: enemyX,
            y: -100,
            width: 50,
            height: 80,
            speed: gameSpeed * (Math.random() * 0.5 + 0.8), // Slightly variable speed
            color: enemyColors[Math.floor(Math.random() * enemyColors.length)]
        });
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
    resetGame();
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    leaderboardScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    isPlaying = true;
    gameLoop();
}

// Game Over
function gameOver() {
    isPlaying = false;
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

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, score })
        });

        if (response.ok) {
            submitMessage.textContent = 'Score submitted successfully!';
            submitMessage.style.color = '#10b981';
            submitScoreBtn.style.display = 'none'; // Hide button after success
        } else {
            throw new Error('Failed to submit');
        }
    } catch (error) {
        submitMessage.textContent = 'Error submitting score. Try again.';
        submitMessage.style.color = '#ef4444';
        submitScoreBtn.disabled = false;
    }
}

async function fetchLeaderboard() {
    leaderboardBody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';
    
    try {
        const response = await fetch(`${API_URL}/top`);
        const scores = await response.json();
        
        leaderboardBody.innerHTML = '';
        if (scores.length === 0) {
            leaderboardBody.innerHTML = '<tr><td colspan="3">No scores yet. Be the first!</td></tr>';
            return;
        }

        scores.forEach((entry, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${index + 1}</td>
                <td>${escapeHTML(entry.username)}</td>
                <td>${entry.score}</td>
            `;
            leaderboardBody.appendChild(row);
        });
    } catch (error) {
        leaderboardBody.innerHTML = '<tr><td colspan="3">Failed to load leaderboard.</td></tr>';
    }
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

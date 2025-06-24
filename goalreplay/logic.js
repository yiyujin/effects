import { data } from "./data.js";

let mode = 'player'; // 'player' or 'vector'
let playerIndex = 0;

let players = [];
let vectors = [];
let timeline = [];

let tempStart = null;
let draggedPlayer = null;
let isPlaying = false;
let gsapTimeline = null;

// CREATE DOM REFERENCES
const field = document.getElementById('field');
const vectorBtn = document.getElementById('vectorBtn');
const playBtn = document.getElementById('playBtn');
const resetBtn = document.getElementById('resetBtn');
const previewLine = document.getElementById('previewLine');

// ADD EVENT LISTENERS
// when button is pressed, change mode to vector
vectorBtn.addEventListener('click', () => {
    mode = 'vector';
    vectorBtn.textContent = 'Vector Mode Active';
    vectorBtn.disabled = true;
});

playBtn.addEventListener('click', handlePlay);
resetBtn.addEventListener('click', resetAll);

field.addEventListener('mousedown', handleMouseDown);
field.addEventListener('mousemove', handleMouseMove);
field.addEventListener('mouseup', handleMouseUp);

function handleMouseDown(e) {
    if (isPlaying) return; // block interaction during play mode
    
    // GET PLAYER POSITIONS ON FIELD
    const rect = field.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // PLAYER MODE : REPOSITION PLAYERS ON DRAG or CREATE PLAYER ON PRESS
    const clickedPlayer = getPlayerAt(x, y);
    
    if (clickedPlayer) {
        draggedPlayer = clickedPlayer;
        draggedPlayer.element.classList.add('dragging'); // add dragging state
        return;
    }

    // CREATE PLAYER
    if (mode === 'player') {
        if (playerIndex < data.length) {
            createPlayer(data[playerIndex], x, y);
            playerIndex++;
        } else {
            console.log("All players placed.");
        }
    } else if (mode === 'vector') {
        tempStart = { x, y }; // store where line begins
    }
}

// REPOSITION PLAYERS
function handleMouseMove(e) {
    if (isPlaying) return;
    
    const rect = field.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (draggedPlayer) {
        draggedPlayer.x = x;
        draggedPlayer.y = y;
        updatePlayerPosition(draggedPlayer);
    } else if (tempStart && mode === 'vector') {
        // Show preview line on mouse pos
        previewLine.setAttribute('x1', tempStart.x);
        previewLine.setAttribute('y1', tempStart.y);
        previewLine.setAttribute('x2', x);
        previewLine.setAttribute('y2', y);
        previewLine.style.display = 'block';
    }
}

function handleMouseUp(e) {
    if (isPlaying) return;
    
    const rect = field.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (draggedPlayer) {
        draggedPlayer.element.classList.remove('dragging'); // end dragging on mouse up
        draggedPlayer = null;
    } else if (tempStart && mode === 'vector') {
        createVector(tempStart.x, tempStart.y, x, y); // add end points to vector
        tempStart = null;
        previewLine.style.display = 'none';
        
        // Save timeline state
        saveTimelineState();
    }
}

function createPlayer(playerData, x, y) {
    const player = {
        id: 'player_' + Date.now(),
        x,
        y,
        data: playerData,
        element: null
    };

    // Create wrapper div
    const playerElement = document.createElement('div');
    playerElement.className = 'player';
    playerElement.id = player.id;
    playerElement.style.left = x + 'px';
    playerElement.style.top = y + 'px';

    // Add image
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'image-container';

    const img = document.createElement('img');
    img.src = playerData.photo;
    img.className = 'player-photo';
    img.draggable = false;

    // Create info row container
    const infoRow = document.createElement('div');
    infoRow.className = 'player-info';

    const name = document.createElement('p');
    name.textContent = playerData.name;
    name.className = 'player-name';

    const number = document.createElement('p');
    number.textContent = playerData.backnumber;
    number.className = 'player-number';

    imageWrapper.appendChild(img);
    infoRow.appendChild(number);
    infoRow.appendChild(name);
    playerElement.appendChild(imageWrapper);
    playerElement.appendChild(infoRow);

    // Add to DOM
    field.appendChild(playerElement);
    player.element = playerElement;
    players.push(player);
}


function createVector(x1, y1, x2, y2) {
    const vector = {
        id: 'vector_' + Date.now(),
        x1, y1, x2, y2,
        element: null
    };

    // create new svg
    const vectorSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    vectorSvg.classList.add('vector');
    vectorSvg.setAttribute('width', '400');
    vectorSvg.setAttribute('height', '600');
    vectorSvg.style.position = 'absolute';
    vectorSvg.style.top = '0';
    vectorSvg.style.left = '0';

    // Create line (x1, y1, x2, y2)
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.classList.add('vector-line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', 'white');
    line.setAttribute('stroke-width', '2');

    // Create arrowhead
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const arrowSize = 10;
    const arrowX1 = x2 - arrowSize * Math.cos(angle - Math.PI / 6);
    const arrowY1 = y2 - arrowSize * Math.sin(angle - Math.PI / 6);
    const arrowX2 = x2 - arrowSize * Math.cos(angle + Math.PI / 6);
    const arrowY2 = y2 - arrowSize * Math.sin(angle + Math.PI / 6);

    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    arrow.classList.add('vector-arrow');
    arrow.setAttribute('points', `${x2},${y2} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`);
    arrow.setAttribute('fill', 'white');
    arrow.setAttribute('stroke', 'white');
    arrow.setAttribute('stroke-width', '1');

    vectorSvg.appendChild(line);
    vectorSvg.appendChild(arrow);
    field.appendChild(vectorSvg);

    vector.element = vectorSvg;
    vectors.push(vector);

    vectorSvg.style.opacity = '1';
}


function getPlayerAt(x, y) {
    return players.find(player => {
        const dx = player.x - x;
        const dy = player.y - y;
        return Math.sqrt(dx * dx + dy * dy) < 15; // within radar
    });
}

function updatePlayerPosition(player) {
    player.element.style.left = player.x + 'px';
    player.element.style.top = player.y + 'px';
}

function saveTimelineState() {
    const state = {
        players: players.map(p => ({ id: p.id, x: p.x, y: p.y })),
        vectors: vectors.map(v => ({ id: v.id, x1: v.x1, y1: v.y1, x2: v.x2, y2: v.y2 }))
    };
    timeline.push(state);

    // Draw faded player positions
    state.players.forEach(playerState => {
        const faded = document.createElement('div');
        faded.className = 'player-history';
        faded.style.left = playerState.x + 'px';
        faded.style.top = playerState.y + 'px';
        field.appendChild(faded);
    });
}

function handlePlay() {
    if (isPlaying || timeline.length === 0) return; // don't play when there's no data
    
    // change button css
    isPlaying = true;
    playBtn.textContent = 'Playing...';
    playBtn.disabled = true;
    
    // Hide all vectors initially for animation
    vectors.forEach(vector => {
        gsap.set(vector.element, { opacity: 0, scale: 0 });
    });
    
    // onComplete css
    gsapTimeline = gsap.timeline({
        onComplete: () => {
            // return button css
            isPlaying = false;
            playBtn.textContent = 'Play';
            playBtn.disabled = false;

            // Show all vectors again after animation
            vectors.forEach(vector => {
                gsap.set(vector.element, { opacity: 1, scale: 1 });
            });
        }
    });
    
    // Track which vectors should be visible at each step
    let visibleVectorCount = 0;
    
    timeline.forEach((state, index) => {
        const delay = index * 1.5; // 1.5 seconds between each step
        
        // ANIMATE PLAYERS TO NEXT POSITIONS
        state.players.forEach(playerState => {
            const player = players.find(p => p.id === playerState.id);
            if (player) {
                gsapTimeline.to(player.element, {
                    left: playerState.x + 'px',
                    top: playerState.y + 'px',
                    duration: 0.8,
                    ease: "power2.out"
                }, delay);
                
                // Update player data
                gsapTimeline.call(() => {
                    player.x = playerState.x;
                    player.y = playerState.y;
                }, null, delay + 0.8);
            }
        });
        
        // ANIMATE VECTORS AFTER PLAYER
        if (state.vectors.length > visibleVectorCount) {
            for (let i = visibleVectorCount; i < state.vectors.length; i++) {
                const vectorState = state.vectors[i];
                const vector = vectors.find(v => v.id === vectorState.id);
                if (vector) {
                    gsapTimeline.fromTo(vector.element, 
                        { opacity: 0, scale: 0 },
                        { 
                            opacity: 1, 
                            scale: 1, 
                            duration: 0.3,
                            transformOrigin: `${vectorState.x1}px ${vectorState.y1}px`
                        }, 
                        delay + 0.5
                    );
                }
            }
            visibleVectorCount = state.vectors.length;
        }
    });
}

function resetAll() {
    if (gsapTimeline) {
        gsapTimeline.kill();
    }
    
    // players.forEach(player => player.element.remove());
    vectors.forEach(vector => vector.element.remove());
    document.querySelectorAll('.player-history').forEach(el => el.remove());
    
    // players = [];
    vectors = [];
    timeline = [];

    mode = 'player';
    isPlaying = false;
    tempStart = null;
    draggedPlayer = null;
    
    vectorBtn.textContent = 'Vector Mode';
    vectorBtn.disabled = false;
    playBtn.textContent = 'Play';
    playBtn.disabled = false;
    previewLine.style.display = 'none';
}
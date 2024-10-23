import {loadHTML} from "./utils.js";

export async function pong() {
    let app = document.getElementById('app')
    app.innerHTML = await loadHTML(('../pong.html'))
    //creation de la websocket
    await initializeCanvas()

    const socket = new WebSocket('wss://pong.api.transcendence.local/ws/');

    socket.onopen = function() {
        console.log('WebSocket est connecté.');
    };

}

// Initialisation du canvas et de son contexte 2D

// Fonction simple pour dessiner le canvas initialement (par exemple, un fond noir)
async function initializeCanvas(gameState) {
    const canvas = document.getElementById('pongCanvas');
    const ctx = canvas.getContext('2d');

    // Dessine un fond noir pour représenter le terrain de jeu
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dessine une ligne blanche au milieu pour représenter la séparation des terrains
    ctx.strokeStyle = 'white';
    ctx.beginPath();
    ctx.setLineDash([5, 15]); // Ligne pointillée
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

}

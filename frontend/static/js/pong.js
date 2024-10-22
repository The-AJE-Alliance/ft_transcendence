import {loadHTML} from "./utils.js";

export async function pong() {
    let app = document.getElementById('app')
    app.innerHTML = await loadHTML(('../pong.html'))
    await initializeCanvas()
}

// Initialisation du canvas et de son contexte 2D

// Fonction simple pour dessiner le canvas initialement (par exemple, un fond noir)
async function initializeCanvas() {
        const canvas = document.getElementById('pongCanvas');
        const ctx = canvas.getContext('2d');
        // Dessine un fond noir pour représenter le terrain de jeu
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Dessine une ligne au milieu pour représenter la séparation des terrains
        ctx.strokeStyle = 'white';
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();
    }
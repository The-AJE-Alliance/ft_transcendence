import {loadHTML} from "./utils.js";

export async function pong() {
    let app = document.getElementById('app')
    app.innerHTML = await loadHTML(('../pong.html'))
    //creation de la websocket
   
    const socket = new WebSocket('wss://pong.api.transcendence.local/ws/');

    socket.onopen = function() {
        console.log('WebSocket est connecté.');
    };

    document.addEventListener('keydown', (event) => handleKeyPress(event, socket));
    socket.onmessage = function(event) {
        const gameState = JSON.parse(event.data);
        console.log('État du jeu reçu:', gameState);
    
        // Initialiser le canvas avec les données reçues
        initializeCanvas(gameState);
    };

}



// Initialisation du canvas et de son contexte 2D

// Fonction simple pour dessiner le canvas initialement (par exemple, un fond noir)
async function initializeCanvas(gameState) {
    const canvas = document.getElementById('pongCanvas');
    const ctx = canvas.getContext('2d');

    // Efface le canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dessine le fond noir du terrain de jeu
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dessine la ligne blanche au milieu
    ctx.strokeStyle = 'white';
    ctx.setLineDash([5, 15]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    // Positionner les éléments du jeu en fonction des données du backend
    if (gameState) {
        const player1Y = gameState.player1_position * canvas.height;
        const player2Y = gameState.player2_position * canvas.height;
        const ballX = gameState.ball_position[0] * canvas.width;
        const ballY = gameState.ball_position[1] * canvas.height;

        // Dessiner la raquette du joueur 1
        ctx.fillStyle = 'white';
        ctx.fillRect(10, player1Y - 40, 10, 80); // Exemple de raquette (x=10, largeur=10, hauteur=80)

        // Dessiner la raquette du joueur 2
        ctx.fillRect(canvas.width - 20, player2Y - 40, 10, 80); // Raquette joueur 2

        // Dessiner la balle
        ctx.beginPath();
        ctx.arc(ballX, ballY, 10, 0, Math.PI * 2); // La balle avec un rayon de 10
        ctx.fill();
    }
}

//event listener pour les touches
function handleKeyPress(event, socket) {
    const player = 2;
    let action = '';

    switch(event.key) {
        case 'ArrowUp':
            action = 'move_up';
            break;
        case 'ArrowDown':
            action = 'move_down';
            break;
        default:
            return; 
}
    const data = {
        player: player,
        action: action
    };

    // Envoyer les données via la websocket
    socket.send(JSON.stringify(data));
}
//!!!!!!!!!! pour calculer les coordonnées adaptées à la taille du canvas
// // Taille du canvas
// let canvasWidth = canvas.width;
// let canvasHeight = canvas.height;

// // Coordonnées normalisées venant du back-end
// let normalizedBallPosition = [0.5, 0.5]; // Exemple

// // Calcul des coordonnées réelles
// let realBallPositionX = normalizedBallPosition[0] * canvasWidth;
// let realBallPositionY = normalizedBallPosition[1] * canvasHeight;



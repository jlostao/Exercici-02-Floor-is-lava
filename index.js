const fs = require('fs').promises;
const readline = require('readline').promises;

const BOARD_WIDTH = 8;
const BOARD_HEIGHT = 6;
const MAX_STEPS = 32;
const START_POSITION = { row: 0, col: 0 }; // A0
const END_POSITION = { row: 5, col: 7 }; // F7

let board = [];
let revealedBoard = [];
let playerPosition = { ...START_POSITION };
let points = MAX_STEPS;
let trapActive = false;

function initializeBoard() {
    board = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill('·'));
    revealedBoard = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill('·'));

    // Place player start and destination
    board[START_POSITION.row][START_POSITION.col] = '·';
    revealedBoard[START_POSITION.row][START_POSITION.col] = 'T';
    board[END_POSITION.row][END_POSITION.col] = '*';

    // Place lava randomly
    let lavaCount = 16;
    while (lavaCount > 0) {
        const randRow = Math.floor(Math.random() * BOARD_HEIGHT);
        const randCol = Math.floor(Math.random() * BOARD_WIDTH);

        if (
            (randRow !== START_POSITION.row || randCol !== START_POSITION.col) &&
            (randRow !== END_POSITION.row || randCol !== END_POSITION.col) &&
            board[randRow][randCol] === '·'
        ) {
            board[randRow][randCol] = 'l';
            lavaCount--;
        }
    }
}

function printBoard(showHidden = false) {
    console.log(" 01234567");
    for (let row = 0; row < BOARD_HEIGHT; row++) {
        let line = String.fromCharCode(65 + row);
        for (let col = 0; col < BOARD_WIDTH; col++) {
            line += revealedBoard[row][col];
        }
        if (trapActive && showHidden) {
            line += "   "; // Separator
            for (let col = 0; col < BOARD_WIDTH; col++) {
                line += board[row][col];
            }
        }
        console.log(line);
    }
}

function countLavaNearby(row, col) {
    let lavaCount = 0;
    const directions = [
        [-1, 0], [1, 0], [0, -1], [0, 1]
    ];

    for (let [dr, dc] of directions) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (
            newRow >= 0 && newRow < BOARD_HEIGHT &&
            newCol >= 0 && newCol < BOARD_WIDTH &&
            board[newRow][newCol] === 'l'
        ) {
            lavaCount++;
        }
    }

    return lavaCount;
}

async function saveGame(fileName) {
    const gameState = {
        board,
        revealedBoard,
        playerPosition,
        points,
        trapActive
    };
    await fs.writeFile(fileName, JSON.stringify(gameState, null, 2), 'utf-8');
    console.log("Partida guardada a", fileName);
}

async function loadGame(fileName) {
    try {
        const data = await fs.readFile(fileName, 'utf-8');
        const gameState = JSON.parse(data);
        board = gameState.board;
        revealedBoard = gameState.revealedBoard;
        playerPosition = gameState.playerPosition;
        points = gameState.points;
        trapActive = gameState.trapActive;
        console.log("Partida carregada des de", fileName);
    } catch (error) {
        console.error("Error en carregar la partida:", error);
    }
}

async function handleCommand(command) {
    const [cmd, arg] = command.split(' ');

    switch (cmd) {
        case 'ayuda':
            console.log(`Comandes disponibles:
            ayuda: Mostra aquest missatge.
            carregar partida "name_file.json": Carrega una partida guardada.
            guardar partida "name_file.json": Guarda la partida actual.
            activar/desctivar trampa: Mostra/oculta el tauler complet.
            caminar "direcció": Direccions: amunt, avall, dreta, esquerra.
            puntuació: Mostra la puntuació actual.`);
            break;

        case 'carregar':
            await loadGame(arg);
            break;

        case 'guardar':
            await saveGame(arg);
            break;

        case 'activar':
            trapActive = true;
            console.log("Trampa activada!");
            break;

        case 'desactivar':
            trapActive = false;
            console.log("Trampa desactivada!");
            break;

        case 'caminar':
            movePlayer(arg);
            break;

        case 'puntuació':
            console.log(`Puntuació actual: ${points}`);
            break;

        default:
            console.log("Comanda no reconeguda.");
    }
}

function movePlayer(direction) {
    const moves = {
        amunt: [-1, 0],
        avall: [1, 0],
        dreta: [0, 1],
        esquerra: [0, -1]
    };

    const move = moves[direction];
    if (!move) {
        console.log("Direcció no vàlida.");
        return;
    }

    const newRow = playerPosition.row + move[0];
    const newCol = playerPosition.col + move[1];

    if (newRow < 0 || newRow >= BOARD_HEIGHT || newCol < 0 || newCol >= BOARD_WIDTH) {
        console.log("Has perdut, has caigut per un penyasegat.");
        process.exit();
    }

    // Restore the previous cell's content
    const prevRow = playerPosition.row;
    const prevCol = playerPosition.col;
    if (board[prevRow][prevCol] === '·' || board[prevRow][prevCol] === 'l') {
        revealedBoard[prevRow][prevCol] = board[prevRow][prevCol];
    }

    const cell = board[newRow][newCol];
    playerPosition = { row: newRow, col: newCol };

    if (cell === 'l') {
        points--;
        revealedBoard[newRow][newCol] = 'T';
        console.log("Has trepitjat lava, perds un punt.");
    } else if (cell === '*') {
        console.log("Has guanyat, has trobat el tresor!");
        process.exit();
    } else {
        const lavaNearby = countLavaNearby(newRow, newCol);
        revealedBoard[newRow][newCol] = 'T';
        console.log(`Vas per bon camí, tens lava a ${lavaNearby} caselles de distància.`);
    }

    if (points <= 0) {
        console.log("Has perdut, ja no tens més passes.");
        process.exit();
    }
}

async function main() {
    initializeBoard();
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    while (true) {
        printBoard(trapActive);
        const command = await rl.question("Escriu una comanda: ");
        await handleCommand(command);
    }
}

main();

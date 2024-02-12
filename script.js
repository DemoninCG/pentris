const dropIntervals = [48, 43, 38, 33, 28, 23, 18, 13, 8, 6, 5, 5, 5, 4, 4, 4, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1]
const levelLinesLeft = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 100, 100, 100, 100, 100, 100, 110, 120, 130, 140]
const nextPieceTimeouts = [20, 20, 20, 20, 18, 18, 18, 18, 16, 16, 16, 16, 14, 14, 14, 14, 12, 12, 12, 12, 10, 10, 10, 10]

menuPosition = [0,0]
gamePlaying = false
darkMode = false
keybinds = ["ArrowLeft", "ArrowRight", "ArrowDown", "a", "s"]
changingKeybind = 0
board = []
keysHeld = [false, false, false, false, false] //Left, Right, Down, A, D
level = 5
score = 0
bestScores = [0,0,0]
bestLevels = [0,0,0]
lines = 0
linesLeft = levelLinesLeft[level]
for (let i=0;i<22;i++) {
    board.push(Array(14).fill(0))
}

if (localStorage.getItem("pentrisScores")) {bestScores = JSON.parse(localStorage.getItem("pentrisScores"))}
if (localStorage.getItem("pentrisLevels")) bestLevels = JSON.parse(localStorage.getItem("pentrisLevels"))
if (localStorage.getItem("pentrisKeybinds")) {
    keybinds = JSON.parse(localStorage.getItem("pentrisKeybinds"))
    for (let i=0;i<5;i++) {
        document.getElementsByClassName("keybind")[i].innerText = keybinds[i].toUpperCase()
    }
}
document.getElementById("bestScores").innerHTML = ("BEST SCORES<br>" + bestScores[0].toString().padStart(6, "0") + " - LV" + (bestLevels[0] < 10 ? "0" : "") + bestLevels[0] + "<br>" + bestScores[1].toString().padStart(6, "0") + " - LV" + (bestLevels[1] < 10 ? "0" : "") + bestLevels[1] + "<br>" + bestScores[2].toString().padStart(6, "0") + " - LV" + (bestLevels[2] < 10 ? "0" : "") + bestLevels[2] + "<br>")

// Preload images
const images = {
	tiles: new Image(),
    board: new Image(),
};

// Assign sources to preloaded images
images.tiles.src = "img/tiles.png";
images.board.src = "img/board.png";

//Fetch the game canvas element and its 2D drawing context
const canvas = document.getElementById("board");
const ctx = canvas && canvas.getContext("2d");

if (ctx) ctx.imageSmoothingEnabled = false; //Disable image smoothing for pixelated look

//Draw the board
ctx.drawImage(images.board, 0, 0, 128, 192);

let position = [6,0]
let timeUntilNextFrame = 30
let waitingForNextPiece = false
let timeOfLastUpdate = Date.now()
function update() {
    if (!gamePlaying) {return}
    if (Date.now()-timeOfLastUpdate < 1000/60) {return}
    else {timeOfLastUpdate += 1000/60}

    if (keysHeld[0] || keysHeld[1]) DAS = Math.min(DAS+1, 16)
    if (keysHeld[0] && DAS == 16) {moveLeft()}
    else if (keysHeld[1] && DAS == 16) {moveRight()}
    //Pushdown
    if (keysHeld[2] && timeUntilNextFrame > 1 && !cannotMoveDown && !cannotMoveHorizontal) timeUntilNextFrame = 1

    if (!timeUntilNextFrame) {
        cannotMoveHorizontal = false
        let touchingBottom = false;
        //Check if any tile is directly above a tile on the board
        for (let i=0;i<tilePositions.length;i++) {
            //Skip the check if the tile is above the board
            if (tilePositions[i][1] < 1) {continue}
            if (tilePositions[i][1] >= 22 || board[tilePositions[i][1]][tilePositions[i][0]-1] > 0) {touchingBottom = true}
        }
        //Piece is touching the bottom or a tile
        if (touchingBottom && !waitingForNextPiece) {
            pieceLand()
            waitingForNextPiece = true
            cannotMoveHorizontal = true
            //Check if any line is full
            let lineFull = false
            for (let i=0;i<22;i++) {
                if (board[i].every(x => x > 0)) {
                    lineFull = true
                    break
                }
            }
            if (lineFull) {
                clearLines()
                timeUntilNextFrame = nextPieceTimeouts[position[0]]+dropIntervals[level]+20
                setTimeout(fullLineCheck, (1000/60)*(nextPieceTimeouts[position[0]]+20))
            }
            else {
                timeUntilNextFrame = nextPieceTimeouts[position[0]]+dropIntervals[level]
                setTimeout(fullLineCheck, (1000/60)*nextPieceTimeouts[position[0]])
            }
        }
        //Piece can move down
        else {
            position[1]++
            timeUntilNextFrame = dropIntervals[level]
            //Adding pushdown points
            if (keysHeld[2] && timeUntilNextFrame > 1 && !cannotMoveDown && !cannotMoveHorizontal) {
                currentPushdown++
                if (currentPushdown > bestPushdown) bestPushdown = currentPushdown
            }
        }
        calculateTilePositions(); 
        render()
    }
    timeUntilNextFrame--
}

setInterval(update, 1000 / 120)

function render() {
    //Have to do this again since it doesn't work the first time on chrome
    ctx.drawImage(images.board, 0, 0, 128, 192);
    //Clear the canvas
    ctx.clearRect(8, 8, canvas.width-16, canvas.height-16);
    //Draw the board
    for (let i=0;i<22;i++) {
        for (let j=0;j<14;j++) {
            if (board[i][j] > 0) {
                ctx.drawImage(images.tiles, (board[i][j]-1) * 8, (level%10) * 8, 8, 8, (j*8)+8, (i*8)+8, 8, 8);
            }
        }
    }
    //Draw the current piece
    if (!waitingForNextPiece) {
        for (let i=0;i<5;i++) {
            for (let j=0;j<5;j++) {
                if (piece[i*5+j] === "#" && (position[1]*8)-8+(i*8) >= 8) {
                    ctx.drawImage(images.tiles, pieceColours[pieceNumber-1] * 8, (level%10) * 8, 8, 8, (position[0]*8)-8+(j*8), (position[1]*8)-8+(i*8), 8, 8);
                }
            }
        }
        displayNextPiece(nextPieceNumber)
    }
    document.getElementById("levelText").innerHTML = (level < 10 ? "0" : "") + level
    document.getElementById("linesText").innerHTML = lines.toString().padStart(3, "0")
    document.getElementById("scoreText").innerHTML = score.toString().padStart(6, "0")
}

function startGame(levelPicked=0) {
    gamePlaying = true
    cannotMoveDown = false
    cannotMoveHorizontal = false
    nextPieceNumber = Math.floor(Math.random() * 18) + 1
    timeOfLastUpdate = Date.now()
    document.getElementById("menu").style.display = "none"
    document.getElementById("game").style.display = "block"
    document.getElementById("info").style.display = "none"
    document.getElementById("bestScoreText").innerHTML = bestScores[0].toString().padStart(6, "0")
    timeUntilNextFrame = 90
    level = levelPicked
    score = 0
    lines = 0
    linesLeft = levelLinesLeft[level]
    board = []
    for (let i=0;i<22;i++) {
        board.push(Array(14).fill(0))
    }
    pickPiece()
    render()
}
 
function returnToMenu() {
    gamePlaying = false
    dead = false
    document.getElementById("menu").style.display = "block"
    document.getElementById("game").style.display = "none"
    document.getElementById("bestScores").innerHTML = ("BEST SCORES<br>" + bestScores[0].toString().padStart(6, "0") + " - LV" + (bestLevels[0] < 10 ? "0" : "") + bestLevels[0] + "<br>" + bestScores[1].toString().padStart(6, "0") + " - LV" + (bestLevels[1] < 10 ? "0" : "") + bestLevels[1] + "<br>" + bestScores[2].toString().padStart(6, "0") + " - LV" + (bestLevels[2] < 10 ? "0" : "") + bestLevels[2] + "<br>")
    localStorage.setItem("pentrisScores", JSON.stringify(bestScores));
    localStorage.setItem("pentrisLevels", JSON.stringify(bestLevels));
    localStorage.setItem("pentrisKeybinds", JSON.stringify(keybinds));
}

function showInfo() {document.getElementById("info").style.display = "block"}
function hideInfo() {document.getElementById("info").style.display = "none"}

let pieceNumber = 0
let piece = ""
let tilePositions = []
function initializePiece(x) {
    switch (x) {
        case 1:
            return piece_i;
        case 2:
            return piece_f1;
        case 3:
            return piece_f2;
        case 4:
            return piece_j;
        case 5:
            return piece_l;
        case 6:
            return piece_p;
        case 7:
            return piece_q;
        case 8:
            return piece_n1;
        case 9:
            return piece_n2;
        case 10:
            return piece_t;
        case 11:
            return piece_u;
        case 12:
            return piece_v;
        case 13:
            return piece_w;
        case 14:
            return piece_x;
        case 15:
            return piece_y1;
        case 16:
            return piece_y2;
        case 17:
            return piece_s;
        case 18:
            return piece_z;
        default:
            return piece_i;
    }
}

//Fetch the game canvas element and its 2D drawing context
const nextCanvas = document.getElementById("nextCanvas");
const nextctx = nextCanvas && nextCanvas.getContext("2d");

if (nextctx) nextctx.imageSmoothingEnabled = false; //Disable image smoothing for pixelated look

function displayNextPiece(x) {
    nextctx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    let pieceTemp = initializePiece(x)
    let tilePositionsTemp = []
    for (let i=0;i<5;i++) {
        for (let j=0;j<5;j++) {
            if (pieceTemp[i*5+j] === "#") {
                tilePositionsTemp.push([j, i])
            }
        }
    }
    for (let i=0;i<tilePositionsTemp.length;i++) {
        nextctx.drawImage(images.tiles, pieceColours[x-1] * 8, (level%10) * 8, 8, 8, (tilePositionsTemp[i][0]*8)+4, (tilePositionsTemp[i][1]*8)+(pieceHeights[nextPieceNumber-1]*4)-8, 8, 8);
    }

}

let cannotMoveDown = false
let cannotMoveHorizontal = false
let dead = false
let nextPieceNumber = Math.floor(Math.random() * 18) + 1
function pickPiece() {
    waitingForNextPiece = false
    cannotMoveHorizontal = false
    if (keysHeld[2]) cannotMoveDown = true
    pieceNumber = nextPieceNumber;
    piece = initializePiece(pieceNumber);
    nextPieceNumber = Math.floor(Math.random() * 18) + 1
    position[0] = 7
    position[1] = pieceHeights[pieceNumber-1]
    calculateTilePositions()
    //Check if any tile is overlapping the board
    let touchingBoard = false;
    for (let i=0;i<tilePositions.length;i++) {
        //Skip the check if the tile is above the board
        if (tilePositions[i][1] < 1) {continue}
        if (!board[tilePositions[i][1]-1] || board[tilePositions[i][1]-1][tilePositions[i][0]-1] > 0) {touchingBoard = true}
    }
    //End the game
    if (touchingBoard) {
        //Check if the current score is higher than any of the best scores
        if (score > bestScores[0]) {
            bestScores[2] = bestScores[1]
            bestLevels[2] = bestLevels[1]
            bestScores[1] = bestScores[0]
            bestLevels[1] = bestLevels[0]
            bestScores[0] = score
            bestLevels[0] = level
        }
        else if (score > bestScores[1]) {
            bestScores[2] = bestScores[1]
            bestLevels[2] = bestLevels[1]
            bestScores[1] = score
            bestLevels[1] = level
        }
        else if (score > bestScores[2]) {
            bestScores[2] = score
            bestLevels[2] = level
        }
        gamePlaying = false
        dead = true
        setTimeout(returnToMenu, 3500)
        for (let i=0;i<22;i++) {
            setTimeout(coverLine, 1200 + (i*70), i)
        }
    }
    render()
}
pickPiece()

function calculateTilePositions() {
    tilePositions = []
    for (let i=0;i<5;i++) {
        for (let j=0;j<5;j++) {
            if (piece[i*5+j] === "#") {
                tilePositions.push([position[0]-1+j, position[1]-1+i])
            }
        }
    }
}

let DAS = 0
let currentPushdown = 0
let bestPushdown = 0
//Add key press detection
document.addEventListener("keydown", function(event) {
    if (changingKeybind) {
        if (event.key === "Escape") {document.getElementsByClassName("changeKeybindButton")[changingKeybind-1].innerText = "CHANGE"; changingKeybind = 0; return}
        if (event.key === "d") {return}
        keybinds[changingKeybind-1] = event.key
        document.getElementsByClassName("changeKeybindButton")[changingKeybind-1].innerText = "CHANGE"
        document.getElementsByClassName("keybind")[changingKeybind-1].innerText = event.key.toUpperCase()
        changingKeybind = 0
    }
    else {
        if (event.key === "d") {
            darkMode = !darkMode
            if (darkMode) {document.body.style.backgroundImage = "url('img/backgroundDark2.png')"}
            else {document.body.style.backgroundImage = "url('img/background.png')"}
        }
        if (!gamePlaying && !dead) {
            if (event.key === "ArrowLeft") {menuPosition[0] = Math.max(0, menuPosition[0]-1); document.getElementById("menuHover").style.left = (menuPosition[0]*16) + "px"}
            if (event.key === "ArrowRight") {menuPosition[0] = Math.min(4, menuPosition[0]+1); document.getElementById("menuHover").style.left = (menuPosition[0]*16) + "px"}
            if (event.key === "ArrowUp") {menuPosition[1] = Math.max(0, menuPosition[1]-1); document.getElementById("menuHover").style.top = (menuPosition[1]*16+88) + "px"}
            if (event.key === "ArrowDown") {menuPosition[1] = Math.min(3, menuPosition[1]+1); document.getElementById("menuHover").style.top = (menuPosition[1]*16+88) + "px"}
            if (event.key === "w") {startGame(menuPosition[1]*5+menuPosition[0])}
            if (event.key === "Enter") {startGame(menuPosition[1]*5+menuPosition[0])}
        }
        else {
            if (event.key === keybinds[0] && !keysHeld[0]) {
                keysHeld[0] = true;
                moveLeft();
                if (keysHeld[1]) {
                    keysHeld[1] = false;
                    DAS = 0
                }
            };
            if (event.key === keybinds[1] && !keysHeld[1]) {
                keysHeld[1] = true;
                moveRight();
                if (keysHeld[0]) {
                    keysHeld[0] = false;
                    DAS = 0
                }
            };
            if (event.key === keybinds[2] && !keysHeld[2]) {keysHeld[2] = true};
            if (event.key === keybinds[3] && !keysHeld[3]) {keysHeld[3] = true; rotateCounterClockwise()};
            if (event.key === keybinds[4] && !keysHeld[4]) {keysHeld[4] = true; rotateClockwise()};
            if (event.key === "Escape") returnToMenu()
        }
    }
});

document.addEventListener("keyup", function(event) {
    if (event.key === keybinds[0]) {keysHeld[0] = false; DAS = 0};
    if (event.key === keybinds[1]) {keysHeld[1] = false; DAS = 0};
    if (event.key === keybinds[2]) {keysHeld[2] = false; cannotMoveDown = false; currentPushdown = 0};
    if (event.key === keybinds[3]) keysHeld[3] = false;
    if (event.key === keybinds[4]) keysHeld[4] = false;
    
});

function changeKeybind(x) {
    changingKeybind = x
    document.getElementsByClassName("changeKeybindButton")[x-1].innerText = "PRESS A KEY"
}

function moveLeft() {
    let canMove = true
    for (let i=0;i<tilePositions.length;i++) {
        if (tilePositions[i][0] <= 1) {canMove = false}
        if (board[tilePositions[i][1]-1] && board[tilePositions[i][1]-1][tilePositions[i][0]-2] > 0) {canMove = false}
    }
    if (canMove && !cannotMoveHorizontal) {
        position[0]--
        if (DAS == 16) DAS = 10
        calculateTilePositions()
        render()
    }
    else {DAS = 16}
}

function moveRight() {
    let canMove = true
    for (let i=0;i<tilePositions.length;i++) {
        if (tilePositions[i][0] >= 14) {canMove = false}
        if (board[tilePositions[i][1]-1] && board[tilePositions[i][1]-1][tilePositions[i][0]] > 0) {canMove = false}
    }
    if (canMove && !cannotMoveHorizontal) {
        position[0]++
        if (DAS == 16) DAS = 10
        calculateTilePositions()
        render()
    }
    else {DAS = 16}
}

function rotateClockwise() {
    let pieceTemp = []
    for (let i=0;i<5;i++) {
        for (let j=0;j<5;j++) {
            pieceTemp[j*5+(5-i)] = piece[i*5+j]
        }
    }
    //Convert the pieceTemp array to a string
    pieceTemp = pieceTemp.join('')
    //Calculate temporary tile positions
    let tempTilePositions = []
    for (let i=0;i<5;i++) {
        for (let j=0;j<5;j++) {
            if (pieceTemp[i*5+j] === "#") {
                tempTilePositions.push([position[0]-1+j, position[1]-1+i])
            }
        }
    }
    console.log(tempTilePositions)
    //Check if any tile is overlapping the board
    let touchingBoard = false;
    //Check if any tile is directly above a 1 on the board
    for (let i=0;i<tempTilePositions.length;i++) {
        //Skip the check if the tile is above the board
        if (tempTilePositions[i][1] < 1) {continue}
        if (tempTilePositions[i][0] < 1 || tempTilePositions[i][0] > 14) {touchingBoard = true}
        if (!board[tempTilePositions[i][1]-1] || board[tempTilePositions[i][1]-1][tempTilePositions[i][0]-1] > 0) {touchingBoard = true}
    }
    if (!touchingBoard) {
        piece = pieceTemp
        tilePositions = tempTilePositions
        render()
    }
}

function rotateCounterClockwise() {
    let pieceTemp = []
    for (let i=0;i<5;i++) {
        for (let j=0;j<5;j++) {
            pieceTemp[(5-j)*5+i] = piece[i*5+j]
        }
    }
    //Convert the pieceTemp array to a string
    pieceTemp = pieceTemp.join('')
    //Calculate temporary tile positions
    let tempTilePositions = []
    for (let i=0;i<5;i++) {
        for (let j=0;j<5;j++) {
            if (pieceTemp[i*5+j] === "#") {
                tempTilePositions.push([position[0]-1+j, position[1]-1+i])
            }
        }
    }
    //Check if any tile is overlapping the board
    let touchingBoard = false;
    //Check if any tile is directly above a 1 on the board
    for (let i=0;i<tempTilePositions.length;i++) {
        //Skip the check if the tile is above the board
        if (tempTilePositions[i][1] < 1) {continue}
        if (tempTilePositions[i][0] < 1 || tempTilePositions[i][0] > 14) {touchingBoard = true}
        if (!board[tempTilePositions[i][1]-1] || board[tempTilePositions[i][1]-1][tempTilePositions[i][0]-1] > 0) {touchingBoard = true}
    }
    if (!touchingBoard) {
        piece = pieceTemp
        tilePositions = tempTilePositions
        render()
    }
}

function pieceLand() {
    for (let i=0;i<tilePositions.length;i++) {
        if (board[tilePositions[i][1]-1]) board[tilePositions[i][1]-1][tilePositions[i][0]-1] = pieceColours[pieceNumber-1]+1
    }
    score += bestPushdown
    bestPushdown = 0
}

function fullLineCheck() {
    let linesCleared = 0
    for (let i=0;i<22;i++) {
        if (board[i].every(x => x > 0)) {
            board.splice(i, 1)
            board.unshift(Array(14).fill(0))
            linesCleared++
        }
    }
    lines += linesCleared
    linesLeft -= linesCleared
    if (linesLeft <= 0) {
        level++
        render()
        linesLeft += 10
    }
    if (linesCleared == 1) {score += 40 * (level+1)}
    else if (linesCleared == 2) {score += 100 * (level+1)}
    else if (linesCleared == 3) {score += 300 * (level+1)}
    else if (linesCleared == 4) {score += 1200 * (level+1)}
    else if (linesCleared == 5) {score += 2400 * (level+1)}
    pickPiece()
}

function clearLines() {
    let linesToClear = []
    for (let i=0;i<22;i++) {
        if (board[i].every(x => x > 0)) {
            linesToClear.push(i)
        }
    }
    for (let i=0;i<8;i++) {
        for (let j=0;j<linesToClear.length;j++) {
            setTimeout(clearLineSection, i*70, i, linesToClear[j])
        }
    }
}

function clearLineSection(width,line) {
    ctx.clearRect(64-(width*8), 8+(line*8), (width*16), 8);
}

function coverLine(x) {
    for (let i=0;i<14;i++) {
        ctx.drawImage(images.tiles, 24, (level%10) * 8, 8, 8, i*8+8, x*8+8, 8, 8);
    }
}
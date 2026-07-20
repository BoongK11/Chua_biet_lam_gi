// ========================================================
// CHESS.JS - TOÀN BỘ LOGIC GAME CỜ VUA P2P & NHẬP THÀNH
// ========================================================

let peer = null;
let conn = null;
let myRole = ''; // 'W' là Trắng, 'B' là Đen
let currentTurn = 'W';
let boardState = [];
let selectedSquare = null;

const pieceSymbols = { 'K': '♚', 'Q': '♛', 'R': '♜', 'B': '♝', 'N': '♞', 'P': '♟' };
const initialRowPieces = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];

// 1. Khởi tạo dữ liệu bàn cờ ban đầu
function initChessBoardData() {
    boardState = [];
    for (let r = 0; r < 8; r++) {
        let row = [];
        for (let c = 0; c < 8; c++) {
            if (r === 0) row.push({ type: initialRowPieces[c], color: 'B', hasMoved: false });
            else if (r === 1) row.push({ type: 'P', color: 'B', hasMoved: false });
            else if (r === 6) row.push({ type: 'P', color: 'W', hasMoved: false });
            else if (r === 7) row.push({ type: initialRowPieces[c], color: 'W', hasMoved: false });
            else row.push(null);
        }
        boardState.push(row);
    }
}

// 2. Kiểm tra đường đi trống (Xe, Tượng, Hậu)
function isPathClear(fromR, fromC, toR, toC) {
    const deltaR = Math.sign(toR - fromR);
    const deltaC = Math.sign(toC - fromC);
    let currR = fromR + deltaR;
    let currC = fromC + deltaC;
    while (currR !== toR || currC !== toC) {
        if (boardState[currR][currC] !== null) return false;
        currR += deltaR;
        currC += deltaC;
    }
    return true;
}

// 3. Kiểm tra nước đi cơ bản hợp lệ
function isValidMove(fromR, fromC, toR, toC) {
    const piece = boardState[fromR][fromC];
    const target = boardState[toR][toC];
    if (target && target.color === piece.color) return false;

    const diffR = Math.abs(toR - fromR);
    const diffC = Math.abs(toC - fromC);

    switch (piece.type) {
        case 'K': return diffR <= 1 && diffC <= 1;
        case 'Q': return ((fromR === toR || fromC === toC) || (diffR === diffC)) && isPathClear(fromR, fromC, toR, toC);
        case 'R': return (fromR === toR || fromC === toC) && isPathClear(fromR, fromC, toR, toC);
        case 'B': return (diffR === diffC) && isPathClear(fromR, fromC, toR, toC);
        case 'N': return (diffR === 2 && diffC === 1) || (diffR === 1 && diffC === 2);
        case 'P':
            const direction = piece.color === 'W' ? -1 : 1;
            if (fromC === toC && toR === fromR + direction && !target) return true;
            if (fromC === toC && !piece.hasMoved && toR === fromR + 2 * direction) {
                if (!boardState[fromR + direction][fromC] && !target) return true;
            }
            if (diffC === 1 && toR === fromR + direction && target && target.color !== piece.color) return true;
            return false;
    }
    return false;
}

// 4. Các hàm bổ trợ nâng cao: Nhập thành (Castling)
function isSquareAttacked(targetR, targetC, enemyColor) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = boardState[r][c];
            if (piece && piece.color === enemyColor) {
                if (piece.type === 'P') {
                    const direction = piece.color === 'W' ? -1 : 1;
                    if (targetR === r + direction && Math.abs(targetC - c) === 1) return true;
                } else {
                    if (isValidMove(r, c, targetR, targetC)) return true;
                }
            }
        }
    }
    return false;
}

function isKingInCheck(color) {
    let kingPos = null;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = boardState[r][c];
            if (piece && piece.type === 'K' && piece.color === color) { kingPos = { r, c }; break; }
        }
        if (kingPos) break;
    }
    if (!kingPos) return false;
    return isSquareAttacked(kingPos.r, kingPos.c, color === 'W' ? 'B' : 'W');
}

function canCastle(kingR, kingC, rookR, rookC) {
    const king = boardState[kingR][kingC];
    const rook = boardState[rookR][rookC];
    if (!king || !rook || king.type !== 'K' || rook.type !== 'R' || king.color !== rook.color) return false;
    if (king.hasMoved || rook.hasMoved) return false;
    if (isKingInCheck(king.color)) return false;
    const enemyColor = king.color === 'W' ? 'B' : 'W';

    if (rookC === 7) { // Cánh Vua
        if (boardState[kingR][5] !== null || boardState[kingR][6] !== null) return false;
        if (isSquareAttacked(kingR, 5, enemyColor) || isSquareAttacked(kingR, 6, enemyColor)) return false;
        return true;
    } else if (rookC === 0) { // Cánh Hậu
        if (boardState[kingR][1] !== null || boardState[kingR][2] !== null || boardState[kingR][3] !== null) return false;
        if (isSquareAttacked(kingR, 3, enemyColor) || isSquareAttacked(kingR, 2, enemyColor)) return false;
        return true;
    }
    return false;
}

function executeCastling(kingR, kingC, rookR, rookC, isLocalEmit = true) {
    const king = boardState[kingR][kingC];
    const rook = boardState[rookR][rookC];
    if (rookC === 7) {
        boardState[kingR][6] = king; boardState[kingR][5] = rook;
        boardState[kingR][6].hasMoved = true; boardState[kingR][5].hasMoved = true;
    } else if (rookC === 0) {
        boardState[kingR][2] = king; boardState[kingR][3] = rook;
        boardState[kingR][2].hasMoved = true; boardState[kingR][3].hasMoved = true;
    }
    boardState[kingR][kingC] = null; boardState[rookR][rookC] = null;
    currentTurn = currentTurn === 'W' ? 'B' : 'W';
    selectedSquare = null;
    renderChessBoard();
    if (typeof playSynthSound === 'function') playSynthSound(480, 'triangle', 0.2);
    if (isLocalEmit && conn) {
        conn.send({ type: 'castle', kingR, kingC, rookR, rookC });
    }
}

// 5. Gợi ý nước đi
function getValidMovesForPiece(r, c) {
    let validMoves = [];
    for (let targetR = 0; targetR < 8; targetR++) {
        for (let targetC = 0; targetC < 8; targetC++) {
            if (isValidMove(r, c, targetR, targetC)) validMoves.push({ r: targetR, c: targetC });
        }
    }
    return validMoves;
}

// 6. Vẽ bàn cờ lên giao diện HTML
function renderChessBoard() {
    const boardEl = document.getElementById('chessBoard');
    if (!boardEl) return;
    boardEl.innerHTML = '';
    
    let highlightedSquares = [];
    if (selectedSquare) highlightedSquares = getValidMovesForPiece(selectedSquare.r, selectedSquare.c);

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const square = document.createElement('div');
            square.style.display = 'flex';
            square.style.justifyContent = 'center';
            square.style.alignItems = 'center';
            square.style.fontSize = '28px';
            square.style.cursor = 'pointer';
            square.style.aspectRatio = '1';
            
            const isDarkCell = (r + c) % 2 === 1;
            square.style.backgroundColor = isDarkCell ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.07)';

            if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) {
                square.style.boxShadow = 'inset 0 0 12px #ff007f';
            }

            const isHint = highlightedSquares.some(m => m.r === r && m.c === c);
            if (isHint) square.style.boxShadow = 'inset 0 0 10px #00ffcc';

            const piece = boardState[r][c];
            if (piece) {
                square.innerText = pieceSymbols[piece.type];
                if (piece.color === 'W') {
                    square.style.color = '#00ffcc';
                    square.style.textShadow = '0 0 8px #00ffcc';
                } else {
                    square.style.color = '#ff007f';
                    square.style.textShadow = '0 0 8px #ff007f';
                }
            }

            square.addEventListener('click', () => handleSquareClick(r, c, isHint));
            boardEl.appendChild(square);
        }
    }

    const infoStatus = document.getElementById('gameInfoStatus');
    if (infoStatus) {
        const roleText = myRole === 'W' ? 'Bên TRẮNG (Bạn)' : 'Bên ĐEN (Bạn)';
        const turnText = currentTurn === myRole ? 'LƯỢT CỦA BẠN' : 'ĐỐI THỦ ĐANG NGHĨ...';
        const turnColor = currentTurn === myRole ? '#00ffcc' : '#ff007f';
        infoStatus.innerHTML = `<span style="color:#fff">${roleText}</span> — <span style="color:${turnColor}; text-shadow: 0 0 5px ${turnColor};">${turnText}</span>`;
    }
}

// 7. Xử lý sự kiện nhấn vào ô cờ
function handleSquareClick(r, c, isHint) {
    if (!conn) return;
    if (currentTurn !== myRole) return;
    const piece = boardState[r][c];

    if (selectedSquare) {
        const selectedPiece = boardState[selectedSquare.r][selectedSquare.c];
        
        // Nhập thành: Chọn Vua rồi chọn Xe cùng màu
        if (selectedPiece && selectedPiece.type === 'K' && piece && piece.type === 'R' && piece.color === selectedPiece.color) {
            if (canCastle(selectedSquare.r, selectedSquare.c, r, c)) {
                executeCastling(selectedSquare.r, selectedSquare.c, r, c, true);
                return;
            }
        }

        if (selectedSquare.r === r && selectedSquare.c === c) {
            selectedSquare = null;
            renderChessBoard();
            return;
        }

        if (isHint) {
            const movingPiece = boardState[selectedSquare.r][selectedSquare.c];
            movingPiece.hasMoved = true;
            boardState[r][c] = movingPiece;
            boardState[selectedSquare.r][selectedSquare.c] = null;

            currentTurn = currentTurn === 'W' ? 'B' : 'W';
            selectedSquare = null;
            renderChessBoard();
            if (typeof playSynthSound === 'function') playSynthSound(520, 'triangle', 0.15);

            conn.send({ type: 'move', fromR: selectedSquare ? selectedSquare.r : r, fromC: selectedSquare ? selectedSquare.c : c, toR: r, toC: c });
            // Gửi gói tin cập nhật trạng thái ô tới đối phương
            conn.send({ type: 'direct_move', fromR: selectedSquare?.r ?? -1, fromC: selectedSquare?.c ?? -1, toR: r, toC: c });
            
            // Sửa lỗi gửi đè tọa độ bằng cách gửi trực tiếp dữ liệu chính xác
            conn.send({ type: 'move_fix', fR: selectedSquare.r, fC: selectedSquare.c, tR: r, tC: c });
            return;
        }
    }

    if (piece && piece.color === myRole) {
        selectedSquare = { r, c };
        renderChessBoard();
    }
}

// ========================================================
// KHỞI TẠO MẠNG P2P PEERJS CHO GAME
// ========================================================
function initPeerConnection(role, customRoomId = null) {
    leaveChessRoom();
    myRole = role;
    initChessBoardData();

    const randomId = customRoomId || 'VOTUAT-' + Math.floor(1000 + Math.random() * 9000);
    peer = new Peer(randomId);

    peer.on('open', (id) => {
        document.getElementById('chessConnectMenu').style.display = 'none';
        document.getElementById('chessWaitingScreen').style.display = 'block';
        if (role === 'W') {
            document.getElementById('waitingStatus').innerText = 'Mã phòng của bạn. Hãy gửi cho bạn bè:';
            document.getElementById('shareCodeArea').style.display = 'block';
            document.getElementById('generatedRoomCode').innerText = id;
        } else {
            document.getElementById('waitingStatus').innerText = 'Đang tiến vào phòng đối thủ...';
        }
    });

    peer.on('connection', (connection) => {
        conn = connection;
        setupChatConnection();
    });

    peer.on('error', (err) => {
        alert('Lỗi kết nối phòng: ' + err.type);
        leaveChessRoom();
    });
}

function setupChatConnection() {
    document.getElementById('chessWaitingScreen').style.display = 'none';
    document.getElementById('chessGameArea').style.display = 'block';
    currentTurn = 'W';
    renderChessBoard();

    conn.on('data', (data) => {
        if (data.type === 'move_fix' || data.type === 'move') {
            const fR = data.fR !== undefined ? data.fR : data.fromR;
            const fC = data.fC !== undefined ? data.fC : data.fromC;
            const piece = boardState[fR][fC];
            if (piece) piece.hasMoved = true;
            boardState[data.tR || data.toR][data.tC || data.toC] = piece;
            boardState[fR][fC] = null;
            currentTurn = currentTurn === 'W' ? 'B' : 'W';
            renderChessBoard();
            if (typeof playSynthSound === 'function') playSynthSound(400, 'sine', 0.15);
        } else if (data.type === 'castle') {
            executeCastling(data.kingR, data.kingC, data.rookR, data.rookC, false);
        }
    });

    conn.on('close', () => {
        alert('Đối phương đã rời trận đấu!');
        leaveChessRoom();
    });
}

function leaveChessRoom() {
    if (conn) { conn.close(); conn = null; }
    if (peer) { peer.destroy(); peer = null; }
    document.getElementById('chessConnectMenu').style.display = 'block';
    document.getElementById('chessWaitingScreen').style.display = 'none';
    document.getElementById('chessGameArea').style.display = 'none';
    document.getElementById('shareCodeArea').style.display = 'none';
}

// Lắng nghe sự kiện click các nút tạo/vào phòng
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnCreateRoom').addEventListener('click', () => initPeerConnection('W'));
    document.getElementById('btnJoinRoom').addEventListener('click', () => {
        const code = document.getElementById('roomCodeInput').value.trim();
        if (!code) { alert('Vui lòng nhập mã phòng!'); return; }
        initPeerConnection('B', code);
        setTimeout(() => {
            conn = peer.connect(code);
            setupChatConnection();
        }, 1000);
    });
});

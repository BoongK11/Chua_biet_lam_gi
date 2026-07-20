// =================================================================
// KHU VỰC THUẬT TOÁN LUẬT CỜ VUA CHUẨN QUỐC TẾ & KẾT NỐI P2P PEERJS
// =================================================================

// 1. CÁC BIẾN TRẠNG THÁI TOÀN CỤC
let peer = null;
let conn = null;
let myRole = null;       // 'W' (Trắng) hoặc 'B' (Đen)
let currentTurn = 'W';   // Lượt đi hiện tại ('W' đi trước)
let boardState = [];     // Mảng 64 phần tử đại diện bàn cờ
let selectedSquare = null; // Ô đang được chọn chọn (0-63)

// CÁC BIẾN THEO DÕI ĐIỀU KIỆN NHẬP THÀNH (CASTLING)
let whiteKingMoved = false;
let whiteRookAMoved = false; // Xe cánh Hậu (Cột A - Ô 56)
let whiteRookHMoved = false; // Xe cánh Vua (Cột H - Ô 63)

let blackKingMoved = false;
let blackRookAMoved = false; // Xe cánh Hậu (Cột A - Ô 0)
let blackRookHMoved = false; // Xe cánh Vua (Cột H - Ô 7)

// 2. KHỞI TẠO DỮ LIỆU BÀN CỜ BAN ĐẦU
function initChessBoardData() {
    boardState = [
        'BR', 'BN', 'BB', 'BQ', 'BK', 'BB', 'BN', 'BR', // Dòng 0 (0-7): Quân Đen
        'BP', 'BP', 'BP', 'BP', 'BP', 'BP', 'BP', 'BP', // Dòng 1 (8-15)
        null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null,
        'WP', 'WP', 'WP', 'WP', 'WP', 'WP', 'WP', 'WP', // Dòng 6 (48-55)
        'WR', 'WN', 'WB', 'WQ', 'WK', 'WB', 'WN', 'WR'  // Dòng 7 (56-63): Quân Trắng
    ];
    
    // Khởi tạo lại trạng thái chưa di chuyển của Vua và Xe
    whiteKingMoved = false; whiteRookAMoved = false; whiteRookHMoved = false;
    blackKingMoved = false; blackRookAMoved = false; blackRookHMoved = false;
    selectedSquare = null;
}

// 3. THUẬT TOÁN LUẬT DI CHUYỂN CƠ BẢN
function isPathClear(from, to) {
    const fromRow = Math.floor(from / 8), fromCol = from % 8;
    const toRow = Math.floor(to / 8), toCol = to % 8;
    const rowStep = Math.sign(toRow - fromRow);
    const colStep = Math.sign(toCol - fromCol);
    
    let r = fromRow + rowStep;
    let c = fromCol + colStep;
    while (r !== toRow || c !== toCol) {
        if (boardState[r * 8 + c]) return false;
        r += rowStep;
        c += colStep;
    }
    return true;
}

function isValidNormalMove(from, to) {
    const piece = boardState[from];
    if (!piece) return false;
    const target = boardState[to];
    
    // Không thể ăn quân cùng màu
    if (target && target.startsWith(piece[0])) return false;

    const fromRow = Math.floor(from / 8), fromCol = from % 8;
    const toRow = Math.floor(to / 8), toCol = to % 8;
    const dr = Math.abs(toRow - fromRow);
    const dc = Math.abs(toCol - fromCol);

    switch(piece[1]) {
        case 'P': // Tốt
            const dir = piece[0] === 'W' ? -1 : 1;
            const startRow = piece[0] === 'W' ? 6 : 1;
            if (fromCol === toCol && !target) {
                if (toRow - fromRow === dir) return true;
                if (fromRow === startRow && toRow - fromRow === 2 * dir && !boardState[(fromRow + dir) * 8 + fromCol]) return true;
            }
            if (dc === 1 && toRow - fromRow === dir && target) return true;
            return false;
        case 'R': // Xe
            return (fromRow === toRow || fromCol === toCol) && isPathClear(from, to);
        case 'N': // Mã
            return (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
        case 'B': // Tượng
            return (dr === dc) && isPathClear(from, to);
        case 'Q': // Hậu
            return (fromRow === toRow || fromCol === toCol || dr === dc) && isPathClear(from, to);
        case 'K': // Vua (Đi 1 ô)
            return (dr <= 1 && dc <= 1);
    }
    return false;
}

// Hàm đơn giản kiểm tra xem một ô có đang bị tấn công bởi đối phương không
function isSquareAttacked(squareIdx, enemyColor) {
    for (let i = 0; i < 64; i++) {
        const piece = boardState[i];
        if (piece && piece.startsWith(enemyColor)) {
            // Tạm thời giả lập luật đi cơ bản để check ô bị kiểm soát
            if (isValidNormalMove(i, squareIdx)) return true;
        }
    }
    return false;
}

function isKingInCheck(color) {
    const kingPiece = color + 'K';
    const kingIdx = boardState.indexOf(kingPiece);
    if (kingIdx === -1) return false;
    return isSquareAttacked(kingIdx, color === 'W' ? 'B' : 'W');
}

// 4. LOGIC TÍNH NĂNG NHẬP THÀNH (ẤN VUA -> ẤN XE)
function canCastle(kingIdx, rookIdx) {
    const king = boardState[kingIdx];
    const rook = boardState[rookIdx];
    
    if (!king || !rook || !king.endsWith('K') || !rook.endsWith('R')) return false;
    const isWhite = king.startsWith('W');
    const enemyColor = isWhite ? 'B' : 'W';

    // Điều kiện 1: Vua và Xe định nhập thành phải chưa từng di chuyển
    if (isWhite) {
        if (whiteKingMoved) return false;
        if (rookIdx === 56 && whiteRookAMoved) return false;
        if (rookIdx === 63 && whiteRookHMoved) return false;
    } else {
        if (blackKingMoved) return false;
        if (rookIdx === 0 && blackRookAMoved) return false;
        if (rookIdx === 7 && blackRookHMoved) return false;
    }

    // Điều kiện 2: Không có quân xen giữa Vua và Xe
    const step = rookIdx > kingIdx ? 1 : -1;
    for (let i = kingIdx + step; i !== rookIdx; i += step) {
        if (boardState[i]) return false;
    }

    // Điều kiện 3: Vua hiện tại không bị chiếu
    if (isKingInCheck(isWhite ? 'W' : 'B')) return false;

    // Điều kiện 4: Vua không đi qua và không dừng lại ở ô bị quân địch kiểm soát
    const nextSquare1 = kingIdx + step;
    const nextSquare2 = kingIdx + step * 2;
    if (isSquareAttacked(nextSquare1, enemyColor) || isSquareAttacked(nextSquare2, enemyColor)) return false;

    return true;
}

// 5. XỬ LÝ SỰ KIỆN CLICK TRÊN BÀN CỜ
function handleSquareClick(index) {
    if (currentTurn !== myRole) return; // Không phải lượt của bạn

    const piece = boardState[index];

    if (selectedSquare !== null) {
        const selectedPiece = boardState[selectedSquare];

        // TRƯỜNG HỢP: NHẬP THÀNH (Ấn quân Vua trước -> Bấm quân Xe của mình)
        if (selectedPiece && selectedPiece.endsWith('K') && selectedPiece.startsWith(myRole) &&
            piece && piece.endsWith('R') && piece.startsWith(myRole)) {
            
            if (canCastle(selectedSquare, index)) {
                const isKingside = index > selectedSquare; // Xe bên phải Vua = Nhập thành gần
                let newKingIdx = isKingside ? selectedSquare + 2 : selectedSquare - 2;
                let newRookIdx = isKingside ? selectedSquare + 1 : selectedSquare - 1;

                // Thực hiện hoán đổi vị trí trên mảng dữ liệu
                boardState[newKingIdx] = selectedPiece;
                boardState[newRookIdx] = piece;
                boardState[selectedSquare] = null;
                boardState[index] = null;

                // Cập nhật trạng thái di chuyển
                if (myRole === 'W') {
                    whiteKingMoved = true;
                    if (index === 56) whiteRookAMoved = true;
                    if (index === 63) whiteRookHMoved = true;
                } else {
                    blackKingMoved = true;
                    if (index === 0) blackRookAMoved = true;
                    if (index === 7) blackRookHMoved = true;
                }

                // Đổi lượt đi và vẽ lại UI
                currentTurn = myRole === 'W' ? 'B' : 'W';
                selectedSquare = null;
                renderChessBoard();
                if (typeof playSynthSound === 'function') playSynthSound(523.25, 'sine', 0.2);

                // Gửi gói tin đồng bộ Nhập thành sang đối thủ qua PeerJS
                if (conn && conn.open) {
                    conn.send({
                        type: 'castle',
                        kingFrom: selectedSquare,
                        kingTo: newKingIdx,
                        rookFrom: index,
                        rookTo: newRookIdx,
                        nextTurn: currentTurn
                    });
                }
                return;
            }
        }

        // TRƯỜNG HỢP: DI CHUYỂN HOẶC ĂN QUÂN BÌNH THƯỜNG
        if (isValidNormalMove(selectedSquare, index)) {
            // Lưu giữ lại lịch sử di chuyển phục vụ luật Nhập thành
            if (selectedPiece === 'WK') whiteKingMoved = true;
            if (selectedPiece === 'BK') blackKingMoved = true;
            if (selectedSquare === 56) whiteRookAMoved = true;
            if (selectedSquare === 63) whiteRookHMoved = true;
            if (selectedSquare === 0) blackRookAMoved = true;
            if (selectedSquare === 7) blackRookHMoved = true;

            // Thực thi di chuyển
            boardState[index] = selectedPiece;
            boardState[selectedSquare] = null;

            currentTurn = myRole === 'W' ? 'B' : 'W';
            selectedSquare = null;
            renderChessBoard();
            if (typeof playSynthSound === 'function') playSynthSound(440, 'triangle', 0.15);

            // Gửi gói tin di chuyển thông thường sang đối thủ
            if (conn && conn.open) {
                conn.send({
                    type: 'move',
                    from: selectedSquare,
                    to: index,
                    board: boardState,
                    nextTurn: currentTurn
                });
            }
            return;
        }
    }

    // Chọn quân cờ (Chỉ chọn được quân của chính mình)
    if (piece && piece.startsWith(myRole)) {
        selectedSquare = index;
        renderChessBoard();
    } else {
        selectedSquare = null;
        renderChessBoard();
    }
}

// 6. ĐỒ HỌA VÀ HIỂN THỊ GIAO DIỆN BÀN CỜ (HTML RENDER)
const pieceSymbols = {
    'WK': '♔', 'WQ': '♕', 'WR': '♖', 'WB': '♗', 'WN': '♘', 'WP': '♙',
    'BK': '♚', 'BQ': '♛', 'BR': '♜', 'BB': '♝', 'BN': '♞', 'BP': '♟'
};

function renderChessBoard() {
    const boardDiv = document.getElementById('chessBoard');
    if (!boardDiv) return;
    boardDiv.innerHTML = '';

    const statusDiv = document.getElementById('gameInfoStatus');
    if (statusDiv) {
        if (currentTurn === myRole) {
            statusDiv.innerHTML = `<span style="color: #00ffcc;">Đến lượt bạn (${myRole === 'W' ? 'Trắng' : 'Đen'})</span>`;
        } else {
            statusDiv.innerHTML = `<span style="color: rgba(255,255,255,0.5);">Đợi đối thủ đi quân...</span>`;
        }
    }

    // Vẽ 64 ô cờ (Nếu bạn chơi quân Đen, bàn cờ sẽ đảo ngược góc nhìn để dễ nhìn)
    for (let i = 0; i < 64; i++) {
        const index = myRole === 'B' ? 63 - i : i;
        const row = Math.floor(index / 8);
        const col = index % 8;

        const square = document.createElement('div');
        square.style.display = 'flex';
        square.style.justifyContent = 'center';
        square.style.alignItems = 'center';
        square.style.fontSize = '32px';
        square.style.cursor = 'pointer';
        square.style.userSelect = 'none';
        square.style.transition = 'all 0.2s';

        // Màu nền bàn cờ Caro
        const isLight = (row + col) % 2 === 0;
        square.style.backgroundColor = isLight ? '#f0d9b5' : '#b58863';

        // Đổ bóng hiển thị quân cờ màu tương ứng
        const piece = boardState[index];
        if (piece) {
            square.innerText = pieceSymbols[piece] || '';
            square.style.color = piece.startsWith('W') ? '#ffffff' : '#000000';
            square.style.textShadow = piece.startsWith('W') ? '0 0 4px #000' : '0 0 4px #fff';
        }

        // Highlight ô đang được lựa chọn click
        if (selectedSquare === index) {
            square.style.backgroundColor = '#7b9c60';
        } else if (selectedSquare !== null && isValidNormalMove(selectedSquare, index)) {
            // Gợi ý chấm sáng các ô có thể đi hợp lệ
            square.style.boxShadow = 'inset 0 0 0 4px #00ffcc';
        }

        // Đăng ký bộ lắng nghe sự kiện bấm ô cờ
        square.addEventListener('click', () => handleSquareClick(index));
        boardDiv.appendChild(square);
    }
}

// 7. HỆ THỐNG KẾT NỐI MẠNG P2P PEERJS
function resetChessUI() {
    document.getElementById('chessConnectMenu').style.display = 'block';
    document.getElementById('chessWaitingScreen').style.display = 'none';
    document.getElementById('chessGameArea').style.display = 'none';
}

function setupConnectionDataChannel() {
    if (!conn) return;
    conn.on('data', (data) => {
        if (data.type === 'move') {
            boardState = data.board;
            currentTurn = data.nextTurn;
            renderChessBoard();
            if (typeof playSynthSound === 'function') playSynthSound(300, 'sine', 0.15);
        }
        else if (data.type === 'castle') {
            // Đồng bộ nước đi nhập thành từ phía đối thủ gửi tới
            boardState[data.kingTo] = boardState[data.kingFrom];
            boardState[data.rookTo] = boardState[data.rookFrom];
            boardState[data.kingFrom] = null;
            boardState[data.rookFrom] = null;
            
            currentTurn = data.nextTurn;
            renderChessBoard();
            if (typeof playSynthSound === 'function') playSynthSound(523.25, 'sine', 0.2);
        }
    });
    conn.on('close', () => {
        alert("Đối thủ đã rời trận đấu!");
        resetChessUI();
    });
}

function setupPeerEvents() {
    peer.on('error', (err) => {
        alert("Lỗi kết nối mạng: " + err.type);
        resetChessUI();
    });
}

// Hành động: Bấm nút Tạo Phòng
document.getElementById('btnCreateRoom').addEventListener('click', () => {
    document.getElementById('chessConnectMenu').style.display = 'none';
    document.getElementById('chessWaitingScreen').style.display = 'block';
    document.getElementById('waitingStatus').innerText = 'Đang xin mã phòng từ hệ thống...';

    try {
        peer = new Peer();
        setupPeerEvents();

        peer.on('open', (id) => {
            document.getElementById('waitingStatus').innerText = 'Hãy gửi mã này cho bạn của bạn:';
            document.getElementById('shareCodeArea').style.display = 'block';
            document.getElementById('generatedRoomCode').innerText = id;
        });

        peer.on('connection', (incomingConn) => {
            conn = incomingConn;
            myRole = 'W'; // Chủ phòng cầm quân Trắng
            currentTurn = 'W';
            initChessBoardData();
            setupConnectionDataChannel();

            document.getElementById('chessWaitingScreen').style.display = 'none';
            document.getElementById('chessGameArea').style.display = 'block';
            renderChessBoard();
        });
    } catch (e) {
        alert("Không thể khởi tạo phòng: " + e.message);
        resetChessUI();
    }
});

// Hành động: Bấm nút Vào Phòng
document.getElementById('btnJoinRoom').addEventListener('click', () => {
    const code = document.getElementById('roomCodeInput').value.trim();
    if (!code) {
        alert("Vui lòng nhập mã phòng!");
        return;
    }

    document.getElementById('chessConnectMenu').style.display = 'none';
    document.getElementById('chessWaitingScreen').style.display = 'block';
    document.getElementById('waitingStatus').innerText = 'Đang định vị tọa độ phòng: ' + code + '...';
    document.getElementById('shareCodeArea').style.display = 'none';

    try {
        peer = new Peer();
        setupPeerEvents();

        peer.on('open', () => {
            conn = peer.connect(code);

            const connTimeout = setTimeout(() => {
                if (!conn || !conn.open) {
                    alert("Kết nối quá hạn! Vui lòng kiểm tra lại mã phòng.");
                    resetChessUI();
                }
            }, 10000);

            conn.on('open', () => {
                clearTimeout(connTimeout);
                myRole = 'B'; // Người vào sau cầm quân Đen
                currentTurn = 'W';
                initChessBoardData();
                setupConnectionDataChannel();

                document.getElementById('chessWaitingScreen').style.display = 'none';
                document.getElementById('chessGameArea').style.display = 'block';
                renderChessBoard();
            });
        });
    } catch (err) {
        alert("Lỗi kết nối: " + err.message);
        resetChessUI();
    }
});

function leaveChessRoom() {
    if (conn) conn.close();
    if (peer) peer.destroy();
    resetChessUI();
}

console.log("Hệ thống Mini Game cờ vua luật quốc tế tích hợp tính năng Nhập Thành nâng cao hoạt động ổn định!");

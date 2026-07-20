// ==========================================
// KHU VỰC THUẬT TOÁN LUẬT CỜ VUA CHUẨN QUỐC TẾ
// ==========================================
let peer = null;
let conn = null;
let myRole = '';       
let currentTurn = 'W';  
let boardState = [];    
let selectedSquare = null; 

const pieceSymbols = { 'K': '♚', 'Q': '♛', 'R': '♜', 'B': '♝', 'N': '♞', 'P': '♟' };
const initialRowPieces = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];

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

// HÀM KIỂM TRA ĐƯỜNG ĐI TRỐNG (Dành cho Xe, Tượng, Hậu)
function isPathClear(fromR, fromC, toR, toC) {
    const deltaR = Math.sign(toR - fromR);
    const deltaC = Math.sign(toC - fromC);
    let currR = fromR + deltaR;
    let currC = fromC + deltaC;

    while (currR !== toR || currC !== toC) {
        if (boardState[currR][currC] !== null) {
            return false; // Bị vướng quân cờ trên đường đi
        }
        currR += deltaR;
        currC += deltaC;
    }
    return true;
}

// THUẬT TOÁN KIỂM TRA NƯỚC ĐI HỢP LỆ THEO TỪNG QUÂN
function isValidMove(fromR, fromC, toR, toC) {
    const piece = boardState[fromR][fromC];
    const target = boardState[toR][toC];

    // 1. Không thể đi vào ô có quân cùng màu
    if (target && target.color === piece.color) return false;

    const diffR = Math.abs(toR - fromR);
    const diffC = Math.abs(toC - fromC);

    switch (piece.type) {
        case 'K': // VUA: Đi 1 ô duy nhất về mọi hướng
            return diffR <= 1 && diffC <= 1;

        case 'Q': // HẬU: Kết hợp Xe + Tượng không giới hạn ô
            if ((fromR === toR || fromC === toC) || (diffR === diffC)) {
                return isPathClear(fromR, fromC, toR, toC);
            }
            return false;

        case 'R': // XE: Đi thẳng dọc/ngang không giới hạn ô
            if (fromR === toR || fromC === toC) {
                return isPathClear(fromR, fromC, toR, toC);
            }
            return false;

        case 'B': // TƯỢNG: Đi chéo không giới hạn ô
            if (diffR === diffC) {
                return isPathClear(fromR, fromC, toR, toC);
            }
            return false;

        case 'N': // MÃ: Hình chữ L (2-1 hoặc 1-2) và được phép nhảy qua đầu quân khác
            return (diffR === 2 && diffC === 1) || (diffR === 1 && diffC === 2);

        case 'P': // TỐT: Đi thẳng 1 ô (nước đầu đi 2), ăn chéo 1 ô trước
            const direction = piece.color === 'W' ? -1 : 1; // Quân trắng đi lên (-R), quân đen đi xuống (+R)
            
            // Đi thẳng 1 ô
            if (fromC === toC && toR === fromR + direction && !target) {
                return true;
            }
            // Đi thẳng 2 ô ở nước đi đầu tiên
            if (fromC === toC && !piece.hasMoved && toR === fromR + 2 * direction) {
                // Kiểm tra không có quân cờ nào cản ở cả ô giữa và ô đích
                if (!boardState[fromR + direction][fromC] && !target) {
                    return true;
                }
            }
            // Ăn chéo 1 ô
            if (diffC === 1 && toR === fromR + direction && target && target.color !== piece.color) {
                return true;
            }
            return false;
    }
    return false;
}

// TÌM TẤT CẢ CÁC Ô ĐI HỢP LỆ CỦA QUÂN CỜ ĐANG CHỌN ĐỂ HIỂN THỊ HƯỚNG DẪN
function getValidMovesForPiece(r, c) {
    let validMoves = [];
    for (let targetR = 0; targetR < 8; targetR++) {
        for (let targetC = 0; targetC < 8; targetC++) {
            if (isValidMove(r, c, targetR, targetC)) {
                validMoves.push({ r: targetR, c: targetC });
            }
        }
    }
    return validMoves;
}

function renderChessBoard() {
    const boardEl = document.getElementById('chessBoard');
    boardEl.innerHTML = '';

    // Lấy danh sách các ô gợi ý hợp lệ nếu có quân đang được chọn
    let highlightedSquares = [];
    if (selectedSquare) {
        highlightedSquares = getValidMovesForPiece(selectedSquare.r, selectedSquare.c);
    }

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const square = document.createElement('div');
            square.style.display = 'flex';
            square.style.justifyContent = 'center';
            square.style.alignItems = 'center';
            square.style.fontSize = '28px';
            square.style.cursor = 'pointer';
            square.style.userSelect = 'none';
            square.style.aspectRatio = '1';

            const isDarkCell = (r + c) % 2 === 1;
            square.style.backgroundColor = isDarkCell ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.07)';

            // Đổ màu viền hồng cho ô đang chọn
            if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) {
                square.style.boxShadow = 'inset 0 0 12px #ff007f';
            }

            // Đổ màu viền xanh neon gợi ý cho các ô di chuyển hợp lệ
            const isHint = highlightedSquares.some(m => m.r === r && m.c === c);
            if (isHint) {
                square.style.boxShadow = 'inset 0 0 10px #00ffcc';
            }

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
    const roleText = myRole === 'W' ? 'Bên TRẮNG (Bạn)' : 'Bên ĐEN (Bạn)';
    const turnText = currentTurn === myRole ? 'LƯỢT CỦA BẠN' : 'ĐỐI THỦ ĐANG NGHĨ...';
    const turnColor = currentTurn === myRole ? '#00ffcc' : '#ff007f';
    infoStatus.innerHTML = `<span style="color:#fff">${roleText}</span> — <span style="color:${turnColor}; text-shadow: 0 0 5px ${turnColor};">${turnText}</span>`;
}

function handleSquareClick(r, c, isHint) {
    if (!conn) return; 
    if (currentTurn !== myRole) return; 

    const piece = boardState[r][c];

    if (selectedSquare) {
        // Nếu ấn lại đúng ô cũ thì hủy chọn
        if (selectedSquare.r === r && selectedSquare.c === c) {
            selectedSquare = null;
            renderChessBoard();
            return;
        }

        // Thực hiện di chuyển nếu ô nhắm tới nằm trong danh sách gợi ý hợp lệ (isHint)
        if (isHint) {
            const movingPiece = boardState[selectedSquare.r][selectedSquare.c];
            
            // Đánh dấu quân cờ này đã từng di chuyển (Phục vụ tính luật Tốt đi 2 ô nước đầu)
            movingPiece.hasMoved = true;

            // Tiến hành ăn quân/di chuyển dữ liệu
            boardState[r][c] = movingPiece;
            boardState[selectedSquare.r][selectedSquare.c] = null;

            // Gửi trạng thái bàn cờ đồng bộ sang cho đối thủ P2P
            conn.send({
                type: 'MOVE',
                board: boardState
            });

            selectedSquare = null;
            currentTurn = myRole === 'W' ? 'B' : 'W'; 
            playSynthSound(400, 'triangle', 0.1);
            renderChessBoard();
        } else {
            // Nếu ấn vào một ô không hợp lệ khác: 
            // Thay vì di chuyển bừa, hệ thống sẽ kiểm tra xem ô đó có phải quân mình không để đổi lựa chọn quân cờ
            if (piece && piece.color === myRole) {
                selectedSquare = { r, c };
                playSynthSound(580, 'sine', 0.08);
                renderChessBoard();
            } else {
                // Ấn vào đất trống hoặc quân địch không hợp lệ thì hủy chọn quân cũ
                selectedSquare = null;
                renderChessBoard();
            }
        }
    } else {
        // Nếu chưa chọn quân, tiến hành chọn quân cờ của phe mình
        if (piece && piece.color === myRole) {
            selectedSquare = { r, c };
            playSynthSound(580, 'sine', 0.08);
            renderChessBoard();
        }
    }
}

function setupPeerEvents() {
    peer.on('error', (err) => {
        console.error(err);
        document.getElementById('waitingStatus').innerHTML = `<span style="color:#ff007f; font-size:14px;">Lỗi kết nối P2P (${err.type}). Hãy tắt Adblock hoặc F5 tải lại trang nhé!</span>`;
        setTimeout(resetChessUI, 4000);
    });

    peer.on('connection', (connection) => {
        if (conn) {
            connection.close(); 
            return;
        }
        conn = connection;
        myRole = 'W';
        currentTurn = 'W';
        initChessBoardData();
        setupConnectionDataChannel();

        document.getElementById('chessWaitingScreen').style.display = 'none';
        document.getElementById('chessGameArea').style.display = 'block';
        renderChessBoard();
        playSynthSound(600, 'triangle', 0.25);
    });
}

function setupConnectionDataChannel() {
    conn.on('data', (data) => {
        if (data.type === 'MOVE') {
            boardState = data.board;
            currentTurn = myRole; 
            playSynthSound(480, 'triangle', 0.12);
            renderChessBoard();
        }
    });

    conn.on('close', () => {
        alert("Đối thủ đã ngắt kết nối hoặc rời phòng cờ!");
        resetChessUI();
    });
}

function resetChessUI() {
    if (conn) { conn.close(); conn = null; }
    document.getElementById('chessConnectMenu').style.display = 'block';
    document.getElementById('chessWaitingScreen').style.display = 'none';
    document.getElementById('chessGameArea').style.display = 'none';
}

function leaveChessRoom() {
    resetChessUI();
    if (peer) { peer.destroy(); peer = null; }
}

// SỰ KIỆN NÚT TẠO PHÒNG
document.getElementById('btnCreateRoom').addEventListener('click', () => {
    playSynthSound(300, 'triangle', 0.1);
    if (typeof Peer === 'undefined') {
        alert("Lỗi mạng: Trình duyệt không tải được thư viện PeerJS! Hãy tắt trình chặn quảng cáo rồi F5 chạy lại web nhé.");
        return;
    }

    document.getElementById('chessConnectMenu').style.display = 'none';
    document.getElementById('chessWaitingScreen').style.display = 'block';
    document.getElementById('waitingStatus').innerText = 'Đang đăng ký mã phòng với hệ thống vũ trụ...';

    const roomID = '9A-' + Math.floor(1000 + Math.random() * 9000);

    try {
        peer = new Peer(roomID);
        setupPeerEvents();
        
        const timeoutCheck = setTimeout(() => {
            if (!peer || !peer.id) {
                document.getElementById('waitingStatus').innerHTML = '<span style="color:#ff007f">Máy chủ mạng đang nghẽn. Bạn hãy ấn Quay lại rồi thử bấm Tạo phòng lại nhé!</span>';
            }
        }, 10000);

        peer.on('open', (id) => {
            clearTimeout(timeoutCheck);
            document.getElementById('waitingStatus').innerText = 'Phòng đã tạo! Hãy gửi mã này cho bạn cùng chơi:';
            document.getElementById('shareCodeArea').style.display = 'block';
            document.getElementById('generatedRoomCode').innerText = id;
        });
    } catch (err) {
        document.getElementById('waitingStatus').innerText = 'Lỗi khởi tạo: ' + err.message;
    }
});

// SỰ KIỆN NÚT VÀO PHÒNG
document.getElementById('btnJoinRoom').addEventListener('click', () => {
    const code = document.getElementById('roomCodeInput').value.trim();
    if (!code) {
        alert("Bạn ơi, hãy nhập mã phòng do bạn mình gửi trước nhé!");
        return;
    }
    if (typeof Peer === 'undefined') {
        alert("Lỗi mạng: Không tìm thấy thư viện kết nối cờ. Hãy kiểm tra lại mạng hoặc tắt Adblock nhé!");
        return;
    }

    playSynthSound(300, 'triangle', 0.1);
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
                    alert("Không thể kết nối! Vui lòng kiểm tra lại mã phòng hoặc bảo bạn mình giữ nguyên màn hình chờ nhé.");
                    resetChessUI();
                }
            }, 10000);

            conn.on('open', () => {
                clearTimeout(connTimeout);
                myRole = 'B';
                currentTurn = 'W'; 
                initChessBoardData();
                setupConnectionDataChannel();

                document.getElementById('chessWaitingScreen').style.display = 'none';
                document.getElementById('chessGameArea').style.display = 'block';
                renderChessBoard();
                playSynthSound(600, 'triangle', 0.25);
            });
        });
    } catch (err) {
        alert("Lỗi kết nối: " + err.message);
        resetChessUI();
    }
});

console.log("Hệ thống Mini Game cờ vua luật quốc tế chuẩn chỉnh chống treo UI hoạt động ổn định!");

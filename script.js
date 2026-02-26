let quizData = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let startTime, timerInterval;

// 1. Xử lý dữ liệu đầu vào
document.getElementById('fileInput').addEventListener('change', function(e) {
    const reader = new FileReader();
    reader.onload = function() {
        const text = reader.result;
        // Tạm thời giả lập phân tích câu hỏi
        quizData = [{q: "Câu hỏi mẫu 1?", a: "Đáp án A"}, {q: "Câu hỏi mẫu 2?", a: "Đáp án B"}];
        document.getElementById('statusInfo').innerText = `Đã tìm thấy ${quizData.length} câu hỏi từ file!`;
    };
    reader.readAsText(e.target.files[0]);
});

// 2. Flow: AI Loading (7s) -> Nhập tên -> Bắt đầu
function handleAIStart() {
    if (quizData.length === 0 && !document.getElementById('manualContent').value) {
        alert("ĐIỀU KIỆN THIẾU: Huy cần tải file hoặc nhập nội dung để AI làm việc!");
        return;
    }

    const overlay = document.getElementById('loading-overlay');
    const fill = document.getElementById('loading-fill');
    const status = document.getElementById('loading-status');
    overlay.style.display = 'flex';

    let progress = 0;
    const msgs = ["Đang đọc tài liệu...", "AI đang trích xuất kiến thức...", "Đang tạo đáp án nhiễu...", "Sắp xong rồi..."];
    
    const interval = setInterval(() => {
        progress += 1.5;
        fill.style.width = progress + "%";
        if (progress % 25 === 0) status.innerText = msgs[Math.floor(progress/26)];

        if (progress >= 100) {
            clearInterval(interval);
            overlay.style.display = 'none';
            document.getElementById('name-popup').style.display = 'flex';
        }
    }, 100); // Khoảng 7 giây
}

function startQuiz(isAnonymous) {
    const name = document.getElementById('userName').value;
    if (!isAnonymous && !name) {
        alert("Hãy nhập tên hoặc chọn Bỏ qua nhé!");
        return;
    }
    
    document.getElementById('name-popup').style.display = 'none';
    document.getElementById('home-page').style.display = 'none';
    document.getElementById('quiz-page').style.display = 'block';

    startTimer();
    renderQuestion();
}

// 3. Logic làm bài
function startTimer() {
    startTime = Date.now();
    let seconds = 0;
    timerInterval = setInterval(() => {
        seconds++;
        let m = Math.floor(seconds/60);
        let s = seconds % 60;
        document.getElementById('timer-box').innerText = `${m}:${s < 10 ? '0'+s : s}`;
    }, 1000);
}

function renderQuestion() {
    const q = quizData[currentQuestionIndex];
    document.getElementById('qIndexText').innerText = `Câu ${currentQuestionIndex + 1}/${quizData.length}`;
    document.getElementById('bar-fill').style.width = ((currentQuestionIndex + 1)/quizData.length * 100) + "%";
    
    document.getElementById('question-area').innerHTML = `
        <h3 style="margin-bottom:15px;">${q.q}</h3>
        <button class="styled-input popup-box" style="margin-bottom:10px; text-align:left;">A. ${q.a}</button>
        <button class="styled-input popup-box" style="margin-bottom:10px; text-align:left;">B. Đáp án sai mẫu</button>
    `;
}

// 4. Kết thúc & Xếp hạng (Ưu tiên: Điểm -> Thời gian)
function submitQuiz() {
    clearInterval(timerInterval);
    const score = Math.floor(Math.random() * 11); // Giả lập chấm điểm
    const duration = Math.floor((Date.now() - startTime) / 1000);
    const name = document.getElementById('userName').value || "Ẩn danh";

    let ranks = JSON.parse(localStorage.getItem('ottn181_ranks')) || [];
    ranks.push({ name, score, duration, date: new Date().toLocaleDateString() });

    // Sắp xếp: Điểm cao trước, nếu bằng điểm thì ai nhanh hơn (giây ít hơn) đứng trước
    ranks.sort((a, b) => b.score - a.score || a.duration - b.duration);

    localStorage.setItem('ottn181_ranks', JSON.stringify(ranks));
    
    document.getElementById('quiz-page').style.display = 'none';
    document.getElementById('result-page').style.display = 'block';
    document.getElementById('finalScore').innerText = `${score}/10`;
    
    renderLeaderboard();
}

function renderLeaderboard() {
    const ranks = JSON.parse(localStorage.getItem('ottn181_ranks')) || [];
    const list = document.getElementById('leaderboardList');
    list.innerHTML = ranks.map((item, i) => `
        <div class="rank-item ${i === 0 ? 'top-1' : ''}">
            <div class="rank-num">${i + 1}</div>
            <div style="flex:1;">
                <b>${item.name}</b> <br>
                <small>${item.score} điểm - ${item.duration}s</small>
            </div>
            <div style="font-size:10px; color:#888;">${item.date}</div>
        </div>
    `).join('');
}

function openEditMode() {
    if(quizData.length === 0) {
        alert("ĐIỀU KIỆN THIẾU: Phải có file câu hỏi mới chỉnh sửa được Huy ơi!");
    } else {
        alert("Đang mở trình chỉnh sửa nội dung...");
    }
}

// Chạy bảng xếp hạng khi vừa load trang
renderLeaderboard();

// Quiz master - script tích hợp cho HTML home-page đã cung cấp
let quizData = [];
let userAnswers = {};
let startTime, timerInterval;
let history = JSON.parse(localStorage.getItem('huy_quiz_history')) || [];
let isSubmitted = false;

document.addEventListener('DOMContentLoaded', function() {

    // Tạo quiz-page nếu chưa có (an toàn khi dùng snippet HTML chỉ có home-page)
    ensureQuizPageExists();

    // file input
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function(e){
            const f = e.target.files[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = function(){
                parseData(reader.result);
            };
            reader.readAsText(f);
        });
    }

    // start button
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.onclick = function(){
            if(quizData.length === 0) return alert("Bạn ơi, hãy tải file trước đã!");
            isSubmitted = false;
            userAnswers = {};

            // copy dữ liệu để giữ quizData gốc
            let finalData = quizData.map(item => Object.assign({}, item));

            // shuffle questions
            const shuffleQuiz = document.getElementById('shuffleQuiz');
            if(shuffleQuiz && shuffleQuiz.checked) {
                finalData.sort(() => Math.random() - 0.5);
            }

            // build options for each item and shuffle answers if checkbox on
            const shuffleAns = document.getElementById('shuffleAns');
            finalData.forEach(item => {
                let opts = [
                    item.correct,
                    item.correct + " (phiên bản 1)",
                    item.correct + " (phiên bản 2)",
                    "Sai khác"
                ]; // tạm tạo distractors đơn giản — thay bằng AI nếu có backend
                if(shuffleAns && shuffleAns.checked) {
                    opts.sort(() => Math.random() - 0.5);
                }
                item.currentOptions = opts;
                item.correctIndex = opts.indexOf(item.correct);
            });

            quizData = finalData;

            // hiển thị và khởi động timer
            document.getElementById('home-page').style.display = 'none';
            document.getElementById('quiz-page').style.display = 'block';
            startTimer();
            renderQuiz();
        };
    }

    // submit button
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.onclick = function() {
            // tìm câu đầu tiên chưa làm
            let firstMissing = -1;
            for (let i = 0; i < quizData.length; i++) {
                if (userAnswers[i] === undefined) { firstMissing = i; break; }
            }
            if (firstMissing !== -1) {
                showIncompleteNotice(firstMissing);
                return;
            }
            // nộp
            submitQuiz();
        };
    }

    // exit button
    const exitBtn = document.getElementById('exitBtn');
    if (exitBtn) {
        exitBtn.onclick = askExit;
    }

    renderLeaderboard();
});

// -----------------------
// HÀM HỖ TRỢ
// -----------------------

function parseData(content){
    // parse dạng: "Câu hỏi: ...", "Đáp án: ..."
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length);
    quizData = [];
    let temp = null;
    lines.forEach(line => {
        if (line.startsWith("Câu hỏi:")) {
            if (temp) quizData.push(temp);
            temp = { q: line.split("Câu hỏi:")[1].trim(), correct: "", currentOptions: [], correctIndex: 0 };
        } else if (line.startsWith("Đáp án:")) {
            if (!temp) return;
            temp.correct = line.split("Đáp án:")[1].trim();
        } else {
            // nếu dòng không có tiền tố, bỏ qua (có thể là mô tả) - hiện không sử dụng
        }
    });
    if (temp) quizData.push(temp);
    alert("Đã tải " + quizData.length + " câu hỏi!");
    renderLeaderboard();
}

function renderQuiz(){
    const container = document.getElementById('quizContent');
    if(!container) return;
    container.innerHTML = quizData.map((item, idx) => {
        const optionsHtml = item.currentOptions.map((opt, i) => `
            <div class="option-row" id="row-${idx}-${i}" onclick="selectOption(${idx}, ${i})">
                <div class="opt-symbol">${String.fromCharCode(65+i)}</div>
                <div class="opt-content-frame">${escapeHtml(opt)}</div>
            </div>
        `).join('');
        return `
            <div class="question-master-card" id="q-block-${idx}">
                <div class="q-number-circle">${idx+1}</div>
                <div class="q-text-frame">${escapeHtml(item.q)}</div>
                <div class="options-container-frame">${optionsHtml}</div>
                <div id="explain-${idx}" class="explain-box" style="display:none; margin-top:10px; color:#0b66c3;">
                    <strong>Giải thích:</strong> Đáp án đúng là <span style="font-weight:bold">${escapeHtml(item.correct)}</span>.
                </div>
            </div>
        `;
    }).join('');
    // cuộn lên đầu quiz khi render
    document.getElementById('quizContent').scrollIntoView({behavior:'smooth', block:'start'});
}

function selectOption(qIdx, optIdx){
    if (isSubmitted) return;
    userAnswers[qIdx] = optIdx;
    const block = document.getElementById(`q-block-${qIdx}`);
    if (!block) return;
    block.querySelectorAll('.option-row').forEach(el => el.classList.remove('selected'));
    const el = document.getElementById(`row-${qIdx}-${optIdx}`);
    if (el) el.classList.add('selected');
}

function startTimer(){
    const timeInput = document.getElementById('fullTime');
    let totalMinutes = timeInput ? Math.max(1, parseInt(timeInput.value) || 15) : 15;
    let timeSeconds = totalMinutes * 60;
    clearInterval(timerInterval);
    startTime = Date.now();
    const timerDisplay = document.getElementById('timerDisplay');
    if (!timerDisplay) return;
    timerDisplay.innerText = formatTime(timeSeconds);
    timerInterval = setInterval(() => {
        if (timeSeconds <= 0) {
            clearInterval(timerInterval);
            if (!isSubmitted) {
                alert("Hết giờ! Hệ thống tự nộp bài.");
                submitQuiz();
            }
            return;
        }
        timeSeconds--;
        timerDisplay.innerText = formatTime(timeSeconds);
    }, 1000);
}

function formatTime(sec){
    const m = Math.floor(sec/60);
    const s = sec%60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function submitQuiz(){
    isSubmitted = true;
    clearInterval(timerInterval);
    let correctCount = 0;

    quizData.forEach((item, idx) => {
        const selIdx = userAnswers[idx];
        const rows = document.querySelectorAll(`#q-block-${idx} .option-row`);
        rows.forEach((row, rIdx) => {
            // reset styles
            row.style.border = "";
            row.style.background = "";
        });
        // highlight correct and incorrect
        rows.forEach((row, rIdx) => {
            if (rIdx === item.correctIndex) {
                row.style.border = "2px solid #28a745";
                row.style.background = "#e9f7ee";
            }
            if (selIdx === rIdx && selIdx !== item.correctIndex) {
                row.style.border = "2px solid #dc3545";
                row.style.background = "#fbeaea";
            }
        });

        if (selIdx === item.correctIndex) correctCount++;
        else document.getElementById(`explain-${idx}`).style.display = 'block';
    });

    let rawScore = (correctCount / quizData.length) * 10;
    let score = Math.round(rawScore * 10) / 10;
    if (score < 1) score = 1;

    // lưu history kèm snapshot câu hỏi và đáp án người dùng
    const record = {
        id: Date.now(),
        score: Number(score),
        correct: correctCount,
        total: quizData.length,
        time: Math.floor((Date.now() - startTime)/1000),
        date: new Date().toLocaleString(),
        quizSnapshot: quizData.map(q => ({ q: q.q, options: q.currentOptions.slice(), correct: q.correct })),
        userAnswers: Object.assign({}, userAnswers)
    };
    history.push(record);
    localStorage.setItem('huy_quiz_history', JSON.stringify(history));

    // thông báo kết quả
    alert(`KẾT QUẢ\nĐiểm: ${score}/10\nĐúng: ${correctCount}/${quizData.length}\nThời gian: ${record.time}s`);
    renderLeaderboard();
}

// -----------------------
// BẢNG LỊCH SỬ / XẾP HẠNG
// -----------------------
function renderLeaderboard(){
    const list = document.getElementById('leaderboardList');
    if(!list) return;
    // sắp xếp: điểm giảm dần, nếu bằng thì thời gian tăng dần (nhanh hơn => xếp trước)
    const sorted = [...history].sort((a,b) => (b.score - a.score) || (a.time - b.time));
    list.innerHTML = sorted.map((h, i) => {
        // find original index in history to reference id
        const rec = h;
        const medalClass = i === 0 ? 'medal-gold' : (i===1 ? 'medal-silver' : (i===2 ? 'medal-bronze' : ''));
        const medalEmoji = i===0 ? '🥇' : (i===1 ? '🥈' : (i===2 ? '🥉' : ''));
        return `
            <div class="rank-item ${medalClass}" style="${i===0 ? 'border:2px solid gold;' : i===1 ? 'border:2px solid silver;' : i===2 ? 'border:2px solid #b87333;' : 'border:1px solid #ddd;'} padding:10px; margin-bottom:8px; border-radius:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div><strong style="${i===0 ? 'font-size:1.05em;' : ''}">${medalEmoji} Hạng ${i+1}</strong></div>
                    <div style="font-size:0.9em; color:#666">${h.date}</div>
                </div>
                <div style="margin-top:6px;">
                    <div>Điểm: <strong>${h.score}</strong> /10 — ${h.correct}/${h.total} đúng</div>
                    <div style="font-size:0.9em; color:#666">Thời gian: ${h.time}s</div>
                </div>
                <div style="margin-top:8px; display:flex; gap:8px;">
                    <button onclick="viewHistory(${h.id})" style="padding:6px 10px; border-radius:6px; border:1px solid #1976d2; background:white; color:#1976d2; cursor:pointer;">Xem lại</button>
                    <button onclick="retryHistory(${h.id})" style="padding:6px 10px; border-radius:6px; border:none; background:#1976d2; color:white; cursor:pointer;">Làm lại</button>
                </div>
            </div>
        `;
    }).join('');
}

// view history modal
function viewHistory(recordId) {
    const rec = history.find(r => r.id === recordId);
    if (!rec) return alert("Không tìm thấy bản ghi");
    // tạo modal
    const modal = document.createElement('div');
    modal.style = 'position:fixed; left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:9999;';
    modal.innerHTML = `
        <div style="width:90%;max-width:900px;background:white;border-radius:10px;padding:16px;max-height:90%;overflow:auto">
            <div style="display:flex;justify-content:space-between;align-items:center">
                <h3>Chi tiết bài làm — Điểm: ${rec.score}/10</h3>
                <button id="closeHistoryBtn" style="padding:6px 10px;border-radius:6px;border:none;background:#ccc;cursor:pointer">Đóng</button>
            </div>
            <div style="margin-top:8px;color:#666">Ngày: ${rec.date} — Thời gian: ${rec.time}s</div>
            <div id="historyContent" style="margin-top:12px"></div>
            <div style="margin-top:12px; text-align:right;">
                <button id="closeHistoryBtn2" style="padding:8px 12px;border-radius:6px;border:none;background:#1976d2;color:white;cursor:pointer">Đóng</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    const content = modal.querySelector('#historyContent');
    content.innerHTML = rec.quizSnapshot.map((q, idx) => {
        const userSel = rec.userAnswers ? rec.userAnswers[idx] : undefined;
        return `
            <div style="border:1px solid #eee;padding:10px;border-radius:8px;margin-bottom:8px">
                <div style="font-weight:bold">Câu ${idx+1}: ${escapeHtml(q.q)}</div>
                <div style="margin-top:6px">
                    ${q.options.map((opt, i) => {
                        const isCorrect = opt === q.correct;
                        const isSelected = (userSel === i);
                        const style = isCorrect ? 'border:2px solid #28a745;background:#e9f7ee;padding:6px;border-radius:6px;margin-bottom:6px' :
                                      (isSelected ? 'border:2px solid #dc3545;background:#fbeaea;padding:6px;border-radius:6px;margin-bottom:6px' :
                                      'border:1px solid #ddd;padding:6px;border-radius:6px;margin-bottom:6px');
                        return `<div style="${style}">${String.fromCharCode(65+i)}. ${escapeHtml(opt)}</div>`;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
    modal.querySelectorAll('#closeHistoryBtn, #closeHistoryBtn2').forEach(b => b.onclick = () => modal.remove());
}

// retry history
function retryHistory(recordId) {
    const rec = history.find(r => r.id === recordId);
    if (!rec) return alert("Không tìm thấy bản ghi");
    // load snapshot as current quiz
    quizData = rec.quizSnapshot.map(q => ({ q: q.q, currentOptions: q.options.slice(), correct: q.correct, correctIndex: q.options.indexOf(q.correct) }));
    userAnswers = {};
    isSubmitted = false;
    document.getElementById('home-page').style.display = 'none';
    document.getElementById('quiz-page').style.display = 'block';
    startTimer();
    renderQuiz();
}

// -----------------------
// HỖ TRỢ UI nhỏ
// -----------------------
function showIncompleteNotice(questionIndex){
    // giống như yêu cầu: popup nhỏ có OK, nhấn OK cuộn tới câu
    const existing = document.getElementById('incompleteNotice');
    if (existing) existing.remove();
    const notice = document.createElement('div');
    notice.id = 'incompleteNotice';
    notice.style = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:white;border:2px solid #1976d2;padding:18px;border-radius:10px;z-index:10000;box-shadow:0 8px 30px rgba(0,0,0,0.15);';
    notice.innerHTML = `
        <div style="margin-bottom:10px;font-weight:bold">Bạn chưa hoàn thành câu ${questionIndex+1}</div>
        <div style="text-align:center"><button id="incOkBtn" style="padding:8px 16px;background:#1976d2;color:white;border:none;border-radius:6px;cursor:pointer">OK</button></div>
    `;
    document.body.appendChild(notice);
    document.getElementById('incOkBtn').onclick = function(){
        notice.remove();
        const target = document.getElementById(`q-block-${questionIndex}`);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
}

function askExit(){
    if (confirm("Bạn có muốn thoát bài thi?")) {
        clearInterval(timerInterval);
        location.reload();
    }
}

function ensureQuizPageExists(){
    if (!document.getElementById('quiz-page')) {
        const sec = document.createElement('section');
        sec.id = 'quiz-page';
        sec.style = 'display:none;padding:16px;';
        sec.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <div style="display:flex;gap:10px;align-items:center">
                    <button id="exitBtn" style="padding:6px 10px;border-radius:6px;border:1px solid #ccc;cursor:pointer">Thoát</button>
                    <div id="timerDisplay" style="font-weight:bold;color:#1976d2">00:00</div>
                </div>
                <div>
                    <button id="submitBtn" style="padding:8px 14px;background:#1976d2;color:white;border:none;border-radius:6px;cursor:pointer">NỘP BÀI</button>
                </div>
            </div>
            <div id="quizContent"></div>
        `;
        document.body.appendChild(sec);
        // attach exit handler
        document.getElementById('exitBtn').onclick = askExit;
        // submit handler already bound in DOMContentLoaded (if existed), else bind here:
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) submitBtn.onclick = function(){
            let firstMissing = -1;
            for (let i = 0; i < quizData.length; i++) { if (userAnswers[i] === undefined) { firstMissing = i; break; } }
            if (firstMissing !== -1) { showIncompleteNotice(firstMissing); return; }
            submitQuiz();
        };
    }
}

// escape html
function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
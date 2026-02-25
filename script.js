let quizData = [];
let userAnswers = {};
let startTime, timerInterval;
let history = JSON.parse(localStorage.getItem('huy_quiz_history')) || [];
let isSubmitted = false;

// BỌC LẠI ĐỂ CHỐNG LỖI: Đợi HTML tải xong 100% mới chạy các lệnh bên trong
document.addEventListener('DOMContentLoaded', function() {

    // 1. Lắng nghe sự kiện tải file
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function(e){
            const reader = new FileReader();
            reader.onload = function(){
                parseData(reader.result);
            };
            reader.readAsText(e.target.files[0]);
        });
    }

    // 2. Lắng nghe sự kiện bấm nút Bắt đầu
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.onclick = function(){
            if(quizData.length === 0) return alert("bạn ơi, hãy tải file trước đã!");

            isSubmitted = false;
            userAnswers = {};
            
            let finalData = [...quizData];
            const shuffleQuiz = document.getElementById('shuffleQuiz');
            if(shuffleQuiz && shuffleQuiz.checked) {
                finalData.sort(() => Math.random() - 0.5);
            }

            const shuffleAns = document.getElementById('shuffleAns');
            finalData.forEach(item => {
                let opts = [item.correct, "Đáp án sai 1", "Đáp án sai 2", "Đáp án sai 3"];
                if(shuffleAns && shuffleAns.checked) {
                    opts.sort(() => Math.random() - 0.5);
                }
                item.currentOptions = opts;
            });

            quizData = finalData;
            document.getElementById('home-page').style.display = 'none';
            document.getElementById('quiz-page').style.display = 'block';
            
            startTimer();
            renderQuiz();
        };
    }

    // 3. Lắng nghe sự kiện bấm nút Nộp bài
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.onclick = function() {
            for(let i=0; i<quizData.length; i++) {
                if(!userAnswers[i] && userAnswers[i] !== 0) {
                    alert("bạn còn câu số " + (i+1) + " chưa làm kìa!");
                    document.getElementById(`q-block-${i}`).scrollIntoView({behavior: 'smooth'});
                    return;
                }
            }
            submitQuiz();
        };
    }

    // Hiển thị bảng xếp hạng khi vừa vào trang
    renderLeaderboard();
});

// ===============================
// CÁC HÀM XỬ LÝ NẰM NGOÀI
// ===============================

function parseData(content){
    const lines = content.split('\n');
    quizData = [];
    let temp = null;
    lines.forEach(line => {
        if(line.includes("Câu hỏi:")){
            if(temp) quizData.push(temp);
            temp = { q: line.split("Câu hỏi:")[1].trim(), options: [], correct: "" };
        } else if(line.includes("Đáp án:")){
            temp.correct = line.split("Đáp án:")[1].trim();
        }
    });
    if(temp) quizData.push(temp);
    alert("Đã tải " + quizData.length + " câu hỏi!");
}

function startTimer() {
    const timeInput = document.getElementById('fullTime');
    let totalMinutes = timeInput ? parseInt(timeInput.value) : 15;
    let timeSeconds = totalMinutes * 60;
    
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        let mins = Math.floor(timeSeconds / 60);
        let secs = timeSeconds % 60;
        document.getElementById('timerDisplay').innerText = 
            `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        if(timeSeconds <= 0) {
            clearInterval(timerInterval);
            alert("Hết giờ! Hệ thống tự nộp bài.");
            submitQuiz();
        }
        timeSeconds--;
    }, 1000);
}

function renderQuiz(){
    const container = document.getElementById('quizContent'); // Đảm bảo ID này khớp với HTML (quizContainer hoặc quizContent)
    if(!container) return;
    container.innerHTML = quizData.map((item, idx) => `
        <div class="question-master-card" id="q-block-${idx}">
            <div class="q-number-circle">${idx + 1}</div>
            <div class="q-text-frame">${item.q}</div>
            <div class="options-container-frame">
                ${item.currentOptions.map((opt, i) => `
                    <div class="option-row" onclick="selectOption(${idx}, '${opt}')" id="row-${idx}-${i}">
                        <div class="opt-symbol">${String.fromCharCode(65+i)}</div>
                        <div class="opt-content-frame">${opt}</div>
                    </div>
                `).join('')}
            </div>
            <div id="explain-${idx}" style="display:none; margin-top:10px; color: blue;">
                <strong>Giải thích:</strong> Đáp án đúng là ${item.correct}.
            </div>
        </div>
    `).join('');
}

function selectOption(qIdx, val){
    if(isSubmitted) return;
    userAnswers[qIdx] = val;
    
    const block = document.getElementById(`q-block-${qIdx}`);
    block.querySelectorAll('.option-row').forEach(el => el.classList.remove('selected'));
    
    const optIndex = quizData[qIdx].currentOptions.indexOf(val);
    document.getElementById(`row-${qIdx}-${optIndex}`).classList.add('selected');
}

function submitQuiz() {
    isSubmitted = true;
    clearInterval(timerInterval);
    let correctCount = 0;

    quizData.forEach((item, idx) => {
        const selected = userAnswers[idx];
        const rows = document.getElementById(`q-block-${idx}`).querySelectorAll('.option-row');
        
        rows.forEach(row => {
            const rowVal = row.querySelector('.opt-content-frame').innerText;
            if(rowVal === item.correct) {
                row.style.border = "2px solid #28a745"; 
                row.style.background = "#d4edda";
            }
            if(selected === rowVal && selected !== item.correct) {
                row.style.border = "2px solid #dc3545"; 
                row.style.background = "#f8d7da";
            }
        });

        if(selected === item.correct) correctCount++;
        else document.getElementById(`explain-${idx}`).style.display = 'block';
    });

    const score = ((correctCount / quizData.length) * 10).toFixed(1);
    saveHistory(score, correctCount);
    alert(`Hoàn thành! bạn được ${score} điểm.`);
}

function saveHistory(score, correct) {
    history.push({ score: score, correct: correct, total: quizData.length, date: new Date().toLocaleString() });
    localStorage.setItem('huy_quiz_history', JSON.stringify(history));
    renderLeaderboard();
}

function renderLeaderboard(){
    const list = document.getElementById('leaderboardList');
    if(!list) return;
    const sorted = [...history].sort((a,b) => b.score - a.score);
    list.innerHTML = sorted.map((h, i) => `
        <div class="rank-item" style="${i===0 ? 'border: 2px solid gold' : ''}">
            <b>Hạng ${i+1}</b> - ${h.score}đ (${h.correct}/${h.total})<br>
            <small>${h.date}</small>
        </div>
    `).join('');
}

function askExit() {
    if(confirm("Thoát bài thi?")) location.reload();
                      }
                   

// 1. Hiệu ứng Mưa hạt Nano
const canvas = document.getElementById('nano-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
function initNano() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    for(let i=0; i<60; i++) particles.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, s: Math.random()*2, v: Math.random()*0.5+0.2 });
}
function drawNano() {
    ctx.clearRect(0,0,canvas.width,canvas.height); ctx.fillStyle = "rgba(255,255,255,0.4)";
    particles.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI*2); ctx.fill();
        p.y += p.v; if(p.y > canvas.height) p.y = -5;
    });
    requestAnimationFrame(drawNano);
}
initNano(); drawNano();

// 2. Logic app
const app = {
    quizData: [],
    init() {
        document.getElementById('btn-create').onclick = () => this.handleAI();
        document.getElementById('btn-go').onclick = () => this.startQuiz();
        document.getElementById('btn-finish').onclick = () => this.finish();
        document.getElementById('btn-retry-pop').onclick = () => { ui.close('pop-result'); this.startQuiz(); };
    },
    async handleAI() {
        alert("AI đang thực hiện yêu cầu của Huy...");
        const result = await QuizAI.generate({
            text: document.getElementById('ai-content').value,
            prompt: document.getElementById('ai-prompt').value,
            count: document.getElementById('q-count').value,
            mode: document.getElementById('quiz-mode').value
        });
        if(result) { this.quizData = result; alert("AI đã tạo xong đề!"); }
    },
    startQuiz() {
        if(this.quizData.length === 0) return alert("Chưa có dữ liệu câu hỏi!");
        const pass = document.getElementById('quiz-pass').value;
        if(pass && prompt("Nhập mật khẩu bài thi:") !== pass) return alert("Sai mật khẩu!");

        ui.hide('main-space'); ui.show('quiz-workspace');
        
        // Xáo trộn
        let data = JSON.parse(JSON.stringify(this.quizData));
        if(document.getElementById('mix-q').checked) data.sort(()=>Math.random()-0.5);
        if(document.getElementById('mix-a').checked) {
            data.forEach(q => {
                let correctText = q.options[q.correct];
                q.options.sort(()=>Math.random()-0.5);
                q.correct = q.options.indexOf(correctText);
            });
        }
        ui.render(data);
        window.scrollTo(0,0);
    },
    finish() {
        let score = 0;
        this.quizData.forEach((q, i) => {
            const selected = document.querySelector(`input[name="q${i}"]:checked`);
            if(selected && parseInt(selected.value) === q.correct) score++;
        });
        ui.showResult(score, this.quizData.length);
    },
    share() { navigator.clipboard.writeText(window.location.href); alert("Đã copy link!"); }
};

const ui = {
    show(id) { document.getElementById(id).classList.remove('hidden'); },
    hide(id) { document.getElementById(id).classList.add('hidden'); },
    close(id) { document.getElementById(id).classList.add('hidden'); },
    render(data) {
        document.getElementById('questions-area').innerHTML = data.map((q, i) => `
            <div class="q-card">
                <h3>Câu ${i+1}: ${q.question}</h3>
                <div class="opts">
                    ${q.options.map((o, j) => `<label><input type="radio" name="q${i}" value="${j}"> ${o}</label><br>`).join('')}
                </div>
            </div>
        `).join('');
    },
    showResult(s, t) {
        const finalScore = Math.round((s/t)*10);
        document.getElementById('res-score').innerText = finalScore;
        document.getElementById('res-detail').innerText = `Bạn đúng ${s}/${t} câu.`;
        document.getElementById('res-msg').innerText = finalScore >= 8 ? "Huy khen: Bạn giỏi lắm!" : "Cố gắng lên nhé!";
        this.show('pop-result');
    },
    closeResult() { this.close('pop-result'); }
};
app.init();

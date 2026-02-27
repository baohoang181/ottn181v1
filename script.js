/** * LOGIC ĐIỀU PHỐI OTTN181 
 * Sửa lỗi kẹt thanh tiến độ và liên kết animation 
 */
const app = {
    rawQuiz: [],
    displayQuiz: [],
    settings: {},
    editIdx: null,
    timer: null,

    init() {
        this.runNano();
        this.loadSession(); // Tự động lưu bài làm
        document.getElementById('btn-run').onclick = () => this.handleAI();
        document.getElementById('btn-submit').onclick = () => this.finishExam();
        
        // Theo dõi để Auto-save
        document.addEventListener('change', (e) => {
            if(e.target.name?.startsWith('q')) this.saveSession();
        });
    },

    // 1. FIX LỖI THANH TIẾN ĐỘ & KEY AI
    async handleAI() {
        const file = document.getElementById('file-upload').files[0];
        const prompt = document.getElementById('ai-prompt').value.trim();

        if(!file && !prompt) {
            gsap.to(['#box-file', '#box-prompt'], { className: "+=blink-err", duration: 0.1, repeat: 5, yoyo: true });
            return;
        }

        ui.show('pop-loading');
        this.startLoadingBar();

        try {
            const text = file ? await AI_CORE.parseFile(file) : "Manual Input";
            const result = await AI_CORE.analyze({
                text, prompt, 
                count: document.getElementById('q-count').value,
                mode: document.getElementById('quiz-mode').value
            });
            
            if(result && result.length > 0) {
                this.rawQuiz = result;
                // Đảm bảo thanh tiến độ chạy đến 100% rồi mới hiện nút
                this.forceCompleteLoading();
            }
        } catch (e) {
            document.getElementById('load-status').innerText = "AI ĐANG BẬN - ĐANG THỬ LẠI...";
            setTimeout(() => this.handleAI(), 2000);
        }
    },

    startLoadingBar() {
        let p = 0;
        clearInterval(this.barItv);
        this.barItv = setInterval(() => {
            if(p < 90) p += Math.random() * 2;
            document.getElementById('bar-fill').style.width = p + "%";
        }, 100);
    },

    forceCompleteLoading() {
        clearInterval(this.barItv);
        gsap.to('#bar-fill', { width: "100%", duration: 0.5, onComplete: () => {
            ui.hide('pop-loading');
            ui.show('pop-congrats');
        }});
    },

    // 2. CHỨC NĂNG CHỈNH SỬA (GIỮ NGUYÊN Ý TƯỞNG - NÚT X TRÁI)
    checkEdit() {
        if(this.rawQuiz.length === 0) return alert("Huy cần tạo đề trước!");
        this.renderEditList();
        ui.show('pop-editor');
    },

    renderEditList() {
        document.getElementById('edit-header').innerText = "Danh sách câu hỏi";
        document.getElementById('btn-save-edit').classList.add('hidden');
        const area = document.getElementById('edit-body');
        area.innerHTML = this.rawQuiz.map((q, i) => `
            <div class="edit-item" onclick="app.openEditGate(${i})" 
                 style="padding:15px; border-radius:15px; background:#f9f9f9; margin:10px 0; cursor:pointer">
                <b>${i+1}.</b> ${q.question.substring(0, 50)}...
            </div>
        `).join('');
    },

    openEditGate(idx) {
        this.editIdx = idx;
        document.getElementById('edit-header').innerText = `Sửa Câu ${idx+1}`;
        document.getElementById('edit-body').innerHTML = `
            <button class="btn-gold" style="margin-bottom:10px" onclick="app.showSubEdit('ans')">Thay đổi đáp án đúng</button>
            <button class="btn-gold" onclick="app.showSubEdit('all')">Thay đổi nội dung toàn bộ</button>
        `;
    },

    showSubEdit(type) {
        const q = this.rawQuiz[this.editIdx];
        const area = document.getElementById('edit-body');
        const saveBtn = document.getElementById('btn-save-edit');
        saveBtn.classList.remove('hidden');

        if(type === 'ans') {
            area.innerHTML = q.options.map((o, i) => `
                <label style="display:block; margin:10px 0"><input type="radio" name="ed-c" value="${i}" ${i===q.correct?'checked':''}> ${o}</label>
            `).join('');
            saveBtn.onclick = () => {
                this.rawQuiz[this.editIdx].correct = parseInt(document.querySelector('input[name="ed-c"]:checked').value);
                this.renderEditList();
            };
        } else {
            area.innerHTML = `
                <textarea id="ed-q" style="width:100%; height:80px; margin-bottom:10px">${q.question}</textarea>
                ${q.options.map((o, i) => `<input id="ed-o${i}" value="${o}" style="width:100%; margin:5px 0">`).join('')}
            `;
            saveBtn.onclick = () => {
                this.rawQuiz[this.editIdx].question = document.getElementById('ed-q').value;
                this.rawQuiz[this.editIdx].options = [0,1,2,3].map(i => document.getElementById(`ed-o${i}`).value);
                this.renderEditList();
            };
        }
    },

    editorBack() {
        if(document.getElementById('edit-header').innerText === "Danh sách câu hỏi") ui.hide('pop-editor');
        else this.renderEditList();
    },

    // 3. KHÔNG GIAN LÀM BÀI & AUTO-SAVE
    openName() { ui.hide('pop-congrats'); ui.show('pop-name'); },

    enterExam() {
        const p = document.getElementById('quiz-pass').value;
        if(p && prompt("Mật khẩu đề:") !== p) return;
        
        ui.hide('pop-name'); ui.hide('control-panel'); ui.show('workspace');
        
        this.displayQuiz = JSON.parse(JSON.stringify(this.rawQuiz));
        if(document.getElementById('mix-q').checked) this.displayQuiz.sort(() => Math.random() - 0.5);
        
        this.renderQuiz();
        this.startTimer(document.getElementById('q-time').value * 60);
        gsap.from('.q-card', { opacity: 0, y: 20, stagger: 0.1 });
    },

    renderQuiz() {
        document.getElementById('display-title').innerText = document.getElementById('quiz-title').value;
        document.getElementById('quiz-render').innerHTML = this.displayQuiz.map((q, i) => `
            <div class="q-card" style="background:white; padding:25px; border-radius:20px; margin-bottom:15px; border:1px solid #eee">
                <h4>Câu ${i+1}: ${q.question}</h4>
                ${q.options.map((o, j) => `<label style="display:block; margin:10px 0; cursor:pointer"><input type="radio" name="q${i}" value="${j}"> ${o}</label>`).join('')}
            </div>
        `).join('');
    },

    saveSession() {
        const ans = {};
        this.displayQuiz.forEach((_, i) => {
            const sel = document.querySelector(`input[name="q${i}"]:checked`);
            if(sel) ans[i] = sel.value;
        });
        localStorage.setItem('ottn_last', JSON.stringify({ q: this.displayQuiz, a: ans, t: document.getElementById('q-time').value }));
    },

    loadSession() {
        const s = localStorage.getItem('ottn_last');
        if(!s) return;
        if(confirm("Khôi phục bài làm đang dở chứ Huy?")) {
            const d = JSON.parse(s);
            this.displayQuiz = d.q;
            ui.hide('control-panel'); ui.show('workspace');
            this.renderQuiz();
            for(let i in d.a) {
                const rb = document.querySelector(`input[name="q${i}"][value="${d.a[i]}"]`);
                if(rb) rb.checked = true;
            }
            this.startTimer(d.t * 60);
        }
    },

    finishExam() {
        clearInterval(this.timer);
        localStorage.removeItem('ottn_last');
        let s = 0;
        this.displayQuiz.forEach((q, i) => {
            const sel = document.querySelector(`input[name="q${i}"]:checked`);
            if(sel && parseInt(sel.value) === q.correct) s++;
        });
        this.saveLeaderboard(s);
        this.exportPDF(s);
        alert(`Điểm của Huy: ${s}/${this.displayQuiz.length}. Đã lưu kết quả & Xuất PDF!`);
        location.reload();
    },

    saveLeaderboard(score) {
        let lb = JSON.parse(localStorage.getItem('ottn_lb') || '[]');
        lb.push({ n: document.getElementById('user-name').value || "Huy", s: score, t: this.displayQuiz.length, d: new Date().toLocaleDateString() });
        lb.sort((a,b) => b.s - a.s);
        localStorage.setItem('ottn_lb', JSON.stringify(lb.slice(0, 10)));
    },

    showLeaderboard() {
        const lb = JSON.parse(localStorage.getItem('ottn_lb') || '[]');
        document.getElementById('lb-content').innerHTML = `<table><tr><th>Tên</th><th>Điểm</th></tr>${lb.map(it => `<tr><td>${it.n}</td><td>${it.s}/${it.t}</td></tr>`).join('')}</table>`;
        ui.hide('control-panel'); ui.show('leaderboard-section');
    },

    exportPDF(score) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.text(`KET QUA OTTN181 - ${document.getElementById('user-name').value}`, 20, 20);
        const rows = this.displayQuiz.map((q, i) => {
            const sel = document.querySelector(`input[name="q${i}"]:checked`);
            return [i+1, q.question.substring(0, 50), q.options[q.correct], sel ? q.options[sel.value] : "N/A"];
        });
        doc.autoTable({ startY: 30, head: [['STT', 'Cau hoi', 'Dap an dung', 'Ban chon']], body: rows });
        doc.save('KetQua.pdf');
    },

    runNano() {
        const c = document.getElementById('nano-canvas'), ctx = c.getContext('2d');
        let ps = [];
        const res = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
        window.onresize = res; res();
        for(let i=0; i<60; i++) ps.push({x:Math.random()*c.width, y:Math.random()*c.height, v:Math.random()*0.3+0.1});
        const draw = () => {
            ctx.clearRect(0,0,c.width,c.height); ctx.fillStyle = "rgba(26,115,232,0.1)";
            ps.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 1.2, 0, 7); ctx.fill(); p.y += p.v; if(p.y>c.height) p.y=-5; });
            requestAnimationFrame(draw);
        };
        draw();
    },

    startTimer(sec) {
        this.timer = setInterval(() => {
            sec--;
            let m = Math.floor(sec/60), s = sec%60;
            document.getElementById('display-timer').innerText = `${m}:${s<10?'0':''}${s}`;
            if(sec<=0) this.finishExam();
        }, 1000);
    },

    goHome() { ui.hide('leaderboard-section'); ui.show('control-panel'); },
    restoreSettings() { location.reload(); }
};

const ui = {
    show(id) { document.getElementById(id).classList.remove('hidden'); },
    hide(id) { document.getElementById(id).classList.add('hidden'); }
};

app.init();

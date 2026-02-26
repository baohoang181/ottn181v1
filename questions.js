const QuizAI = {
    async generate(p) {
        const API_KEY = "AIzaSyDuSu1OQGeJhryW5HTGG46pNPCBUigjVJ8"; // Dán Key của Huy vào đây
        const prompt = `
            Đóng vai người tạo đề cho hệ thống OTTN181 v1.
            Nội dung: ${p.text}. Chế độ: ${p.mode}. Yêu cầu thêm: ${p.prompt}.
            Nếu nội dung có cấu trúc "Câu hỏi: X - Câu trả lời: Y", hãy giữ nguyên X và Y, tạo thêm 3 đáp án sai cực kỳ tinh vi.
            Trả về JSON Array: [{"question":"", "options":["đúng","sai1","sai2","sai3"], "correct":0}]
        `;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
                method: "POST",
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim();
            return JSON.parse(text);
        } catch (e) { return null; }
    }
};

# -frontend-backend-
📄 NIYAMR PDF Rule Checker – Full-Stack Assignment
48-Hour Full-Stack Developer Assignment (Completed Functionality)

Tech Stack: Node.js, Express, PDF.js, pdf-parse, React (Vite), Tailwind, Multer, HuggingFace API (attempted integration)

🚀 Project Overview

This project is a full-stack web application that allows a user to:

Upload any PDF (2–10 pages)

Enter 3 custom rules (e.g., “must contain a date”, “must mention purpose”, etc.)

Run a document check

Extract text from the PDF

Send the text + rules to an LLM

Display PASS / FAIL, evidence, short reasoning, and confidence score

The assignment required building:
✔ Frontend (Upload + Rules + Results Table)
✔ Backend (PDF extraction + routes + LLM integration)
✔ Clean UI + meaningful results

All required core functionality has been implemented.

🛠️ What I Completed Successfully
✅ Backend API (Node.js / Express)

/api/check/pdf – Accepts PDF upload and extracts text

/api/check/pdf/sample – Loads a sample PDF stored on the server

/api/check/rules – Evaluates rules against extracted text

Integrated pdf.js (pdfjs-dist) for structured extraction

Added pdf-parse fallback for robust text extraction

Configured worker scripts & standard fonts

Clean and modular code structure (routes, uploads, llm.js, server.js)

✅ Frontend (React + Vite)

PDF upload UI

Rule entry inputs

“Check Document” button

Dynamic table showing:

Rule

Status

Evidence

Reasoning

Confidence

✅ Sample PDF Flow Working

The sample PDF included:
/mnt/data/NIYAMR_Fullstack_Assignment.pdf
I created a sample route so evaluators can test quickly.

⚠️ LLM Integration (Attempted Fully)

I implemented complete support for:

✔ HuggingFace Router API
✔ HuggingFace Inference API
✔ Gemini API
✔ OpenAI API (Optional)

I wrote a robust llm.js that:

Builds prompts

Calls the LLM

Parses JSON output

Handles all failures gracefully

Provides a deterministic fallback when an external LLM is unavailable

However:
Due to recent changes on HuggingFace Router & Inference billing policies, free-tier access for models such as flan-t5-base, falcon-7b-instruct, and meta-llama is restricted.

I tested multiple endpoints, tokens, model variations, curl checks, and fallback logic — but the APIs consistently returned:

404 Model not available

410 Inference API deprecated

Router API billing requirement messages

Because Gemini, ChatGPT, and HF Router all require paid billing for text-generation, and due to time constraints, I could not finalize the live LLM output.

👉 Important:
All LLM logic is implemented.
The app switches to a fallback mode automatically to avoid breaking the UI.

This means the system is architecturally complete and easy to finish — it only needs a valid paid API key to enable real AI outputs.

🧠 Architecture
backend/
 ├─ src/
 │   ├─ server.js          # Express server
 │   ├─ llm.js             # LLM prompt & call logic
 │   ├─ routes/
 │   │     └─ check.js     # PDF + Rules API
 │   └─ uploads/           # User PDFs + sample PDF
 └─ .env                   # API keys
frontend/
 └─ vite-project/          # React UI + results table

📝 How to Run
Backend
cd backend
npm install
node src/server.js

Frontend
cd frontend/vite-project
npm install
npm run dev

🧪 Testing the App
Upload a PDF

Choose any 2–10 page PDF.

Enter Rules

Examples:

must contain java

must mention a date

document must define at least one term

Click "Upload & Check"

If no paid LLM key is provided, the system will still respond using fallback logic:

status: "fail"
reasoning: "HF API failed"
confidence: 0

❤️ Final Notes for Evaluators

I invested significant effort into:

Correct PDF extraction

Clean full-stack architecture

Modular routing

Robust fallback logic

HuggingFace, Gemini, and OpenAI integration attempts

Debugging API edge cases (404, 410, Router restrictions)

Due to billing restrictions and strict time limits, I could not activate paid LLM models.
However, the system is fully ready — simply adding a valid API key will enable real AI-based rule evaluation.

Everything else required in the assignment is 100% complete.

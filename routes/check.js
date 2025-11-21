  // backend/src/routes/check.js
  // Updated: pdfjs font fix + pdf-parse fallback + flexible LLM integration (uses ../llm.callLLM)

  const express = require("express");
  const multer = require("multer");
  const fs = require("fs");
  const path = require("path");
  const pdfParse = require("pdf-parse"); // fallback extractor

  // polyfill fetch for Node < 18 if node-fetch installed
  const fetch = (() => {
    try {
      if (typeof global.fetch === "function") return global.fetch;
      // require node-fetch if available in node_modules
      // eslint-disable-next-line global-require
      const nf = require("node-fetch");
      global.fetch = nf;
      return nf;
    } catch (e) {
      return undefined;
    }
  })();

  const { analyzeText, callLLM } = require("../llm"); // analyzeText + callLLM provided by backend/src/llm.js

  const router = express.Router();

  /* =======================
    pdf.js loader + helpers
    ======================= */
  let _pdfjs = null;
  async function loadPdfjs() {
    if (_pdfjs) return _pdfjs;
    const mod = await import("pdfjs-dist/legacy/build/pdf.mjs");
    _pdfjs = mod.default || mod;

    // tell pdfjs where to load standard fonts from (server serves /pdfjs/standard_fonts)
    try {
      const fontsUrl = "http://localhost:4000/pdfjs/standard_fonts/";
      if (_pdfjs && _pdfjs.GlobalWorkerOptions) {
        _pdfjs.GlobalWorkerOptions.standardFontDataUrl = fontsUrl;
      }
    } catch (e) {
      console.warn("Could not set standardFontDataUrl:", e && e.message);
    }

    return _pdfjs;
  }

  function toUint8Array(input) {
    if (input instanceof Uint8Array && !(input instanceof Buffer)) return input;
    if (Buffer.isBuffer(input))
      return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    throw new TypeError("Unsupported input type for PDF binary conversion: " + typeof input);
  }

  /**
   * Try to extract text using pdfjs. If pdfjs fails or returns empty text,
   * fall back to pdf-parse which often extracts raw text.
   */
  async function extractTextFromPdfBuffer(buffer) {
    // try pdf.js first
    try {
      const pdfjs = await loadPdfjs();
      const dataUint8 = toUint8Array(buffer);

      const opts = {
        data: dataUint8,
        disableWorker: true,
        standardFontDataUrl: "http://localhost:4000/pdfjs/standard_fonts/",
      };

      const loadingTask = pdfjs.getDocument(opts);
      const doc = await loadingTask.promise;

      let fullText = "";
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = (content.items || []).map((it) => it.str || "").join(" ");
        fullText += pageText + "\n";
      }

      // if pdfjs returns non-empty text, return it
      if (fullText && fullText.trim().length > 0) {
        return { text: fullText, numpages: doc.numPages };
      }

      // otherwise throw to fall back
      throw new Error("pdfjs extracted empty text, falling back to pdf-parse");
    } catch (err) {
      // fallback to pdf-parse
      try {
        const data = await pdfParse(buffer);
        const fallbackText = (data && data.text) ? data.text : "";
        const pages = data && data.numpages ? data.numpages : 1;
        return { text: fallbackText, numpages: pages };
      } catch (err2) {
        // If fallback also fails, rethrow the original for logging
        console.error("extractTextFromPdfBuffer: both pdfjs and pdf-parse failed", err, err2);
        throw err2 || err;
      }
    }
  }

  /* =================
    multer storage
    ================= */
  const uploadDir = path.join(__dirname, "..", "uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const safeName = `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`;
      cb(null, safeName);
    },
  });
  const upload = multer({ storage });

  /* =================
    ROUTES
    ================= */

  // NOTE: sample PDF path (uploaded file). This is the local path we will use for the sample endpoint.
  // We'll expose it as-is — your tooling will transform the path into a usable URL if needed.
// replace the old SAMPLE_LOCAL_PATH line with:
const SAMPLE_LOCAL_PATH = path.join(__dirname, '..', 'uploads', 'NIYAMR_Fullstack_Assignment.pdf');





  // POST /api/check/pdf/sample -> load sample file on server
  router.post("/pdf/sample", async (req, res) => {
    try {
      const samplePath = SAMPLE_LOCAL_PATH;
      if (!fs.existsSync(samplePath)) {
        return res.status(404).json({ error: "Sample PDF not found at " + samplePath });
      }

      const buffer = fs.readFileSync(samplePath);
      const parsed = await extractTextFromPdfBuffer(buffer);

      // analyzeText might call remote HF or be deterministic; wrap in try/catch so we still return parsed text even if analyzeText fails
      let analysis = {};
      try {
        analysis = await analyzeText(parsed.text || "");
      } catch (e) {
        console.warn("analyzeText failed (maybe missing API key):", e && e.message);
        analysis = { summary: "analysis unavailable", keywordsFound: [], warnings: [String(e && e.message || "analysis failed")] };
      }

      return res.json({
        filename: path.basename(samplePath),
        pages: parsed.numpages,
        text: parsed.text || "",
        analysis,
        samplePath // include local path for debugging
      });
    } catch (err) {
      console.error("/pdf/sample error:", err && (err.stack || err.message || err));
      return res.status(500).json({ error: "Server error", details: err && err.message });
    }
  });

  // POST /api/check/pdf -> upload file
  router.post("/pdf", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded. Use field "file"' });

      const filePath = req.file.path;
      console.log("Received file:", filePath);

      const buffer = fs.readFileSync(filePath);
      const parsed = await extractTextFromPdfBuffer(buffer);

      let analysis = {};
      try {
        analysis = await analyzeText(parsed.text || "");
      } catch (e) {
        console.warn("analyzeText failed:", e && e.message);
        analysis = { summary: "analysis unavailable", keywordsFound: [], warnings: [String(e && e.message || "analysis failed")] };
      }

      return res.json({
        filename: req.file.filename,
        pages: parsed.numpages,
        text: parsed.text || "",
        analysis,
      });
    } catch (err) {
      console.error("/pdf error:", err && (err.stack || err.message || err));
      return res.status(500).json({ error: "Server error", details: err && err.message });
    }
  });

  // POST /api/check/rules -> rules array + pdfText
  // This route delegates rule evaluation to callLLM(prompt).
  // callLLM may call Hugging Face (if configured) or return a deterministic fallback string.
  router.post("/rules", async (req, res) => {
    try {
      const { rules = [], pdfText = "" } = req.body;
      if (!Array.isArray(rules) || rules.length === 0) {
        return res.status(400).json({ error: "No rules provided" });
      }

      const results = [];

      for (const rule of rules) {
        const truncatedDoc = (pdfText || "").slice(0, 3500);
        const prompt = `
  You are a precise evaluator. Check the RULE below against the DOCUMENT TEXT and return ONLY a single JSON object (no surrounding text):

  {
  "rule": "<the same rule string>",
  "status": "pass" or "fail",
  "evidence": "<one short sentence from the document that proves the decision, or empty string>",
  "reasoning": "<one-line reasoning>",
  "confidence": <integer 0-100>
  }

  RULE:
  ${rule}

  DOCUMENT (first 3500 chars):
  ${truncatedDoc}
  `;

        let llmOut = "";
        try {
          // callLLM is provided by ../llm.js and will handle which provider to use (HF, deterministic fallback, etc.)
          llmOut = await callLLM(prompt);
        } catch (err) {
          console.error("LLM call failed for rule:", rule, err && (err.message || err));
          // push a clear failure result for this rule and continue
          results.push({
            rule,
            status: "fail",
            evidence: "",
            reasoning: "LLM call failed: " + (err && err.message || ""),
            confidence: 0,
          });
          continue;
        }

        // robust parse JSON from LLM output
        let parsed = null;
        try {
          const first = llmOut.indexOf("{");
          const last = llmOut.lastIndexOf("}");
          const jsonText = first >= 0 && last >= 0 ? llmOut.slice(first, last + 1) : llmOut;
          parsed = JSON.parse(jsonText);
        } catch (err) {
          console.warn("Failed to parse LLM JSON for rule:", rule, "raw:", llmOut);
          parsed = {
            rule,
            status: "fail",
            evidence: "",
            reasoning: "Could not parse LLM response",
            confidence: 0,
          };
        }

        results.push({
          rule: parsed.rule || rule,
          status: (parsed.status || "fail").toLowerCase(),
          evidence: parsed.evidence || "",
          reasoning: parsed.reasoning || "",
          confidence: Number(parsed.confidence || 0),
        });
      }

      return res.json({ results });
    } catch (err) {
      console.error("/rules error:", err && (err.stack || err.message || err));
      return res.status(500).json({ error: "Server error", details: err && err.message });
    }
  });

  module.exports = router;

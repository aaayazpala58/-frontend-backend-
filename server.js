console.log('GEMINI_API_KEY present?', !!process.env.GEMINI_API_KEY);
console.log('GEMINI_MODEL:', process.env.GEMINI_MODEL);

// backend/src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Load routes
const checkRoutes = require('./routes/check');

const app = express();
app.use(cors());
app.use(express.json());

/* ===============================
   SERVE PDFJS WORKER + FONTS
   =============================== */

app.use(
  '/pdfjs',
  express.static(
    path.join(
      __dirname,
      '..',
      'node_modules',
      'pdfjs-dist',
      'legacy',
      'build'
    )
  )
);

/* 
  This exposes URLs like:
  /pdfjs/pdf.worker.mjs
  /pdfjs/pdf.worker.min.mjs
  /pdfjs/standard_fonts/<font files>
*/

// OPTIONAL: If you want, you can also expose standard fonts folder directly
app.use(
  '/pdfjs/standard_fonts',
  express.static(
    path.join(
      __dirname,
      '..',
      'node_modules',
      'pdfjs-dist',
      'standard_fonts'
    )
  )
);

/* ===============================
   MOUNT ROUTES
   =============================== */

app.use('/api/check', checkRoutes);

/* ===============================
   ROOT TEST ROUTE
   =============================== */

app.get('/', (req, res) => res.send('Internshala backend is running'));

/* ===============================
   GLOBAL ERROR HANDLER
   =============================== */

app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err);
  res.status(500).json({ error: 'Server error', details: err.message });
});

/* ===============================
   START SERVER
   =============================== */

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`PDFJS served at http://localhost:${PORT}/pdfjs`);
});

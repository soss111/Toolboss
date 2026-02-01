// Minimal Express server to receive PDF and send e-mail with attachment
const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

const upload = multer({ dest: path.join(__dirname, 'uploads/') });

app.post('/api/send-report', upload.single('report'), async (req, res) => {
  try {
    const to = req.body.to;
    const cc = req.body.cc;
    const subject = req.body.subject || 'Venten ToolBoss raport';
    const message = req.body.message || '';

    if (!to) return res.status(400).send('Missing "to" address');
    if (!req.file) return res.status(400).send('Missing file upload');

    // Build transporter from environment
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      console.error('SMTP configuration missing');
      return res.status(500).send('SMTP configuration missing on server');
    }

    const transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: port === 465, // true for 465, false for other ports
      auth: { user, pass }
    });

    const attachments = [
      {
        filename: req.file.originalname || 'ToolBoss-report.pdf',
        path: req.file.path
      }
    ];

    const mailOptions = {
      from: process.env.FROM_EMAIL || user,
      to: to,
      cc: cc || undefined,
      subject: subject,
      text: message || 'See on automaatselt genereeritud raport.',
      attachments
    };

    const info = await transporter.sendMail(mailOptions);

    // Remove uploaded file after sending
    try { fs.unlinkSync(req.file.path); } catch (e) { console.warn('Failed to remove upload', e); }

    res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error('send-report error', err);
    res.status(500).send('Failed to send email: ' + String(err.message || err));
  }
});

// Simple health route
app.get('/api/health', (req, res) => res.json({ ok: true, now: new Date().toISOString() }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('ToolBoss server listening on', port));

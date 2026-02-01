# ToolBoss Server

Minimal Node/Express server to receive a PDF report and send it as an email attachment.

Usage

1. Install dependencies:

```bash
cd server
npm install
```

2. Create `.env` from `.env.example` and fill SMTP credentials:

```bash
cp .env.example .env
# edit .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL
```

3. Start server:

```bash
npm start
```

4. The client (Toolboss.html) will POST to `/api/send-report` with form-data: `report` (file), `to`, `cc` (optional), `subject`, `message`.

Security note

This is a minimal server for development. For production, secure the endpoint (authentication), rate-limit, validate inputs and sanitize user-supplied text to avoid misuse.

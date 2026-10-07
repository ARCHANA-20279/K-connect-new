# K-Connect

A bilingual (English & Malayalam) digital platform for Kudumbashree communities — digitizing attendance, thrift savings, loans, meetings, and communication across NHG, ADS, and CDS levels.

This project includes authentication (register/login, JWT, and role-based access), NHG management, meeting QR attendance, and the existing Kudumbashree member services.

## Project structure

```
k-connect/
├── backend/     Express + MongoDB API
└── frontend/    React (Vite) app
```

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and fill in:
- `MONGO_URI` — your MongoDB Atlas connection string
- `JWT_SECRET` — any long random string

Then run:

```bash
npm run dev
```

The API starts on `http://localhost:5000`.

### 2. Frontend

In a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

The app opens on `http://localhost:3000`.

## What's working right now

- Register as Secretary/Admin, Member, or ADS/CDS Officer
- Login with JWT authentication
- Separate Member and NHG Secretary sign-in pages at `/member-login` and `/secretary-login`
- Role-based dashboard (members get a generated QR attendance ID)
- Secretary meeting QR generation and Member QR scanning, with duplicate-attendance checks and a live, name-sorted NHG attendance roster
- Language switcher (English ⇄ Malayalam) using react-i18next
- Protected routes — dashboard requires login

### Secretary and personal attendance logins

The NHG Secretary uses the Secretary email and password to manage the NHG and display a meeting attendance QR code. Members use their Member email and password to scan it. A Secretary who is also a member must create a separate Member account with a different email address to scan the QR code and mark her own attendance. After a scan, the Member sees the present list with each member's name and ID on the right side of the attendance page, and can check whether attendance was already recorded.

## Suggested build order for next modules

1. **Member Registration** (Secretary-only view to add/manage members) — extends the existing User model
2. **QR Attendance** — use the `qrCode` field already on each member; `react-qr-code` to render it, `html5-qrcode` for the Secretary's scanner view
3. **Thrift & Digital Passbook** — new `Transaction` model (member, amount, type, date, runningBalance)
4. **Loan Management** — new `Loan` model with status field (applied → verification → approved → sanctioned → repayment)
5. **ADS/CDS Notifications** — new `Notification` model, officer-only create endpoint
6. **Audit Management / Reports** — aggregation queries over transactions and loans

## Tech stack

**Frontend:** React (Vite), Bootstrap 5, react-i18next, react-router-dom, axios
**Backend:** Node.js, Express.js, MongoDB Atlas (Mongoose), JWT, bcrypt.js
"# K-connect-new" 

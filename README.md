# PIXEL — FRAME THE DAY
## Full-Stack Photography Event Registration, Payment Verification & E-Ticket Management System

An exceptional, production-grade full-stack platform built for **“PIXEL — FRAME THE DAY,” a flagship photography event organized by LNCT Group of Colleges, Bhopal.**

---

## 📸 Event Summary (From Official Poster)

- **Event Name:** PIXEL — FRAME THE DAY
- **Tagline:** Not just a photo, but a perspective.
- **Description:** A photography experience to capture stories, explore campus perspectives, and showcase creativity.
- **Organizers:** LNCT Group of Colleges, Bhopal (LNCT University Bhopal, LNCT Group, LN Universe, JNCT Bhopal, LNCT Vidhyapeeth Indore)
- **Venue:** LNCT Group of Colleges, Raisen Road, Bhopal, Madhya Pradesh
- **Event Dates:** 29, 30 & 31 October 2026
- **Participation Format:** Individual Participation
- **Eligibility Rules:**
  - **LNCT Group Students:** 2nd to 4th Year Only (1st Year restricted)
  - **Other Colleges Students:** All academic years welcome
- **Student Coordinators:** Parth Ranjan (`+91 6207595113`), Prathvish Singh (`+91 8109794298`)
- **Faculty Coordinators:** Prof. Neha Singh Rajput, Prof. Yogesh Verma, Prof. Sudhir Geed, Dr. Saurabh Chandra

---

## ⚡ Core Feature Highlights & Architecture

### 1. Payment Verification Engine (Prioritized)
- **Official QR Code Display:** Dynamically loads the admin-configured payment QR code (seeded with the official event UPI QR provided by the user).
- **Payment Proof Submission:** Captures UTR / Transaction reference ID, amount, payment timestamp, payer name, optional notes, and uploaded payment screenshot.
- **Private Image Security:** Payment proofs are strictly private (`/api/payments/:id/proof`) and can only be viewed by the submitting participant or an authorized administrator. They are never exposed publicly.
- **Review Pipeline:** Status tracks `Payment Pending` ➔ `Payment Under Review` ➔ `Payment Verified` ➔ `Ticket Issued`.
- **Rejection & Resubmission Workflow:** If an admin rejects a proof with a stated reason (e.g. blurry screenshot, missing UTR), the participant is alerted and can resubmit with corrected information.

### 2. Digital E-Ticket Generation (Prioritized)
- **Atomic Pass Generation:** Upon administrator payment approval, a unique cryptographic E-Ticket (`TKT-PXL-XXXXXX`) is generated exactly once.
- **Concert-Pass Festival Design:** Matte black ticket badge with neon yellow and cyan accents, film-strip perforated borders, participant metadata, and high-density QR code.
- **Download & Print:** Direct 1-click **PDF Download** (using jsPDF and html2canvas) and clean print stylesheet.
- **Gate Scanner & Anti-Duplicate Check-in:** Authorized event staff or volunteers can scan the ticket QR code using their device webcam/mobile camera or manual ticket ID entry. Single-use entry policy blocks duplicate check-in with red alerts and timestamps.

### 3. Visual & Responsive UI/UX
- Deep charcoal (`#09090c`) with electric yellow (`#FFE600`), neon cyan (`#00F5FF`), and vivid magenta (`#FF007F`) accents.
- Live event countdown timer.
- Interactive cards for all 3 rounds:
  - **Round 1:** One Frame, One Story (10:30 AM reporting, 60s presentation)
  - **Round 2:** The Shutter Hunt (Secret one-line prompt, campus exploration)
  - **Round 3:** Final Frame Exhibition (Stall display, jury storytelling)
- Multi-step registration form enforcing LNCT year restrictions.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js v20+ (The project includes Node.js v20 in `../tools/node-v20.18.0-win-x64`)
- SQLite3 (zero-configuration local database)

### 2. Start the Full Application
In the project directory:

```bash
# Option A: Start unified server (serves API and compiled frontend on port 5000)
npm run server

# Option B: Run frontend in Vite dev mode (port 3000) with hot reload
npm --prefix client run dev
```

Visit:
- **Unified App:** `http://localhost:5000`
- **Vite Dev App:** `http://localhost:3000`

---

## 🔑 Default Accounts & Credentials

| Role | Email | Password | Access |
|---|---|---|---|
| **Administrator** | `admin@pixel.lnct.ac.in` | `Admin@Pixel2026` | Admin Command, Payment Review Queue, Event Settings, CSV Export |
| **Event Staff** | `staff@pixel.lnct.ac.in` | `Staff@Pixel2026` | Gate Scanner, Live Check-In Validation |
| **Participant** | *Register in UI* | *Chosen during registration* | Dashboard, Payment Submission, E-Ticket Access |

---

## 🧪 Automated End-to-End Test Suite

Run the complete 18-step acceptance verification suite:

```bash
npm test
```

This verifies:
1. Health check and settings loading
2. Official QR code and fee loading
3. LNCT 1st year restriction enforcement
4. Valid participant registration and unique ID generation
5. Duplicate registration prevention
6. Payment proof upload with screenshot validation
7. Private screenshot access control (401 / 403)
8. Admin payment review queue
9. Payment rejection with custom reason
10. Participant resubmission after rejection
11. Atomic payment approval and unique ticket generation
12. Participant E-ticket retrieval with base64 QR payload
13. Public / Staff ticket validity verification
14. Staff check-in recording with timestamp
15. Prevention of duplicate ticket check-in

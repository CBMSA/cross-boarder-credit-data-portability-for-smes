# 🌍 SADC SME Credit Data Portability Platform

## 🎯 Challenge 2 — SWIFT Hackathon 2025
> **Credit data portability:** Improve the ability of small and medium-sized enterprises to finance through secure, consumer-consented data exchange solutions that facilitate seamless cross-border sharing of credit information.

---

## 🚀 Project Overview

The SADC SME Credit Data Portability Platform enables SMEs to securely share financial and credit-related information with authorized lenders, fintechs, and regulators across borders.

- ✅ Consumer-consented data sharing
- ✅ On-chain verification with Sui Move smart contracts
- ✅ Secure Node.js API gateway
- ✅ HTML + React-based user portal
- ✅ Transaction ID and exportable audit trail

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML / React / Bootstrap |
| Backend | Node.js (Express.js) |
| Blockchain | Move Language on Sui Testnet |
| Deployment | Localhost / Sui CLI |

---

## 📂 Project Structure
```
credit-portability/
├── backend/           # Express API + Sui integration
├── frontend/          # HTML / React App
├── move_contracts/    # Sui Move Smart Contracts
├── README.md          # Documentation
```

---

## 🔧 Setup Instructions

### 1. Clone the repo
```bash
git clone https://github.com/sadc-cbdc/credit-portability.git
cd credit-portability
```

### 2. Start Backend (Node.js)
```bash
cd backend
npm install
node index.js
```

### 3. Run Frontend (HTML/React)
Open `frontend/index.html` in browser or use `npm start` if React.

### 4. Deploy Smart Contract (Sui CLI)
```bash
sui move build
sui client publish --gas-budget 100000000
```

> ✅ Save the `package_id` and `module_id` for integration in backend calls

---

## 📤 Submission Checklist

- [x] GitHub Repo with full source
- [x] Working testnet deployment (Sui)
- [x] Transaction tracking and audit
- [x] SME data privacy and consent layer
- [x] 2-minute pitch/demo video (optional)

---

## 👨🏽‍💻 Authors & Team
- **CBM SARB Innovation Team**
- Region: SADC / South Africa
- Lead: B. F. Muneri (Statistician & Debt Specialist)

---

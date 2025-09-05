Map custom domains to this Static Web App. Free SSL/TLS certificates are automatically provided for custom domains. Learn more
Filter by name...
Name
Status
Type
Action
Expiry Date (UTC)
ashy-glacier-07f0b951e.1.azurestaticapps.net
Validated
Auto-generated
www.sacreserve.africa
Validated
Custom domain
2026-03-05 01:59:59                                                                                                                Domain
sacreserve.africa

Connect Domain
Overview
DNS
Registration Settings
Products
Activity Log

DNS Records

Forwarding

Nameservers

Hostnames

DNSSEC
Add a new record
DNS records
 define how your domain behaves, like showing your website content and delivering your email.


Add New Record
Easily verify domain ownership
Need to verify ownership of your domain to connect to an external service? We've made it easier than ever.


Verify Domain Ownership
Create MX records
Quickly create MX records to connect your domain with email services.


Create Now

Filters

Actions
Type
Name
Data
TTL
Delete
Edit

a	@	WebsiteBuilder Site	1 Hour		

ns	@	ns47.domaincontrol.com.	1 Hour	
Can't delete
Can't edit

ns	@	ns48.domaincontrol.com.	1 Hour	
Can't delete
Can't edit

cname	www	sacreserve.africa.	1 Hour		

cname	_domainconnect	_domainconnect.gd.domaincontrol.com.	1 Hour		

soa	@	Primary nameserver: ns47.domaincontrol.com.	1 Hour		

txt	@	ashy-glacier-07f0b951e.1.azurestaticapps.net	1 Hour		

txt	@	_fx8l8stklkyb7iexnmtc8kc4xebvmej	1/2 Hour		

txt	_dmarc	v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;	1 Hour		
Set up your free social media subdomain!
Your domain comes with free, customizable subdomains  such as facebook.sacreserve.africa to link to your social media page.
Improved SEO
where did i do wrong                                  








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

# 🔮 Baseline Oracle  
**Guardrails, Forecasts, and a Time Machine for Web Features**

Baseline Oracle helps developers stop guessing browser compatibility.  
It enforces **Baseline checks in PRs**, provides **risk scoring & reports**, suggests **codemods/fallbacks**, optimizes **polyfills**, and lets you **time-travel** your app against past/future Baseline snapshots.

---

## 🚀 Features
- **CI/PR Guardrails** – GitHub Action or CLI that blocks risky features before merge, with inline annotations.  
- **Risk Score & Reports** – Generates JSON + HTML reports with a “compatibility risk score.”  
- **Codemods & Fallbacks** – Suggests safe fallbacks or codemods for unsupported features.  
- **Polyfill Optimizer** – Ships only the polyfills actually needed, reducing bundle size.  
- **Time Machine Snapshots** – Simulate how your app behaves under Baseline 2024, 2025, or forecasted data.  
- **Optional Dashboard** – Visualize feature adoption, risks, and Baseline trends over time.  

---

## 🧩 Why Baseline Oracle?
- Developers waste time cross-checking MDN/caniuse.  
- Risky features slip into code reviews unnoticed.  
- Teams often ship unnecessary polyfills, bloating bundles.  
- Migration planning is guesswork.  

Baseline Oracle automates these decisions and provides **actionable guardrails + insights**.

---

## 🏗️ Project Structure

baseline-oracle/
├── packages/
│   ├── engine/        # Parsers, detectors, risk scoring
│   ├── data/          # Baseline API + web-features access
│   ├── suggest/       # Codemods & fallback recipes
│   ├── cli/           # Baseline CLI (scan/report/policy)
│   ├── gh-action/     # GitHub Action wrapper
│   ├── report/        # HTML report generator
│   ├── optimizer/     # Polyfill Optimizer plugins
│   └── time-machine/  # Snapshot simulator & middleware
├── apps/
│   ├── dashboard/     # Risk trend & explorer UI
│   └── examples/      # Demo apps
└── LICENSE

---

## ⚙️ Tech Stack
- **Data:** [web-features npm package](https://www.npmjs.com/package/web-features), [Web Platform Dashboard API](https://webstatus.dev/)  
- **Language:** TypeScript + Node.js  
- **CI/DevOps:** GitHub Actions, CLI  
- **Frontend (dashboard):** React + Vite (optional)  

---

## 📦 Getting Started
```bash
# Clone the repo
git clone https://github.com/your-username/baseline-oracle
cd baseline-oracle

# Install dependencies
npm install

# Run CLI scan on a project
npx baseline-oracle scan ./your-project

# Generate HTML report
npx baseline-oracle report ./your-project


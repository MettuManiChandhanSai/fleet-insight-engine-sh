# Fleet Insight Engine - Quick Start Guide

## 🚀 Getting Started (5 minutes)

### Prerequisites
- Node.js 18+
- OpenAI API key
- Supabase project

### 1. Install Dependencies
```bash
cd fleet-insight-engine
pnpm install
```

### 2. Set Environment Variables
Create `.env`:
```bash
# OpenAI API
OPENAI_API_KEY=sk-...your-key...

# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-key...
```

### 3. Start Dev Server
```bash
pnpm dev
```
Open http://localhost:5173

### 4. Login
- Use Supabase credentials
- Choose your role: Tester, Analyzer, or Integrator

---

## 👥 Quick Role Guide

### Tester Role
**What you do**: Record vehicle diagnostics
1. Go to **Record Vehicle**
2. Select vehicle → Start Recording
3. Stop when done
4. **Click "Export as CSV"** ← NEW!
5. Click "Confirm & choose analyzer"

### Analyzer Role
**What you do**: Analyze recordings, identify issues
1. Go to **Incoming Queue**
2. Select a session
3. Review telemetry charts
4. Click **"Run AI analysis"** ← Now with retry logic!
5. Review results and draft report

### Integrator Role
**What you do**: Review reports, verify fixes
1. Go to **Incoming Reports**
2. Click to review
3. Verify recommended fixes
4. Mark as complete or dispute

---

## 🔧 What's New (Fixed)

### ✅ API Rate Limiting Fixed
- Automatic retries when API is rate limited
- Exponential backoff (smart waiting)
- User-friendly error messages

### ✅ CSV Export Added
- Export session data from Record page
- Download as Excel-compatible CSV
- Contains: RPM, temperature, load, speed

### ✅ Better Error Messages
- Clear indicators when something fails
- Suggestions on how to fix
- Automatic retries for transient errors

---

## 📊 Project Architecture

```
fleet-insight-engine/
├── src/
│   ├── routes/          ← Page components
│   │   ├── app.record.tsx      (Tester)
│   │   ├── app.workspace.tsx   (Analyzer)
│   │   ├── app.reports.tsx     (Integrator)
│   │   └── ...
│   ├── lib/
│   │   ├── ai.functions.ts     ← AI calls (with retry logic)
│   │   ├── csv-export.ts       ← CSV utilities (NEW)
│   │   ├── auth.tsx            ← Authentication
│   │   └── ...
│   ├── components/      ← Reusable UI
│   └── integrations/    ← Supabase
├── public/              ← Static assets
└── package.json
```

**Stack**: React 19 + Vite + TanStack Router + Supabase + OpenAI

---

## 🧪 Testing Checklist

Test these to verify everything works:

- [ ] Can login with test account
- [ ] Dashboard shows stats
- [ ] Can record a vehicle
- [ ] CSV export button appears
- [ ] CSV file downloads successfully
- [ ] Can run AI analysis
- [ ] Analysis shows results without errors
- [ ] Can draft report from analysis
- [ ] Can review and approve reports
- [ ] Logout works

---

## 🐛 Troubleshooting

### "OPENAI_API_KEY missing"
→ Add `OPENAI_API_KEY=sk-...` to `.env` and restart server

### "Supabase connection failed"
→ Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`

### "API rate limited"
→ This is normal! App auto-retries. Check console logs with `[v0]` prefix

### "CSV export button not showing"
→ You must complete a full recording. Button appears after "Stop Recording"

### AI analysis stuck
→ Check browser console (F12) for error messages starting with `[v0]`

**Need more help?** See `TROUBLESHOOTING.md`

---

## 📈 Performance Tips

- Keep recordings under 20 minutes
- Split large datasets across multiple sessions
- CSV export works well for 100-10000 samples
- AI analysis typical time: 5-15 seconds

---

## 🚢 Deployment

### Build for Production
```bash
pnpm build
```

### Preview Build
```bash
pnpm preview
```

### Deploy to Vercel
```bash
vercel deploy
```

---

## 📚 Documentation

- **TROUBLESHOOTING.md** - Detailed issue resolution
- **CHANGES_SUMMARY.md** - All changes made
- **This file** - Quick start guide

---

## 🎯 Key Features

✅ Real-time vehicle telemetry recording  
✅ AI-powered diagnostic analysis  
✅ CSV data export (tester phase)  
✅ Automatic API retry logic  
✅ Role-based access control  
✅ Multi-step diagnostic pipeline  
✅ Field verification workflow  
✅ Dispute resolution process  

---

**Ready to go!** 🚀

Next steps:
1. Set your `.env` variables
2. Run `pnpm dev`
3. Login and explore
4. Try recording → export CSV → analyze

---

**Last Updated**: Jan 7, 2025  
**Version**: 1.0.0 (with fixes)

# Fleet Insight Engine - Setup & Run Guide

## Option 1: Run Locally (Recommended for Development)

### 1. Extract & Install
```bash
tar -xzf v0-project.tar.gz
cd v0-project
pnpm install
```

### 2. Setup Environment Variables
Create `.env.local` file in root:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
OPENAI_API_KEY=your_openai_key
SUPABASE_URL=your_supabase_url
SUPABASE_PUBLISHABLE_KEY=your_supabase_key
```

### 3. Run Development Server
```bash
pnpm dev
```
Visit: http://localhost:5173

### 4. Login/Create Account
- Sign up or login with your credentials
- The app will create a new session
- Start recording vehicle telemetry

---

## Option 2: Live Deployed Version

### Access at:
**https://fleet-insight-engine-nu.vercel.app**

### Setup:
1. **Sign Up**: Create a new account (uses Supabase Auth)
2. **Verify Email**: Check your email for verification link
3. **Login**: Return to site and login
4. **Start Using**: Dashboard will load automatically

---

## What You Can Do

### Dashboard
- View all your recorded sessions
- See session statistics
- Filter by vehicle ID or date

### Record Page
- Start recording vehicle telemetry
- Real-time RPM, temperature, load tracking
- Simulate fault injection
- **NEW: Export as CSV** when done

### Workspace Page
- Select a recorded session
- Run AI analysis with OpenAI
- Get fault diagnosis and recommendations
- View detailed vehicle trends

### Reports Page
- View all analysis results
- Export findings
- Historical data

### Queue Page
- Monitor pending analysis jobs
- Track processing status

---

## Key Features Added

### 1. API Rate Limiting
- Automatic retry on 429 (rate limit)
- Exponential backoff: 1s → 2s → 4s
- Max 3 retry attempts
- User-friendly error messages

### 2. CSV Export
- Download telemetry data as CSV
- Compatible with Excel/Google Sheets
- Includes: RPM, Temperature, Load, Speed
- Timestamped filenames

### 3. Better Error Messages
- Emoji indicators: ❌ 🔄 ⏱️ ⚠️
- Clear guidance on what went wrong
- Console logging for debugging

---

## Troubleshooting

### Site Shows Auth Page
**Solution**: You need to login/signup first
- Use the sign-up form
- Create an account with email + password
- Verify your email
- Login

### Can't Record Data
**Solution**: Make sure you have:
- Valid Supabase credentials
- Active Vercel deployment
- Environment variables set

### AI Analysis Not Working
**Check**:
1. OPENAI_API_KEY is set
2. Session has samples
3. Check console for [v0] logs
4. Try again (automatic retry happens)

### CSV Download Not Working
**Try**:
1. Record a session first
2. Click "Export as CSV" button
3. Check browser downloads folder
4. Try a different browser

---

## Development Tips

### Run Type Checking
```bash
pnpm tsc --noEmit
```

### Build for Production
```bash
pnpm build
pnpm preview
```

### Check Console Logs
Open browser DevTools → Console tab
Look for `[v0]` prefixed messages for debugging

### Environment Variables
- Client-side: Use `VITE_` prefix
- Server-side: No prefix needed
- `.env.local` is git-ignored

---

## File Structure

```
v0-project/
├── src/
│   ├── components/        # React components
│   ├── routes/            # TanStack Router pages
│   ├── lib/               # Utilities & helpers
│   │   ├── ai.functions.ts          # AI integration (FIXED)
│   │   ├── csv-export.ts            # CSV export (NEW)
│   │   ├── auth.ts                  # Auth helpers
│   │   └── mock-trace.ts            # Sample data
│   ├── integrations/      # API integrations
│   │   └── supabase/      # Database connection
│   └── main.tsx           # Entry point
├── public/                # Static files
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript config
└── .env.example           # Environment template
```

---

## API Keys Required

### OpenAI
1. Go to: https://platform.openai.com/api-keys
2. Create new secret key
3. Add to `.env` as `OPENAI_API_KEY`

### Supabase
1. Go to: https://supabase.com
2. Create project or use existing
3. Get API URL and Anon Key from Settings
4. Add to `.env`:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`

---

## Commands Reference

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Type checking
pnpm tsc --noEmit

# List all available scripts
pnpm run
```

---

## Support & Documentation

Read these in order:
1. This file (you are here)
2. `QUICK_START.md` - 5-minute overview
3. `TROUBLESHOOTING.md` - Problem solving
4. `WORKFLOW.md` - Complete system guide
5. `DOCUMENTATION_INDEX.md` - All docs index

---

## Next Steps

1. **Download**: Get `v0-project.tar.gz` or use GitHub
2. **Setup**: Follow Option 1 or 2 above
3. **Configure**: Set environment variables
4. **Test**: Try all features locally
5. **Deploy**: Use Vercel or your hosting

---

## Questions?

Check the documentation files included in the project for comprehensive guides on every feature.

Deployed at: https://fleet-insight-engine-nu.vercel.app
Local dev: http://localhost:5173

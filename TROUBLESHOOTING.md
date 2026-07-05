# Fleet Insight Engine - Troubleshooting & Setup Guide

## Quick Start Overview

The **Fleet Insight Engine** is a diagnostic pipeline for commercial vehicles with three main user roles:

1. **Tester** - Records vehicle diagnostics
2. **Analyzer** - Analyzes recordings and generates insights
3. **Integrator** - Reviews reports and performs field checks

---

## Common Issues & Solutions

### 1. OpenAI API Key Rate Limiting

**Problem**: "OpenAI API key completed fatly after a second"

**Solution**: The app now includes automatic retry logic with exponential backoff.

**What changed**:
- Max 3 automatic retry attempts on rate limits (429 errors)
- Exponential backoff: waits 1s, 2s, 4s between retries
- Max wait time capped at 30 seconds
- Respects `Retry-After` header from OpenAI

**How to verify**:
1. Open browser DevTools (F12) → Console
2. Look for `[v0] Rate limited` messages
3. The app will automatically retry

**If still failing**:
- Check your OpenAI API key is valid
- Verify you have sufficient credits/quota in OpenAI dashboard
- Consider upgrading to a paid plan if using free tier

---

### 2. CSV Export Not Working (Tester Phase)

**Problem**: Can't export session data as CSV

**Solution**: CSV export is now available on the **Record Vehicle** page.

**How to use**:
1. Complete a recording in **Record Vehicle** page
2. Click **"Export as CSV"** button
3. File will download as `session_[VEHICLE_ID]_[TIMESTAMP].csv`
4. Contains all telemetry: RPM, temperature, load, speed

**File format**:
```
"Vehicle ID","DTC Code","Sample Count","Recording Duration(min)",...
"VH001","P0101","3500","583.33"
"Timestamp(s)","RPM","Coolant Temp(°C)","Engine Load(%)","Speed(km/h)"
"0.00","800","85.5","15.2","0"
"10.00","850","86.1","16.0","5"
...
```

---

## Page-by-Page Guide

### Dashboard
- **What it shows**: Daily pipeline stats (total sessions, sent to analyzers, pending)
- **What to do**: See quick overview, click quick action link based on your role

### Record Vehicle (Tester Only)
1. Select vehicle from dropdown
2. Click **Start Recording**
3. Watch real-time charts update
4. When done, click **Stop Recording**
5. Review stats (duration, completeness %, fault fired)
6. **Export as CSV** - download data
7. **Confirm & choose analyzer** - send to analysis team

### My Recordings (Tester Only)
- View all your past recordings
- See status: complete, sent, in-progress
- Links to related analyses

### Incoming Queue (Analyzer Only)
- Shows sessions from testers waiting for analysis
- DTC code and coverage score shown
- Click to open **Analysis Workspace**

### Analysis Workspace (Analyzer Only)
- View telemetry charts from the recording
- AI-powered analysis of deviations
- Identifies likely causes and confidence scores
- Draft report with recommendations

### Incoming Reports (Integrator Only)
- Reports from analyzers awaiting field check
- Status: pending, verified, disputed
- Click to review detailed recommendations

### Report Review (Integrator Only)
- Full report with issue description
- Evidence from telemetry analysis
- Recommended fix steps
- Option to mark as verified or dispute

### Field Check (Integrator Only)
- Physical verification of vehicle
- Confirm/reject recommended fixes
- Close case or send back to analyzer

---

## API & Error Messages

### Authentication Errors
```
"OpenAI Auth Error: Please check your API key"
```
- **Cause**: Invalid or expired API key
- **Fix**: Verify `OPENAI_API_KEY` in environment variables

### Rate Limit (Automatic)
```
[v0] Rate limited. Waiting 2000ms before retry (attempt 1/3)
```
- **Cause**: Too many API requests
- **Fix**: App retries automatically (no action needed)

### Timeout Error
```
"Max retries exceeded for OpenAI API call"
```
- **Cause**: API unreachable after 3 attempts
- **Fix**: Check internet connection, wait a few minutes, retry

### Database Connection
If you see "Supabase connection failed":
1. Check `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
2. Verify Supabase project is running
3. Check network connectivity

---

## Environment Variables Checklist

Required for the app to work:

```bash
# OpenAI API (for analysis)
OPENAI_API_KEY=sk-...

# Supabase (for database)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Auth (from Supabase)
VITE_SUPABASE_JWT_SECRET=your-jwt-secret
```

---

## Testing Checklist

- [ ] Dashboard loads without errors
- [ ] Can record vehicle diagnostics
- [ ] CSV export downloads successfully
- [ ] Can complete recording without API timeouts
- [ ] Analysis page generates insights without 429 errors
- [ ] Reports display correctly
- [ ] All role-based pages accessible based on user role
- [ ] Logout works and redirects to auth

---

## Performance Tips

### For Large CSV Exports
- Sessions over 5000 samples will take longer
- Recommended: Split into multiple recordings
- CSV files can be imported to Excel/Sheets

### API Call Optimization
- Analysis runs on server (no client timeout)
- Retries are automatic and transparent
- Max wait per call: ~30 seconds total

---

## Contact & Support

For issues not covered here:
1. Check browser console (F12 → Console)
2. Look for `[v0]` prefixed log messages
3. Share error messages and environment setup details

---

**Last Updated**: 2025-01-07  
**Version**: 1.0.0  
**Stack**: React + Vite + TanStack Router + Supabase + OpenAI

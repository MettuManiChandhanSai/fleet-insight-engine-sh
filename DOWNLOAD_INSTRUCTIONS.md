# Download Fleet Insight Engine

## Option 1: Download Complete Project from v0

### Method A: Download ZIP Button
1. **In v0 Interface**: Look for Download button (top right)
2. **Select**: "Download ZIP" 
3. **Save**: Save to your computer
4. **Extract**: Unzip the file
5. **Ready**: All files are ready to use

### Method B: Download via Command
If you have shell access:
```bash
# Download the archive
wget https://vercel.com/api/v0/file/v0-project.tar.gz
# Or find it in project files
```

---

## Option 2: Use GitHub Repository

```bash
# Clone from GitHub
git clone https://github.com/MettuManiChandhanSai/fleet-insight-engine.git

# Install and run
cd fleet-insight-engine
pnpm install
pnpm dev
```

---

## Option 3: Use Live Deployed Version (No Download)

### Instant Access:
**https://fleet-insight-engine-nu.vercel.app**

**No installation needed!**
1. Visit the URL above
2. Sign up for account
3. Verify email
4. Login and start using

---

## After You Download

### Step 1: Extract
```bash
# If you have a ZIP file
unzip fleet-insight-engine.zip

# Or if TAR file
tar -xzf v0-project.tar.gz
```

### Step 2: Navigate
```bash
cd v0-project
```

### Step 3: Install Dependencies
```bash
pnpm install
```

### Step 4: Setup Environment
Create `.env.local`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_key
OPENAI_API_KEY=your_api_key
```

### Step 5: Run Locally
```bash
pnpm dev
```

Visit: **http://localhost:5173**

---

## What's Included

- Complete source code (all React components)
- All route pages and utilities
- Configuration files
- 6 comprehensive documentation files
- All fixes and improvements
- Ready to deploy

---

## Documentation Files Inside

1. **SETUP_AND_RUN.md** - How to setup and run
2. **QUICK_START.md** - 5-minute overview
3. **TROUBLESHOOTING.md** - Fix common issues
4. **WORKFLOW.md** - Understand the system
5. **CHANGES_SUMMARY.md** - Technical changes
6. **README_FIXES.md** - Complete overview

---

## For Deployment

After download, you can:

**Deploy to Vercel:**
```bash
vercel deploy --prod
```

**Deploy to Netlify:**
```bash
pnpm build
# Upload dist/ folder
```

**Deploy Anywhere:**
```bash
pnpm build
# Upload dist/ to your host
```

---

## Quick Links

- **Live App**: https://fleet-insight-engine-nu.vercel.app
- **GitHub**: https://github.com/MettuManiChandhanSai/fleet-insight-engine
- **OpenAI API**: https://platform.openai.com/api-keys
- **Supabase**: https://supabase.com

---

## Still Can't Download?

1. **Use the live version** - No download needed
2. **Clone from GitHub** - Full git history
3. **Ask in v0 chat** - Request specific files
4. **Check file browser** - Files visible in v0 editor

---

**Choose one method above and get started!**

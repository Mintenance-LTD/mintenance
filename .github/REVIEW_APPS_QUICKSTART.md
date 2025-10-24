# Review Apps Quick Start

## What are Review Apps?

Review Apps automatically create preview deployments for every pull request, allowing you to test changes in a production-like environment before merging.

## Quick Setup (5 minutes)

### Step 1: Setup Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"New Project"**
3. Import `Mintenance-LTD/mintenance` repository
4. Configure:
   - **Framework**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build`
5. Click **Deploy**

### Step 2: Get Vercel Credentials

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project
cd apps/web
vercel link

# Get credentials (copy these values)
cat .vercel/project.json
```

### Step 3: Add GitHub Secrets

Go to: **GitHub Repository → Settings → Secrets and variables → Actions → New secret**

Add these three secrets:

| Secret Name | Value | Where to Find |
|-------------|-------|---------------|
| `VERCEL_TOKEN` | `xxxxx...` | [Vercel Account Tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | `team_xxxxx` | `.vercel/project.json` → `orgId` |
| `VERCEL_PROJECT_ID` | `prj_xxxxx` | `.vercel/project.json` → `projectId` |

You also need these existing secrets (should already be configured):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `JWT_SECRET`

### Step 4: Test It Out

1. Create a new branch:
   ```bash
   git checkout -b test/review-app
   ```

2. Make a small change to `apps/web/app/page.tsx`

3. Push and create a PR:
   ```bash
   git add .
   git commit -m "Test review app deployment"
   git push origin test/review-app
   ```

4. Go to GitHub and create a Pull Request

5. Wait ~2-3 minutes for the workflow to complete

6. Check the PR for a comment with your preview URL!

## How to Use

### For Every PR You Create:

1. **Automatic Deployment**: Preview is created automatically
2. **Check PR Comment**: Look for the preview URL
3. **Test Your Changes**: Click the URL and test
4. **Push Updates**: Preview auto-updates on new commits
5. **Merge**: Preview is cleaned up automatically

### The PR Comment Will Look Like:

```
🚀 Preview Deployment Ready!

Preview URL: https://preview-pr-123.vercel.app

Test Checklist:
☐ UI/UX looks correct
☐ All features work
☐ No console errors
☐ Mobile responsive
```

## Troubleshooting

### "Preview deployment failed"

**Most common causes:**

1. **Missing secrets** - Check all secrets are configured in GitHub
2. **Type errors** - Run `npm run type-check:web` locally
3. **Build errors** - Run `npm run build:web` locally

**Check the workflow logs:**
- Go to: GitHub → Actions → "Review Apps" workflow
- Click on the failed run to see detailed logs

### "No preview URL comment"

- Wait 2-3 minutes - deployment might still be in progress
- Check GitHub Actions tab to see if workflow is running
- Verify workflow has `pull-requests: write` permission

### "Preview shows 404"

- Check that root directory is set to `apps/web` in Vercel
- Verify all environment variables are configured
- Check Vercel deployment logs

## Need More Help?

- **Full Documentation**: See [REVIEW_APPS_GUIDE.md](../REVIEW_APPS_GUIDE.md)
- **Vercel Docs**: https://vercel.com/docs
- **GitHub Actions**: Check the workflow file at `.github/workflows/review-apps.yml`

## Pro Tips

1. **Test on mobile**: Preview URLs work on any device
2. **Share with team**: Send preview URL to stakeholders for feedback
3. **Check console**: Open browser DevTools to check for errors
4. **Use checklist**: Mark off items in the PR comment as you test

---

**Setup Time**: ~5 minutes
**Deployment Time**: ~2-3 minutes per PR
**Cost**: Free on Vercel free tier (100 deployments/day)

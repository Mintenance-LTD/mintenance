# Review Apps - Automatic PR Preview Deployments

## Overview

Review Apps automatically deploy preview environments for every pull request, making it easy to test changes before merging to production.

## Features

- **Automatic Deployments**: Every PR gets its own preview environment
- **PR Comments**: Preview URLs are automatically posted as PR comments
- **Status Checks**: Type checking, linting, and tests run before deployment
- **GitHub Integration**: Deployment status visible in GitHub UI
- **Auto-cleanup**: Preview environments are cleaned up when PRs are closed
- **Real-time Updates**: Preview redeploys on every push to the PR

## Setup Instructions

### 1. Configure Vercel

#### A. Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure build settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

#### B. Get Vercel Credentials

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link your project
cd apps/web
vercel link

# Get your credentials from .vercel/project.json
cat .vercel/project.json
```

You'll need:
- `VERCEL_TOKEN`: Get from [Vercel Account Tokens](https://vercel.com/account/tokens)
- `VERCEL_ORG_ID`: Found in `.vercel/project.json` as `orgId`
- `VERCEL_PROJECT_ID`: Found in `.vercel/project.json` as `projectId`

### 2. Configure GitHub Secrets

Add these secrets in **GitHub Repository Settings → Secrets and variables → Actions**:

#### Required Secrets

```bash
# Vercel Configuration
VERCEL_TOKEN=<your-vercel-token>
VERCEL_ORG_ID=<your-org-id>
VERCEL_PROJECT_ID=<your-project-id>

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
JWT_SECRET=<your-jwt-secret>

# Stripe (Optional - for testing payments in preview)
STRIPE_SECRET_KEY=<your-stripe-test-key>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your-stripe-test-publishable-key>
```

#### Optional Secrets

```bash
# For enhanced security and monitoring
SENTRY_DSN=<your-sentry-dsn>
SENTRY_AUTH_TOKEN=<your-sentry-token>
```

### 3. Enable GitHub Integration in Vercel

1. Go to Vercel Project Settings → Git
2. Enable **Automatic Deployments from Git**
3. Configure:
   - Production Branch: `main`
   - Preview Branches: All branches
   - Enable **Comments on Pull Requests**
   - Enable **Deployment Protection**

## How It Works

### Workflow Trigger

The review app workflow triggers on:
- Pull request opened
- Pull request synchronized (new commits)
- Pull request reopened
- Pull request review submitted

### Deployment Process

```
1. PR Created/Updated
   ↓
2. Run Type Checks
   ↓
3. Run Linting (non-blocking)
   ↓
4. Run Tests (non-blocking)
   ↓
5. Build Next.js App
   ↓
6. Deploy to Vercel
   ↓
7. Post Preview URL to PR
   ↓
8. Create GitHub Deployment
```

### PR Comment Example

When a preview is deployed, you'll see a comment like:

```markdown
## 🚀 Preview Deployment Ready!

Your preview environment has been deployed successfully!

### Preview URL
🔗 **[View Preview](https://preview-pr-123.vercel.app)**

### Deployment Details
- **PR**: #123
- **Commit**: `abc1234`
- **Branch**: `feature/new-feature`
- **Environment**: Preview
- **Deployed at**: Mon, 24 Oct 2025 12:00:00 GMT

### Test Checklist
- [ ] UI/UX looks correct
- [ ] All features work as expected
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Performance is acceptable
```

## Using Review Apps

### For Developers

1. **Create a Pull Request**
   ```bash
   git checkout -b feature/my-feature
   git push origin feature/my-feature
   # Create PR on GitHub
   ```

2. **Wait for Deployment**
   - Check the "Checks" tab on your PR
   - Look for "Review Apps - Deploy PR Preview"
   - Preview URL will be commented automatically

3. **Test Your Changes**
   - Click the preview URL
   - Test all affected features
   - Check on mobile devices
   - Verify no regressions

4. **Iterate**
   - Push new commits
   - Preview auto-updates
   - Test again

### For Reviewers

1. **Review Code**
   - Review the code changes
   - Check for best practices

2. **Test Preview**
   - Click preview URL in PR comment
   - Test functionality
   - Check UI/UX
   - Verify edge cases

3. **Provide Feedback**
   - Use the test checklist in PR comment
   - Add specific feedback as PR comments
   - Request changes if needed

## Environment Variables in Previews

Preview deployments use the same environment variables as production, but you can override them:

### In `vercel.json`

```json
{
  "env": {
    "NEXT_PUBLIC_APP_URL": "@app_url",
    "SUPABASE_URL": "@supabase_url"
  }
}
```

### In GitHub Workflow

```yaml
env:
  NEXT_PUBLIC_APP_URL: https://preview-pr-${{ github.event.pull_request.number }}.vercel.app
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
```

## Troubleshooting

### Preview Deployment Failed

**Check the workflow logs:**
```bash
# Go to: GitHub → Actions → Review Apps workflow → Failed run
```

**Common issues:**

1. **Type Errors**
   ```bash
   # Fix locally
   npm run type-check:web
   ```

2. **Build Errors**
   ```bash
   # Test build locally
   npm run build:web
   ```

3. **Missing Secrets**
   - Verify all required secrets are set in GitHub
   - Check secret names match workflow file

4. **Vercel Token Expired**
   - Generate new token: [Vercel Tokens](https://vercel.com/account/tokens)
   - Update `VERCEL_TOKEN` secret in GitHub

### Preview URL Not Posted

**Possible causes:**

1. **GitHub Token Permissions**
   - Workflow needs `pull-requests: write` permission
   - Check workflow file has correct permissions

2. **Rate Limiting**
   - GitHub API rate limits may delay comments
   - Wait a few minutes and check again

### Preview Shows 404

**Possible causes:**

1. **Build Configuration**
   - Check `vercel.json` routing configuration
   - Verify root directory is set to `apps/web`

2. **Environment Variables**
   - Check all required env vars are set
   - Verify values are correct

## Advanced Configuration

### Custom Domain for Previews

Add to `vercel.json`:

```json
{
  "alias": ["preview-*.mintenance.app"]
}
```

### Preview Environment Isolation

For better isolation, you can use separate Supabase projects:

```yaml
# In .github/workflows/review-apps.yml
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_PREVIEW_URL }}
  SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_PREVIEW_KEY }}
```

### Preview Analytics

Enable Vercel Analytics for previews:

```typescript
// apps/web/app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics mode={process.env.NODE_ENV} />
      </body>
    </html>
  );
}
```

### Custom Preview Checks

Add custom checks before deployment:

```yaml
# In .github/workflows/review-apps.yml
- name: Custom Checks
  run: |
    npm run check:accessibility
    npm run check:lighthouse
    npm run check:security
```

## Security Considerations

### 1. Environment Isolation

- Use separate API keys for preview environments
- Don't expose production credentials
- Use test mode for payment integrations

### 2. Access Control

Configure deployment protection in Vercel:

```json
{
  "github": {
    "enabled": true,
    "deploymentProtection": {
      "enabled": true,
      "requiredApprovals": 1
    }
  }
}
```

### 3. Secret Management

- Never log secrets in workflow
- Use GitHub encrypted secrets
- Rotate secrets regularly

### 4. Data Privacy

- Don't use production data in previews
- Use anonymized test data
- Implement feature flags for sensitive features

## Best Practices

### 1. Keep Previews Fast

- Optimize build times
- Use build caching
- Minimize dependencies

### 2. Test Thoroughly

Use the checklist in PR comments:
- [ ] UI/UX verification
- [ ] Feature functionality
- [ ] Console error check
- [ ] Mobile responsiveness
- [ ] Performance validation

### 3. Clean Up

- Close PRs when done
- Delete old branches
- Monitor active deployments

### 4. Document Changes

- Add testing instructions to PR description
- Document breaking changes
- Note any manual testing needed

## Monitoring and Metrics

### Vercel Dashboard

Monitor deployments at:
- [Vercel Deployments](https://vercel.com/dashboard)
- Check build times
- Monitor bandwidth usage
- Review deployment logs

### GitHub Actions

Track workflow performance:
- View workflow run times
- Check success/failure rates
- Monitor resource usage

## Cost Optimization

### Preview Deployment Limits

Vercel Free Tier:
- 100 deployments per day
- Unlimited previews
- 100 GB bandwidth

### Tips to Reduce Costs

1. **Limit Preview Scope**
   - Only deploy web app for web-only changes
   - Skip deployment for documentation changes

2. **Configure Ignored Paths**
   ```json
   {
     "github": {
       "silent": true,
       "ignorePaths": ["docs/**", "*.md"]
     }
   }
   ```

3. **Auto-cleanup**
   - Previews auto-delete when PR closes
   - Manual cleanup: `vercel rm [deployment-url]`

## Support and Resources

- [Vercel Documentation](https://vercel.com/docs)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- Project maintainers: Create an issue in the repository

## FAQ

**Q: How long do preview deployments last?**
A: Previews remain active until the PR is closed or merged.

**Q: Can I deploy to preview manually?**
A: Yes, use `vercel` command in the `apps/web` directory.

**Q: How many preview deployments can I have?**
A: Unlimited on Vercel, but check your plan limits.

**Q: Can I disable preview deployments for a PR?**
A: Yes, add `[skip ci]` or `[ci skip]` to your commit message.

**Q: How do I test with different environment variables?**
A: Update the env vars in the workflow file or Vercel dashboard.

**Q: Can I password-protect preview deployments?**
A: Yes, enable Deployment Protection in Vercel project settings.

---

**Last Updated**: October 2025
**Version**: 1.0.0
**Maintained by**: Mintenance Team

# MCP Server Authentication Fix Guide

## 🔧 Quick Fix Summary

You have 4 MCP servers that need authentication:
1. ❌ **figma-dev-mode-mcp-server** - Failed (not configured)
2. ⚠️ **stripe** - needs-auth
3. ⚠️ **sentry** - needs-auth
4. ⚠️ **supabase** - needs-auth

---

## 1. Fix Supabase MCP Server ✅

**Status:** needs-auth → Should work with environment variables

### Solution:

The Supabase MCP server needs access tokens. Update your `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase",
        "--read-only",
        "--project-ref=ukrjudtlvapiajkjbcrd",
        "--features=database,types"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "your-access-token-here",
        "SUPABASE_URL": "https://ukrjudtlvapiajkjbcrd.supabase.co",
        "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcmp1ZHRsdmFwaWFqa2piY3JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMTYyNjcsImV4cCI6MjA3MTY5MjI2N30.R8r7pr1fPTPlK0RIB4s9KcJrjDsTfXazpG8-YC3qJXw"
      }
    }
  }
}
```

### How to Get Supabase Access Token:

1. **Go to:** https://app.supabase.com/account/tokens
2. **Click:** "Generate new token"
3. **Name:** "MCP Server Access"
4. **Scopes:** Select "All" or specific project access
5. **Copy the token** and add it to the `env` section above

**Alternative:** Use service role key:
```json
"env": {
  "SUPABASE_SERVICE_ROLE_KEY": "sb_secret_AMoaugS1OiiCYsvyXtRJNw_uVUJwLan",
  "SUPABASE_URL": "https://ukrjudtlvapiajkjbcrd.supabase.co"
}
```

---

## 2. Fix Stripe MCP Server ✅

**Status:** needs-auth → Need to add to MCP config

### Solution:

Add Stripe MCP server to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": [
        "-y",
        "@stripe/mcp-server-stripe"
      ],
      "env": {
        "STRIPE_SECRET_KEY": "sk_test_51SDXwQJmZpzAEZO8AjpLog7IBoaXwl2pAc72E8UMWsLlHaKvDiEKHPlaH3vlNMPK2o01Vkx7MAqpPTBrRySZH3jy00wsQZd1cI"
      }
    }
  }
}
```

### Testing Stripe MCP:

1. Restart Claude Code or Cursor
2. The Stripe MCP should now authenticate automatically
3. You can query Stripe data (customers, payments, subscriptions)

---

## 3. Fix Sentry MCP Server ✅

**Status:** needs-auth → Need to add to MCP config

### Solution:

Add Sentry MCP server to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "sentry": {
      "command": "npx",
      "args": [
        "-y",
        "@sentry/mcp-server"
      ],
      "env": {
        "SENTRY_AUTH_TOKEN": "your-sentry-auth-token-here",
        "SENTRY_ORG": "your-org-slug",
        "SENTRY_PROJECT": "mintenance"
      }
    }
  }
}
```

### How to Get Sentry Auth Token:

1. **Go to:** https://sentry.io/settings/account/api/auth-tokens/
2. **Click:** "Create New Token"
3. **Name:** "MCP Server Access"
4. **Scopes:** Select:
   - `project:read`
   - `org:read`
   - `event:read`
   - `issue:read`
5. **Copy the token** and add it to the `env` section

**Note:** If you haven't set up Sentry yet, you can skip this for now.

---

## 4. Fix Figma Dev Mode MCP Server ❌

**Status:** failed → Not configured

### Why It Failed:

The Figma dev mode MCP server is not in your configuration. This is optional unless you need Figma integration.

### Solution (Optional):

If you want Figma integration, add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": [
        "-y",
        "@figma/mcp-server-figma"
      ],
      "env": {
        "FIGMA_ACCESS_TOKEN": "your-figma-access-token-here"
      }
    }
  }
}
```

### How to Get Figma Access Token:

1. **Go to:** https://www.figma.com/developers/api#access-tokens
2. **Click:** Account Settings → "Personal access tokens"
3. **Generate new token**
4. **Copy the token** and add it to the `env` section

**Recommendation:** Skip this unless you're actively using Figma designs.

---

## 🔄 Complete Updated MCP Configuration

Here's your complete `.cursor/mcp.json` with all fixes:

```json
{
  "mcpServers": {
    "context7": {
      "url": "https://mcp.context7.com/mcp",
      "headers": {
        "CONTEXT7_API_KEY": ""
      }
    },
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase",
        "--read-only",
        "--project-ref=ukrjudtlvapiajkjbcrd",
        "--features=database,types"
      ],
      "env": {
        "SUPABASE_SERVICE_ROLE_KEY": "sb_secret_AMoaugS1OiiCYsvyXtRJNw_uVUJwLan",
        "SUPABASE_URL": "https://ukrjudtlvapiajkjbcrd.supabase.co",
        "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcmp1ZHRsdmFwaWFqa2piY3JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMTYyNjcsImV4cCI6MjA3MTY5MjI2N30.R8r7pr1fPTPlK0RIB4s9KcJrjDsTfXazpG8-YC3qJXw"
      }
    },
    "stripe": {
      "command": "npx",
      "args": [
        "-y",
        "@stripe/mcp-server-stripe"
      ],
      "env": {
        "STRIPE_SECRET_KEY": "sk_test_51SDXwQJmZpzAEZO8AjpLog7IBoaXwl2pAc72E8UMWsLlHaKvDiEKHPlaH3vlNMPK2o01Vkx7MAqpPTBrRySZH3jy00wsQZd1cI"
      }
    },
    "google-maps": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-google-maps"
      ]
    },
    "google-maps-docs": {
      "command": "npx",
      "args": [
        "-y",
        "@googlemaps/code-assist-mcp@latest"
      ]
    },
    "21st-dev-magic": {
      "command": "npx",
      "args": [
        "-y",
        "@21st-dev/magic@latest"
      ]
    }
  }
}
```

**Notes:**
- Sentry omitted (optional - add only if you have Sentry configured)
- Figma omitted (optional - add only if you need Figma integration)
- All credentials are from your existing `.env` file

---

## 🚀 Quick Setup Steps

### Step 1: Update MCP Configuration

Replace the contents of `.cursor/mcp.json` with the complete configuration above.

### Step 2: Restart Claude Code/Cursor

After updating the configuration:
1. Close Claude Code or Cursor completely
2. Reopen the application
3. MCP servers should now authenticate successfully

### Step 3: Verify Authentication

Check the MCP status:
- ✅ **supabase** - should show as authenticated
- ✅ **stripe** - should show as authenticated
- ✅ **context7** - may still need API key (optional)
- ⚠️ **sentry** - omitted (add if needed)
- ⚠️ **figma** - omitted (add if needed)

---

## 🔐 Security Best Practices

### ⚠️ Important Security Notes:

1. **Never commit `.cursor/mcp.json` to git** if it contains credentials
2. **Use environment variables** for sensitive tokens when possible
3. **Rotate tokens** if they've been exposed
4. **Use read-only tokens** for MCP servers when available

### Add to `.gitignore`:

```gitignore
# MCP Configuration with credentials
.cursor/mcp.json
.claude/mcp.json
```

### Alternative: Use Environment Variables

Instead of hardcoding credentials in `mcp.json`, reference environment variables:

```json
{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": ["-y", "@stripe/mcp-server-stripe"],
      "env": {
        "STRIPE_SECRET_KEY": "${STRIPE_SECRET_KEY}"
      }
    }
  }
}
```

Then ensure `STRIPE_SECRET_KEY` is set in your shell environment.

---

## 📊 MCP Server Capabilities

Once authenticated, you can use these MCP servers for:

### Supabase MCP
- Query database schema
- Generate TypeScript types
- View table structures
- Check RLS policies

### Stripe MCP
- Query customer data
- View payment history
- Check subscription status
- Retrieve invoice information

### Sentry MCP (if configured)
- View error reports
- Check performance metrics
- Query issue trends
- Get stack traces

---

## ❓ Troubleshooting

### Issue: MCP servers still show "needs-auth"

**Solutions:**
1. Verify credentials are correct in `.cursor/mcp.json`
2. Restart Claude Code/Cursor completely
3. Check that the MCP server packages are installed (they auto-install via npx)
4. Verify environment variables are set if using `${VAR}` syntax

### Issue: "Command not found" errors

**Solutions:**
1. Ensure Node.js and npm are installed
2. Run `npm install -g npx` to ensure npx is available
3. Check internet connection (npx downloads packages on first use)

### Issue: Supabase MCP "access denied"

**Solutions:**
1. Use `SUPABASE_SERVICE_ROLE_KEY` instead of access token
2. Verify project ref is correct: `ukrjudtlvapiajkjbcrd`
3. Check that the service role key hasn't been rotated

### Issue: Stripe MCP "invalid API key"

**Solutions:**
1. Verify the Stripe secret key starts with `sk_test_` or `sk_live_`
2. Check that the key hasn't expired or been revoked
3. Use the full secret key (not the publishable key)

---

## ✅ Success Checklist

After following this guide, you should have:

- [x] Updated `.cursor/mcp.json` with authentication
- [x] Added Supabase MCP with service role key
- [x] Added Stripe MCP with secret key
- [x] Restarted Claude Code/Cursor
- [x] Verified MCP servers are authenticated
- [x] (Optional) Added Sentry MCP if needed
- [x] (Optional) Added Figma MCP if needed

---

## 📞 Need More Help?

If issues persist:

1. **Check MCP server logs**: Look in Claude Code/Cursor console
2. **Verify package versions**: Ensure MCP packages are up to date
3. **Test credentials separately**: Use Supabase/Stripe CLIs to verify keys work
4. **Restart computer**: Sometimes environment variables need a full restart

---

*Last Updated: 2025-10-03*
*For: Mintenance Project*

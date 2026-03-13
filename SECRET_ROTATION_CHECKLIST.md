# Secret Rotation Checklist — Mintenance

**CRITICAL: All secrets in `.env.local` have been exposed in the local development file and MUST be rotated before production launch.**

## Secrets to Rotate (Priority Order)

### 1. Stripe Keys (CRITICAL — handles real money)
| Secret | Current Prefix | Action |
|--------|----------------|--------|
| `STRIPE_SECRET_KEY` | `sk_live_*` | Rotate in [Stripe Dashboard > Developers > API Keys](https://dashboard.stripe.com/apikeys). Generate new restricted key with minimum required permissions. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_*` | Rotates alongside secret key. Update in Vercel env vars. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_*` | Delete and recreate webhook endpoint in [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks). |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | `whsec_*` | Same as above for Connect webhook endpoint. |

### 2. Supabase Keys (CRITICAL — full database access)
| Secret | Action |
|--------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | Rotate in [Supabase Dashboard > Settings > API](https://supabase.com/dashboard/project/_/settings/api). This key bypasses RLS — treat as root credential. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Rotates alongside service role key. |
| Database password (`REDACTED`) | Change immediately in Supabase Dashboard > Settings > Database. Update connection strings. |

### 3. JWT Secret (CRITICAL — session forgery risk)
| Secret | Action |
|--------|--------|
| `JWT_SECRET` | Generate new 64+ character random string: `openssl rand -base64 64`. All existing sessions will be invalidated (users must re-login). |

### 4. AI/ML API Keys (HIGH)
| Secret | Action |
|--------|--------|
| `OPENAI_API_KEY` | Rotate in [OpenAI Dashboard > API Keys](https://platform.openai.com/api-keys). |
| `ROBOFLOW_API_KEY` | Rotate in Roboflow workspace settings. |
| `GOOGLE_MAPS_API_KEY` | Rotate in [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Add HTTP referrer restrictions. |
| `GOOGLE_CLOUD_API_KEY` | Same as above. |

### 5. Communication Keys (HIGH)
| Secret | Action |
|--------|--------|
| `TWILIO_AUTH_TOKEN` | Rotate in [Twilio Console](https://console.twilio.com/). |
| `RESEND_API_KEY` | Rotate in Resend dashboard. |
| `SLACK_WEBHOOK` | Regenerate in Slack app settings. |

### 6. Monitoring Keys (MEDIUM)
| Secret | Action |
|--------|--------|
| `SENTRY_DSN` | DSN itself is not secret, but verify auth token if used. |
| `UPSTASH_REDIS_REST_TOKEN` | Rotate in [Upstash Console](https://console.upstash.com/). |

### 7. AWS Keys (MEDIUM)
| Secret | Action |
|--------|--------|
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Rotate in IAM. Use scoped policies (Rekognition only). |

## Rotation Procedure

1. **Generate new secret** in the respective service dashboard
2. **Update Vercel environment variables** (Production + Preview):
   ```
   vercel env rm SECRET_NAME production
   vercel env add SECRET_NAME production
   ```
3. **Redeploy** to pick up new values: `vercel --prod`
4. **Verify** the deployment works (health check, Stripe test payment, auth flow)
5. **Revoke old secret** in the service dashboard
6. **Never** store secrets in `.env.local` on shared/cloud machines

## Post-Rotation Verification

- [ ] App loads without errors
- [ ] User can register and login
- [ ] Stripe checkout completes (use test mode first)
- [ ] Webhooks are received (check Stripe webhook logs)
- [ ] AI features work (building surveyor assessment)
- [ ] Email notifications send
- [ ] Rate limiting works (Redis connected)
- [ ] Sentry captures errors

## Ongoing Secret Management

- Store all secrets in **Vercel Environment Variables** only
- Use **Vercel's encrypted storage** — never commit `.env` files
- Rotate all secrets every **90 days** (set calendar reminder)
- Use **restricted/scoped API keys** where possible (Stripe, AWS IAM)
- Enable **2FA** on all service dashboards (Stripe, Supabase, OpenAI, AWS)

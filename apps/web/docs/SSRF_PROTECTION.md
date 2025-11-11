# SSRF Protection Configuration

## Overview

The application includes comprehensive Server-Side Request Forgery (SSRF) protection for all image URL processing. This prevents attackers from making the server request internal resources or arbitrary external URLs.

## Configuration

### Environment Variable: `ALLOWED_IMAGE_DOMAINS`

Configure allowed domains for image URLs via the `ALLOWED_IMAGE_DOMAINS` environment variable.

**Format:**
```bash
ALLOWED_IMAGE_DOMAINS=example.com,cdn.example.com,another-domain.com
```

**Example:**
```bash
ALLOWED_IMAGE_DOMAINS=example.com,cdn.example.com
```

**Notes:**
- Comma-separated list of domains
- Whitespace around domains is automatically trimmed
- Domains are matched exactly or as subdomains (e.g., `example.com` matches `cdn.example.com`)
- Supabase storage domains (`.supabase.co`, `.supabase.in`) are always allowed by default

### Default Allowed Domains

The following domains are always allowed (no configuration needed):
- `*.supabase.co` (Supabase storage)
- `*.supabase.in` (Supabase storage)

## How It Works

1. **URL Validation**: All user-provided image URLs are validated before processing
2. **Domain Allowlist**: URLs must be from allowed domains
3. **IP Blocking**: Private/internal IP addresses are blocked
4. **Protocol Restriction**: Only HTTP/HTTPS protocols are allowed
5. **Content-Type Verification**: URLs must point to actual images

## Protected Endpoints

The following endpoints validate image URLs:

- `/api/jobs` (POST) - Job creation with photos
- `/api/jobs/analyze` - Job analysis with images
- `/api/escrow/[id]/verify-photos-enhanced` - Photo verification

## Protected Services

The following services validate URLs before processing:

- `PhotoVerificationService` - Photo quality and comparison
- `BuildingSurveyorService` - Building damage assessment
- `EscrowReleaseAgent` - Escrow photo verification
- `ImageAnalysisService` - Google Cloud Vision analysis

## Security Features

### IP Address Blocking

The following IP ranges are blocked:
- `10.0.0.0/8` (Private network)
- `172.16.0.0/12` (Private network)
- `192.168.0.0/16` (Private network)
- `127.0.0.0/8` (Loopback)
- `169.254.0.0/16` (Link-local)
- `169.254.169.254` (Cloud metadata)

### Hostname Blocking

The following hostnames are blocked:
- `localhost`
- `127.0.0.1`
- `::1`
- `*.local`
- `*.internal`
- Hostnames containing `metadata`

### Protocol Validation

Only the following protocols are allowed:
- `http:`
- `https:`

All other protocols (e.g., `file:`, `ftp:`, `gopher:`) are rejected.

## Error Handling

When an invalid URL is detected:
1. The request is rejected with a 400 status code
2. A clear error message is returned (without exposing internal details)
3. The rejection is logged for security monitoring
4. The invalid URL details are logged (for admin review)

## Example Usage

### Valid URLs (if domains are allowed):
```
https://example.com/image.jpg
https://cdn.example.com/photos/photo.png
https://your-project.supabase.co/storage/v1/object/public/bucket/image.jpg
```

### Invalid URLs (always rejected):
```
http://127.0.0.1/image.jpg          # Private IP
http://localhost/image.jpg           # Localhost
file:///etc/passwd                   # File protocol
http://169.254.169.254/metadata      # Cloud metadata
http://internal-server/image.jpg     # Internal hostname
```

## Troubleshooting

### URLs are being rejected

1. **Check domain configuration**: Ensure your domain is in `ALLOWED_IMAGE_DOMAINS`
2. **Check domain format**: Use comma-separated list without spaces (or with spaces - they'll be trimmed)
3. **Check logs**: Review application logs for specific rejection reasons
4. **Verify URL format**: Ensure URLs use `http://` or `https://` protocol

### Adding a new CDN domain

1. Add the domain to your `.env.local` file:
   ```bash
   ALLOWED_IMAGE_DOMAINS=example.com,cdn.example.com,new-cdn.com
   ```
2. Restart your application
3. Test with a sample URL from the new domain

## Implementation Details

The URL validation is implemented in `apps/web/lib/security/url-validation.ts`:

- `validateURL()` - Validates a single URL
- `validateURLs()` - Validates multiple URLs (batch)
- `validateSupabaseStorageURL()` - Validates Supabase storage URLs specifically

All validation functions return a `URLValidationResult` object with:
- `isValid`: boolean indicating if URL is valid
- `error`: error message if invalid
- `normalizedUrl`: normalized URL if valid

## Security Best Practices

1. **Always use HTTPS**: Prefer HTTPS URLs over HTTP
2. **Minimize allowed domains**: Only add domains you actually use
3. **Monitor logs**: Regularly review URL validation rejections
4. **Update domains**: Remove unused domains from allowlist
5. **Test changes**: Test URL validation after adding new domains

## Related Files

- `apps/web/lib/security/url-validation.ts` - URL validation implementation
- `apps/web/app/api/jobs/route.ts` - Job creation endpoint
- `apps/web/app/api/jobs/analyze/route.ts` - Job analysis endpoint
- `apps/web/app/api/escrow/[id]/verify-photos-enhanced/route.ts` - Photo verification endpoint


# Next.js JWT Middleware with Authentication

This project demonstrates a complete Next.js authentication system using JWT tokens stored in HTTP-only cookies, with middleware-based route protection.

## Features

- ✅ JWT-based authentication with HTTP-only cookies
- ✅ Middleware-based route protection
- ✅ Automatic redirects for unauthenticated users
- ✅ Secure token verification using `jose` library
- ✅ User session management
- ✅ Protected dashboard page
- ✅ Login/logout functionality

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set environment variables:**
   Create a `.env.local` file:
   ```env
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   # MCP / Tooling (optional; only if you use MCP servers)
   CONTEXT7_API_KEY=your_context7_key
   SUPABASE_ACCESS_TOKEN=your_supabase_personal_access_token
   SUPABASE_PROJECT_REF=ukrjudtlvapiajkjbcrd
   GOOGLE_MAPS_API_KEY=your_google_maps_key
   TWENTY_FIRST_API_KEY=your_21st_dev_key
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Test the authentication:**
   - Visit `http://localhost:3000/dashboard` (should redirect to login)
   - Login with test credentials:
     - Email: `admin@example.com`, Password: `password123`
     - Email: `user@example.com`, Password: `password123`

## Security Features

- HTTP-only cookies for token storage
- JWT signature verification
- Token expiration (24 hours)
- Automatic redirects for unauthenticated users
- Secure cookie settings for production
- Supabase row-level security must remain enabled for all user data (users, jobs, messages, payments). Server APIs should mirror those checks for defense in depth.
- Keep the Supabase service-role client (`apps/web/lib/database.ts`) strictly server-side.
- `npm run -w @mintenance/mobile validate:env` should run before mobile builds to ensure Supabase configuration is present.

## Production Considerations

1. Change JWT secret to a strong, random value
2. Use HTTPS in production
3. Implement proper password hashing
4. Add rate limiting to login endpoints
5. Replace mock users with real database queries

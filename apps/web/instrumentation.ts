/**
 * Next.js 15 instrumentation file
 * Runs at startup to validate production configuration
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import and validate configuration
    const { config } = await import('./lib/config');
    
    // This will throw if production env vars are missing
    config.getRequired('JWT_SECRET');
    
    console.log('✅ Configuration validated successfully');
  }
}

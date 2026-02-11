// Zero-dependency diagnostic route to isolate serverless function crashes
// If this returns 500: problem is environmental (Node version, function packaging)
// If this returns 200: problem is in the import chain of other routes

export async function GET() {
  return new Response(
    JSON.stringify({
      ok: true,
      nodeVersion: process.version,
      env: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

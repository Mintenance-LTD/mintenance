import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to proxy address search requests to Nominatim
 * This avoids CORS issues and allows better rate limiting
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query || query.trim().length < 3) {
    return NextResponse.json(
      { error: 'Query must be at least 3 characters' },
      { status: 400 }
    );
  }

  try {
    // Proxy request to Nominatim with proper headers
    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
    nominatimUrl.searchParams.set('format', 'json');
    nominatimUrl.searchParams.set('q', query);
    nominatimUrl.searchParams.set('countrycodes', 'gb');
    nominatimUrl.searchParams.set('limit', '5');
    nominatimUrl.searchParams.set('addressdetails', '1');

    const response = await fetch(nominatimUrl.toString(), {
      headers: {
        'User-Agent': 'Mintenance App (https://mintenance.app)',
        'Accept': 'application/json',
      },
      // Add a small delay to respect rate limits
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Error fetching addresses from Nominatim:', error);
    return NextResponse.json(
      { error: 'Failed to search addresses. Please try again.' },
      { status: 500 }
    );
  }
}


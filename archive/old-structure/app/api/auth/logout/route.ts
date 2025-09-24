import { NextRequest, NextResponse } from 'next/server';
import { authManager } from '@/lib/auth-manager';

export async function POST(request: NextRequest) {
  try {
    // Use AuthManager to handle logout
    await authManager.logout();

    // Create response
    const response = NextResponse.json(
      { message: 'Logout successful' },
      { status: 200 }
    );

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during logout' },
      { status: 500 }
    );
  }
}

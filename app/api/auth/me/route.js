import { NextResponse } from 'next/server';
import { verifyToken, removeAuthToken } from '@/lib/auth-utils';
import { findUserByEmail } from '@/lib/db';

export async function GET(request) {
  try {
    // Get the token from cookies
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = await verifyToken(token);
    if (!decoded) {
      const response = NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
      // Clear invalid token
      removeAuthToken(response);
      return response;
    }

    // Get user from database
    const user = await findUserByEmail(decoded.email);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Don't send password hash back
    const { password, ...userData } = user;
    
    return NextResponse.json(userData);

  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

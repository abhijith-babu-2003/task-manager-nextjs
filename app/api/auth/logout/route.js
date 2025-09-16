import { NextResponse } from 'next/server';
import { removeAuthToken } from '@/lib/auth-utils';

export async function POST(request) {
  try {
    console.log('Processing logout request');
    
    const response = NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );
    
    // Remove the auth token cookie
    removeAuthToken(response);
    
    // Set CORS headers
    const origin = request.headers.get('origin') || '*';
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    console.log('Logout successful');
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    const response = NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
    
    // Set CORS headers even for error response
    const origin = request.headers.get('origin') || '*';
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Origin', origin);
    
    return response;
  }
}

// Handle preflight requests
export async function OPTIONS(request) {
  const response = new NextResponse(null, { status: 200 });
  
  const origin = request.headers.get('origin') || '*';
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return response;
}
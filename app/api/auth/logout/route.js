import { NextResponse } from 'next/server';
import { removeAuthToken } from '@/lib/auth-utils';
import { initDB } from '@/lib/db';


function setCorsHeaders(response, request) {
  const origin = request.headers.get('origin') || '*';
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-requested-with');
  response.headers.set('Access-Control-Max-Age', '86400'); 
  return response;
}

export async function POST(request) {
  try {
    await initDB();
    
    const response = NextResponse.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
    

    removeAuthToken(response);
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Logout failed' 
    }, { status: 500 });
  }
}


export async function OPTIONS(request) {
  const response = new NextResponse(null, { status: 204 });
  return setCorsHeaders(response, request);
}
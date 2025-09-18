import { NextResponse } from 'next/server';
import { removeAuthToken } from '@/lib/auth-utils';
import dbConnect from '@/lib/mongodb'; 

export async function POST(request) {
  try {
    await dbConnect(); 
    
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
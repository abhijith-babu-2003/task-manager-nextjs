import { NextResponse } from 'next/server';
import { verifyToken } from './lib/auth-utils';
import { initDB } from '@/lib/db';
import User from '@/models/User'; // This was missing!

// List of paths that should be accessible without authentication
const publicPaths = [
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register'
];

export async function middleware(request) {
  try {
    await initDB();
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
  
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth-token')?.value;
  const origin = request.headers.get('origin') || '*';

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id, x-user-email');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
  }

  // Allow public paths
  if (publicPaths.some(path => pathname.startsWith(path))) {
    // If user is already logged in and tries to access login/register, redirect to dashboard
    if (token && (pathname === '/login' || pathname === '/register')) {
      try {
        const decoded = await verifyToken(token);
        if (decoded) {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      } catch (error) {
        // Token invalid, allow access to login/register
        console.log('Invalid token on public path, allowing access');
      }
    }
    
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    return response;
  }

  // Redirect root to login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Handle API routes
  if (pathname.startsWith('/api/')) {
    // Skip auth for public API routes
    if (publicPaths.some(path => pathname.startsWith(path))) {
      const response = NextResponse.next();
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      return response;
    }

    // Require auth for protected API routes
    if (!token) {
      const response = NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      return response;
    }

    try {
      const decoded = await verifyToken(token);
      if (!decoded) {
        console.log('Token verification failed: No decoded token');
        throw new Error('Invalid or expired token');
      }

      // Check if user exists in database
      const user = await User.findById(decoded.id);
      if (!user) {
        console.log('User not found for ID:', decoded.id);
        throw new Error('User not found');
      }

      // Add user info to request headers
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', user._id.toString());
      requestHeaders.set('x-user-email', user.email);

      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
      
      // Set CORS headers
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      
      return response;
    } catch (error) {
      console.error('Token verification failed:', error.message);
      
      // Clear invalid token and return error
      const response = NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.cookies.delete('auth-token');
      return response;
    }
  }

  // Handle page routes (non-API routes)
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const decoded = await verifyToken(token);
    if (!decoded) {
      throw new Error('Invalid token');
    }

    // Check if user exists
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new Error('User not found');
    }

    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    return response;
  } catch (error) {
    console.error('Page route auth failed:', error.message);
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
  runtime: 'nodejs',
};
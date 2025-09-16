import { NextResponse } from 'next/server';
import { verifyToken } from './lib/auth-utils';
import { readDB } from './lib/db';

const protectedRoutes = ['/dashboard', '/tasks'];
const publicRoutes = ['/login', '/register', '/api/auth/login', '/api/auth/register'];
const apiRoutes = ['/api'];

// Helper function to set CORS headers
function setCorsHeaders(response, request) {
  const origin = request.headers.get('origin') || '*';
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-user');
  response.headers.set('Access-Control-Expose-Headers', 'x-user');
  return response;
}

async function middleware(request) {
  const { pathname, origin } = request.nextUrl;
  
  // Handle root path redirection immediately
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', origin));
  }
  const token = request.cookies.get('auth-token')?.value;
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  const isApiRoute = apiRoutes.some(route => pathname.startsWith(route));

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    return setCorsHeaders(response, request);
  }

  // Handle API routes
  if (isApiRoute) {
    // For public API routes, just set CORS headers and continue
    if (isPublicRoute) {
      const response = NextResponse.next();
      return setCorsHeaders(response, request);
    }

    // For protected API routes, verify the token
    if (pathname.startsWith('/api/tasks')) {
      console.log('Processing API request to:', pathname);
      console.log('Auth token exists:', !!token);
      
      if (!token) {
        console.log('No token found for protected API route');
        const response = NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
        return setCorsHeaders(response, request);
      }
      
      try {
        console.log('Verifying token:', token.substring(0, 20) + '...');
        const decoded = await verifyToken(token);
        
        if (!decoded) {
          console.log('Token verification failed - invalid token');
          const response = NextResponse.json(
            { error: 'Invalid or expired token' },
            { status: 401 }
          );
          return setCorsHeaders(response, request);
        }
        
        console.log('Token verified for user:', decoded.email);
        
        // Get the latest user data from the database
        const db = await readDB();
        const user = db.users.find(u => u.id === decoded.id);
        
        if (!user) {
          console.log('User not found in database');
          const response = NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
          return setCorsHeaders(response, request);
        }
        
        console.log('User authenticated:', user.email);
        
        // Create a new request with the user info in headers
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user', JSON.stringify(user));
        
        // Create a response with the modified headers
        const response = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
        
        // Set user info in response headers for debugging
        response.headers.set('x-user-id', user.id);
        response.headers.set('x-user-email', user.email);
        
        return setCorsHeaders(response, request);
        
      } catch (error) {
        console.error('Error verifying API token:', error);
        const response = NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        );
        return setCorsHeaders(response, request);
      }
    }
    
    // For other API routes, just continue with CORS
    const response = NextResponse.next();
    return setCorsHeaders(response, request);
  }

  // Handle protected routes
  if (isProtectedRoute) {
    if (!token) {
      const loginUrl = new URL('/login', origin);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const user = await verifyToken(token);
      if (!user) {
        const response = NextResponse.redirect(new URL('/login', origin));
        response.cookies.delete('auth-token');
        return response;
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      const response = NextResponse.redirect(new URL('/login', origin));
      response.cookies.delete('auth-token');
      return response;
    }
  }

  // Redirect authenticated users away from public routes
  if (isPublicRoute && token) {
    try {
      const user = await verifyToken(token);
      if (user) {
        return NextResponse.redirect(new URL('/dashboard', origin));
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      const response = NextResponse.next();
      response.cookies.delete('auth-token');
      return response;
    }
  }

  const response = NextResponse.next();
  
  // Add CORS headers to all responses
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  
  return response;
}

// Use Node.js runtime instead of Edge Runtime
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
  runtime: 'nodejs',
};

export default middleware;

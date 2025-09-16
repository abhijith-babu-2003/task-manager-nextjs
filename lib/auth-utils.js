import jwt from 'jsonwebtoken';
import { readDB } from './db';

const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET || 'your-secret-key';
export const TOKEN_NAME = 'auth-token';

// Create JWT token
export function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
}

// Verify JWT token
export async function verifyToken(token) {
  try {
    if (!token) {
      console.error('No token provided to verify');
      return null;
    }
    
    // Remove 'Bearer ' prefix if present
    const tokenValue = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
    
    console.log('Verifying token (first 20 chars):', tokenValue.substring(0, 20) + '...');
    
    // Verify the token
    const decoded = jwt.verify(tokenValue, JWT_SECRET);
    console.log('Token verified for user:', decoded.email);
    
    // In browser, return the decoded token without DB check
    if (typeof window !== 'undefined') {
      return decoded;
    }
    
    // In server-side, verify the user exists in the database
    try {
      const dbData = await readDB();
      console.log('Database users count:', dbData.users?.length || 0);
      
      // Find user by ID (primary) or email (fallback)
      const user = dbData.users?.find(u => u.id === decoded.id || u.email.toLowerCase() === decoded.email.toLowerCase());
      
      if (!user) {
        console.error('User not found in database for token. Decoded:', { 
          id: decoded.id, 
          email: decoded.email 
        });
        console.error('Available users:', dbData.users?.map(u => ({ id: u.id, email: u.email })));
        return null;
      }
      
      console.log('User found in database:', { id: user.id, email: user.email });
      
      // Return a clean user object without sensitive data
      return {
        id: user.id,
        email: user.email,
        name: user.name
      };
    } catch (error) {
      console.error('Database error in verifyToken:', error);
      // Return the decoded token even if DB check fails
      return decoded;
    }
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
}

// Get current user from token (Client-side only)
export async function getCurrentUserClient() {
  if (typeof window === 'undefined') return null;
  
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${TOKEN_NAME}=`))
    ?.split('=')[1];
    
  if (!token) return null;
  return await verifyToken(token);
}

// Set auth token in cookies
export function setAuthToken(response, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'lax' : 'lax',
    maxAge: 60 * 60 * 24, // 1 day
    path: '/',
  };

  if (response?.cookies?.set) {
    // Server-side (Next.js API route)
    response.cookies.set(TOKEN_NAME, token, cookieOptions);
    console.log('Auth cookie set in response:', cookieOptions);
  } else if (typeof document !== 'undefined') {
    // Client-side fallback
    let cookieString = `${TOKEN_NAME}=${token}; `;
    cookieString += `max-age=${cookieOptions.maxAge}; `;
    cookieString += `path=${cookieOptions.path}; `;
    cookieString += `sameSite=${cookieOptions.sameSite}; `;
    if (cookieOptions.secure) cookieString += 'secure; ';
    
    document.cookie = cookieString;
    console.log('Auth cookie set client-side:', cookieString);
  }
}

// Remove auth token (logout)
export function removeAuthToken(response) {
  if (response && response.cookies) {
    // Server-side
    response.cookies.set(TOKEN_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
      expires: new Date(0)
    });
  } else if (typeof window !== 'undefined') {
    // Client-side
    document.cookie = `${TOKEN_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

export async function requireAuth() {
  const user = await getCurrentUserClient();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}
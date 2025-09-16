'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          console.log('AuthContext: User state updated:', userData);
        } else {
          setUser(null);
          router.push('/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const login = async (email, password) => {
    try {
      console.log('AuthContext: Attempting login for:', email);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include' // Important for cookies to be sent/received
      });

      const data = await res.json();
      console.log('AuthContext: Login response:', { status: res.status, data });
      
      if (res.ok) {
        console.log('AuthContext: Login successful, setting user:', data.user);
        
        // Update the user state with the response data
        setUser(data.user);
        
        // Force a state update to ensure re-render
        setLoading(false);
        
        // Trigger a check for the auth state to ensure consistency
        const authCheck = await fetch('/api/auth/me', { 
          credentials: 'include' 
        });
        
        if (authCheck.ok) {
          const userData = await authCheck.json();
          console.log('AuthContext: Verified user session:', userData);
          setUser(userData);
        }
        
        // Return the full user data for the login page
        return { 
          success: true,
          user: data.user
        };
      }
      
      console.error('Login failed:', data.error || 'Unknown error');
      return { 
        success: false, 
        error: data.error || 'Login failed. Please try again.' 
      };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection and try again.' 
      };
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    router.push('/login');
  };

  // Add debug logging for auth state changes
  console.log('AuthContext: Current user state:', { user, loading });
  
  // Add debug logging for auth state changes
  console.log('AuthContext: Current user state:', { user, loading });
  
  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      setUser // Expose setUser to components
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

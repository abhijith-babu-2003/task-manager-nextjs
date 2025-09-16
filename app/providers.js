'use client';

import { Toaster } from 'react-hot-toast';

export function Providers({ children }) {
  return (
    <>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#333',
            color: '#fff',
          },
          success: {
            duration: 2000,
          },
          error: {
            duration: 4000,
          },
        }}
      />
    </>
  );
}

import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { Toaster } from 'react-hot-toast';

export default function DashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <main className="py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
        <Toaster position="top-center" reverseOrder={false} />
      </div>
    </ProtectedRoute>
  );
}

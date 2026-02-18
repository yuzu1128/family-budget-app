import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, PieChart } from 'lucide-react';
import MobileBottomNav from './MobileBottomNav';

export default function AppLayout() {
    const { session, signOut } = useAuth();
    const location = useLocation();

    if (!session) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return (
        <div className="min-h-screen bg-gray-50/50">
            <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <div className="bg-indigo-600 rounded-lg p-1.5 shadow-md">
                                    <PieChart className="h-6 w-6 text-white" />
                                </div>
                                <span className="ml-3 text-xl font-bold text-gray-800 tracking-tight">家計簿</span>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <button
                                onClick={() => signOut()}
                                className="ml-4 p-2 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <LogOut className="h-6 w-6" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <Outlet />
            </main>

            {/* Mobile Bottom Nav */}
            <MobileBottomNav />
        </div>
    );
}

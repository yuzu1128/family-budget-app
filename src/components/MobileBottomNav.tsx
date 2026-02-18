import { Home, Settings } from 'lucide-react'; // Changed List/LogOut to Settings
import { useNavigate, useLocation } from 'react-router-dom';

export default function MobileBottomNav() {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex justify-around items-center h-16">
                <button
                    onClick={() => navigate('/')}
                    className={`flex flex-col items-center justify-center w-full h-full transition-colors ${isActive('/') ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <Home className="h-6 w-6" />
                    <span className="text-[10px] font-medium mt-1">ホーム</span>
                </button>
                <button
                    onClick={() => navigate('/settings')}
                    className={`flex flex-col items-center justify-center w-full h-full transition-colors ${isActive('/settings') ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <Settings className="h-6 w-6" />
                    <span className="text-[10px] font-medium mt-1">設定</span>
                </button>
            </div>
        </div>
    );
}

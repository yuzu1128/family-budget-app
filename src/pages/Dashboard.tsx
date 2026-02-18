import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, Users } from 'lucide-react';
import { useHousehold } from '../contexts/HouseholdContext';
import LedgerTable from '../components/LedgerTable';
import DashboardSummary from '../components/DashboardSummary';



import SetBalanceModal from '../components/SetBalanceModal';

interface Household {
    id: string;
    name: string;
    role: 'owner' | 'member';
}

export default function Dashboard() {
    const { user } = useAuth();
    const { currentHouseholdId, refreshHouseholds } = useHousehold();
    const [household, setHousehold] = useState<Household | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newHouseholdName, setNewHouseholdName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [updateTrigger, setUpdateTrigger] = useState(0);

    // Modal State
    const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);

    const handleExpenseAdded = () => {
        setUpdateTrigger(prev => prev + 1);
    };

    const handleBalanceClick = () => {
        setIsBalanceModalOpen(true);
    };

    useEffect(() => {
        async function fetchHousehold() {
            if (!user || !currentHouseholdId) {
                setHousehold(null);
                setLoading(false);
                return;
            }

            setLoading(true);
            const { data, error } = await supabase
                .from('household_members')
                .select(`
          role,
          households (
            id,
            name
          )
        `)
                .eq('user_id', user.id)
                .eq('household_id', currentHouseholdId)
                .single();

            if (error) {
                console.error('Error fetching household:', error);
            }

            if (data && data.households) {
                const h = Array.isArray(data.households) ? data.households[0] : data.households;
                setHousehold({
                    id: h.id,
                    name: h.name,
                    role: data.role as 'owner' | 'member'
                });
            }
            setLoading(false);
        }

        fetchHousehold();
    }, [user, currentHouseholdId]);

    const handleCreateHousehold = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newHouseholdName.trim()) return;

        setLoading(true);
        setError(null);

        try {
            // Use RPC call to handle transaction safely on the server
            const { data, error } = await supabase
                .rpc('create_household', { name: newHouseholdName });

            if (error) throw error;

            if (data) {
                setHousehold(data);
                setIsCreating(false);
                await refreshHouseholds();
            }

        } catch (err: unknown) {
            console.error('Failed to create household:', err);
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message || 'Failed to create household');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="text-center py-10">読み込み中...</div>;
    }

    if (!household) {
        return (
            <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                        家計簿へようこそ
                    </h2>
                    <p className="mt-4 text-lg text-gray-500">
                        まだ家計簿グループに参加していません。新しく作成して始めましょう！
                    </p>
                </div>

                {isCreating ? (
                    <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">新しい家計簿グループを作成</h3>
                        <form onSubmit={handleCreateHousehold} className="space-y-6">
                            {error && (
                                <div className="bg-red-50 text-red-700 px-4 py-3 rounded">
                                    {error}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">家計簿名</label>
                                <input
                                    type="text"
                                    required
                                    value={newHouseholdName}
                                    onChange={(e) => setNewHouseholdName(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="例: 佐藤家"
                                />
                            </div>
                            <div className="flex gap-4">
                                <button
                                    type="submit"
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                                >
                                    作成
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    キャンセル
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={() => setIsCreating(true)}
                            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            <Plus className="mr-2 h-5 w-5" />
                            家計簿を作成
                        </button>
                        <button
                            className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                            <Users className="mr-2 h-5 w-5" />
                            招待から参加
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32 md:pb-8">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
                <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                            {household.name}
                        </h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                            権限: {household.role}
                        </p>
                    </div>
                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        有効
                    </span>
                </div>
            </div>

            <DashboardSummary
                householdId={household.id}
                lastUpdate={updateTrigger}
                onBalanceClick={handleBalanceClick}
            />

            <LedgerTable householdId={household.id} lastUpdate={updateTrigger} onUpdate={handleExpenseAdded} />



            <SetBalanceModal
                isOpen={isBalanceModalOpen}
                onClose={() => setIsBalanceModalOpen(false)}
                householdId={household.id}
                onBalanceSet={handleExpenseAdded}
            />


        </div>
    );
}

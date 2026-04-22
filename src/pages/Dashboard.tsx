import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { apiClient, getErrorMessage } from '../lib/api-client';
import type { HouseholdSummary } from '../lib/api-types';
import LedgerTable from '../components/LedgerTable';
import DashboardSummary from '../components/DashboardSummary';
import SetBalanceModal from '../components/SetBalanceModal';

export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { currentHouseholdId, refreshHouseholds, setCurrentHouseholdId } = useHousehold();
    const [household, setHousehold] = useState<HouseholdSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newHouseholdName, setNewHouseholdName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [updateTrigger, setUpdateTrigger] = useState(0);
    const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);

    const handleExpenseAdded = () => {
        setUpdateTrigger((prev) => prev + 1);
    };

    useEffect(() => {
        async function fetchHousehold() {
            if (!user || !currentHouseholdId) {
                setHousehold(null);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const { household: currentHousehold } = await apiClient.households.get(currentHouseholdId);
                setHousehold(currentHousehold);
                setError(null);
            } catch (fetchError) {
                setHousehold(null);
                setError(getErrorMessage(fetchError, '家計簿の読み込みに失敗しました。'));
            } finally {
                setLoading(false);
            }
        }

        void fetchHousehold();
    }, [currentHouseholdId, user]);

    const handleCreateHousehold = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newHouseholdName.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const { household: createdHousehold } = await apiClient.households.create(newHouseholdName.trim());
            setHousehold(createdHousehold);
            setCurrentHouseholdId(createdHousehold.id);
            setNewHouseholdName('');
            setIsCreating(false);
            await refreshHouseholds();
        } catch (createError) {
            setError(getErrorMessage(createError, '家計簿の作成に失敗しました。'));
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
                        まだ家計簿グループに参加していません。新しく作成して始めましょう。
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
                            onClick={() => navigate('/settings')}
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

            {error && (
                <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <DashboardSummary
                householdId={household.id}
                lastUpdate={updateTrigger}
                onBalanceClick={() => setIsBalanceModalOpen(true)}
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

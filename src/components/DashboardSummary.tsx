import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { apiClient } from '../lib/api-client';

interface DashboardSummaryProps {
    householdId: string;
    lastUpdate: number;
    onBalanceClick?: () => void;
}

export default function DashboardSummary({ householdId, lastUpdate, onBalanceClick }: DashboardSummaryProps) {
    const [totalSpent, setTotalSpent] = useState(0);
    const [totalIncome, setTotalIncome] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSummary() {
            setLoading(true);

            try {
                const month = format(new Date(), 'yyyy-MM');
                const summary = await apiClient.households.getSummary(householdId, month);
                setTotalIncome(summary.totalIncome);
                setTotalSpent(summary.totalSpent);
            } catch (error) {
                console.error('Failed to load summary:', error);
                setTotalIncome(0);
                setTotalSpent(0);
            } finally {
                setLoading(false);
            }
        }

        void fetchSummary();
    }, [householdId, lastUpdate]);

    if (loading) return <div>集計を読み込み中...</div>;

    const remaining = totalIncome - totalSpent;

    return (
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
            <div className="flex flex-col items-center">
                <div
                    className="text-center cursor-pointer hover:scale-105 transition-transform"
                    onClick={onBalanceClick}
                >
                    <p className="text-sm text-gray-500 font-medium mb-1">今月の残高</p>
                    <h2 className={`text-5xl font-extrabold ${remaining < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        ¥{remaining.toLocaleString()}
                    </h2>
                    <p className="text-xs text-gray-400 mt-2">タップして残高を設定</p>
                </div>
            </div>
        </div>
    );
}

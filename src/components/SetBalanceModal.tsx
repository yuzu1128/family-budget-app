import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X } from 'lucide-react';


interface SetBalanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    householdId: string;
    onBalanceSet: () => void;
}

export default function SetBalanceModal({ isOpen, onClose, householdId, onBalanceSet }: SetBalanceModalProps) {
    const { user } = useAuth();
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'add' | 'set'>('set');

    // Fetch balance when modal opens
    useEffect(() => {
        if (isOpen && user) {
            fetchCurrentBalance();
            setAmount('');
        }
    }, [isOpen, user, householdId]);

    const fetchCurrentBalance = async () => {
        try {
            const { data, error } = await supabase
                .from('expenses')
                .select('amount')
                .eq('household_id', householdId);

            if (error) throw error;

            let total = 0;
            data?.forEach(e => {
                total += e.amount;
            });

            // Always default to 'add' mode
            setMode('add');

        } catch (err) {
            console.error('Error fetching balance:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            const inputVal = parseInt(amount);
            if (isNaN(inputVal)) throw new Error('有効な数値を入力してください');

            if (mode === 'add') {
                // "Add Balance" Mode: Add to existing balance.
                // We want to increase the Balance.
                // Since Balance = -(Sum of amounts), and Income is Negative.
                // To Increase Balance by X, we need to add an Income of X.
                // So we insert -X.

                const { error } = await supabase.from('expenses').insert({
                    household_id: householdId,
                    created_by: user.id,
                    amount: -Math.abs(inputVal), // Ensure it is negative (Income)
                    description: '残高追加',
                    transaction_date: '2000-01-01', // Apply to past to affect current balance immediately
                });
                if (error) throw error;

            } else {
                // "Set Balance" Mode: Force Total Balance to be inputVal.

                // 1. Cleanup old settings first
                await supabase.from('expenses').delete().eq('household_id', householdId).eq('description', '月次予算');
                await supabase.from('expenses').delete().eq('household_id', householdId).eq('description', '資産初期残高');
                await supabase.from('expenses').delete().eq('household_id', householdId).eq('description', '残高追加');

                // 2. Calculate actual balance from regular transactions (expenses/incomes only)
                const { data: actualTransactions } = await supabase
                    .from('expenses')
                    .select('amount')
                    .eq('household_id', householdId);

                let actualBalance = 0; // This is the sum of amounts in DB
                if (actualTransactions) {
                    actualTransactions.forEach(e => actualBalance += e.amount);
                }

                // 3. Calculate adjustment needed
                // Current display balance = -actualBalance
                // Target display balance = inputVal
                // So target actual balance = -inputVal
                // Adjustment = target - actual = -inputVal - actualBalance
                const targetActualBalance = -inputVal;
                const adjustmentAmount = targetActualBalance - actualBalance;

                // 4. Insert adjustment as "資産初期残高" at 2000-01-01
                const { error: insertError } = await supabase
                    .from('expenses')
                    .insert({
                        household_id: householdId,
                        created_by: user.id,
                        amount: adjustmentAmount,
                        description: '資産初期残高',
                        transaction_date: '2000-01-01',
                    });

                if (insertError) throw insertError;
            }

            onBalanceSet();
            onClose();

        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            alert('Error: ' + message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} aria-hidden="true"></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-white rounded-t-2xl sm:rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm w-full">
                    <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900" id="modal-title">
                                {mode === 'add' ? '残高を追加' : '残高を再設定'}
                            </h3>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                                <X className="h-6 w-6 text-gray-500" />
                            </button>
                        </div>

                        {/* Mode Toggle */}
                        <div className="flex justify-center mb-4">
                            <div className="bg-gray-100 p-1 rounded-lg flex">
                                <button
                                    type="button"
                                    onClick={() => setMode('add')}
                                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${mode === 'add' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                                >
                                    追加
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode('set')}
                                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${mode === 'set' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                                >
                                    再設定
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="balance-input" className="block text-sm font-medium text-gray-700 mb-1">
                                    {mode === 'add' ? '追加する金額 (円)' : '設定する残高 (円)'}
                                </label>
                                <div className="relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 sm:text-sm">¥</span>
                                    </div>
                                    <input
                                        type="number"
                                        id="balance-input"
                                        required
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 py-3 sm:text-sm border-gray-300 rounded-lg border appearance-none font-bold text-lg"
                                        placeholder="0"
                                        inputMode="numeric"
                                    />
                                    <p className="text-xs text-gray-400 mt-2">
                                        {mode === 'add'
                                            ? '※ 現在の残高に入力した金額がプラスされます。'
                                            : '※ 過去の支出を含めて、現在の残高がこの金額になるように調整されます。'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full inline-flex justify-center items-center py-4 px-6 border border-transparent shadow text-lg font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {loading ? '保存中...' : (mode === 'add' ? '追加する' : '設定する')}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { apiClient, getErrorMessage } from '../lib/api-client';
import { useAuth } from '../contexts/AuthContext';

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
    const [mode, setMode] = useState<'add' | 'set'>('add');

    useEffect(() => {
        if (isOpen && user) {
            setMode('add');
            setAmount('');
        }
    }, [isOpen, user, householdId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            const inputVal = Number.parseInt(amount, 10);
            if (Number.isNaN(inputVal)) throw new Error('有効な数値を入力してください');

            await apiClient.households.adjustBalance(householdId, mode, inputVal);
            onBalanceSet();
            onClose();
        } catch (error) {
            alert(getErrorMessage(error, '残高の更新に失敗しました。'));
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

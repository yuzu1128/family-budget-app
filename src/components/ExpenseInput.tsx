import { useState } from 'react';
import { Plus, Upload } from 'lucide-react';
import { apiClient, getErrorMessage } from '../lib/api-client';
import { useAuth } from '../contexts/AuthContext';

interface ExpenseInputProps {
    householdId: string;
    onExpenseAdded: () => void;
}

export default function ExpenseInput({ householdId, onExpenseAdded }: ExpenseInputProps) {
    const { user } = useAuth();
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            await apiClient.expenses.create(householdId, {
                amount: Number.parseInt(amount, 10),
                description,
                transactionDate: date,
                receipt: file,
            });

            setAmount('');
            setDescription('');
            setFile(null);
            onExpenseAdded();
        } catch (error) {
            alert(getErrorMessage(error, '支出の追加に失敗しました。'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/50 border border-gray-100 p-8 mb-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            <h3 className="text-2xl font-bold text-gray-800 mb-8 flex items-center">
                <div className="bg-indigo-100 rounded-full p-2 mr-3">
                    <Plus className="w-5 h-5 text-indigo-600" />
                </div>
                支出を追加
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-2">
                    <label htmlFor="amount" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        金額 (円)
                    </label>
                    <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">¥</span>
                        </div>
                        <input
                            type="number"
                            name="amount"
                            id="amount"
                            required
                            min="1"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 sm:text-sm border-gray-300 rounded-lg p-3 border"
                            placeholder="0"
                        />
                    </div>
                </div>

                <div className="sm:col-span-2">
                    <label htmlFor="date" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        日付
                    </label>
                    <input
                        type="date"
                        name="date"
                        id="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-lg p-3 border shadow-sm"
                    />
                </div>

                <div className="sm:col-span-2">
                    <label htmlFor="description" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        内容
                    </label>
                    <input
                        type="text"
                        name="description"
                        id="description"
                        required
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-lg p-3 border shadow-sm"
                        placeholder="例: 食費、家賃など"
                    />
                </div>

                <div className="sm:col-span-6">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">レシート画像</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-indigo-400 transition-colors">
                        <div className="space-y-1 text-center">
                            {file ? (
                                <div className="flex flex-col items-center">
                                    <p className="text-sm text-gray-600 font-medium">{file.name}</p>
                                    <button
                                        type="button"
                                        onClick={() => setFile(null)}
                                        className="text-xs text-red-500 hover:text-red-700 mt-2 font-medium"
                                    >
                                        ファイルの削除
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                    <div className="flex text-sm text-gray-600 justify-center">
                                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                                            <span>ファイルをアップロード</span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                                            />
                                        </label>
                                        <p className="pl-1">またはドラッグ＆ドロップ</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="sm:col-span-6">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full inline-flex justify-center items-center py-4 px-6 border border-transparent shadow-lg text-lg font-bold rounded-2xl text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-200 transition-all transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? '追加中...' : <><Plus className="h-6 w-6 mr-2" /> 追加する</>}
                    </button>
                </div>
            </form>
        </div>
    );
}

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Users, AlertCircle } from 'lucide-react';

export default function Join() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const token = searchParams.get('token');

    const [householdName, setHouseholdName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) {
            setError('無効な招待リンクです');
            setLoading(false);
            return;
        }

        async function checkHousehold() {
            setLoading(true);
            const { data, error } = await supabase
                .from('households')
                .select('name')
                .eq('id', token)
                .single();

            if (error || !data) {
                setError('家計簿が見つかりませんでした');
            } else {
                setHouseholdName(data.name);
            }
            setLoading(false);
        }

        checkHousehold();
    }, [token]);

    const handleJoin = async () => {
        if (!user || !token) return;
        setJoining(true);
        try {
            // Check if already a member
            const { data: existing } = await supabase
                .from('household_members')
                .select('id')
                .eq('user_id', user.id)
                .eq('household_id', token)
                .single();

            if (existing) {
                // Already member, just redirect
                navigate('/');
                return;
            }

            const { error } = await supabase
                .from('household_members')
                .insert({
                    user_id: user.id,
                    household_id: token,
                    role: 'member'
                });

            if (error) throw error;

            navigate('/');

        } catch (err: unknown) {
            console.error(err);
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError('参加に失敗しました: ' + message);
        } finally {
            setJoining(false);
        }
    };

    if (loading) return <div className="text-center py-20">読み込み中...</div>;

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
                    <h2 className="mt-6 text-2xl font-extrabold text-gray-900">エラー</h2>
                    <p className="mt-2 text-gray-600">{error}</p>
                    <button onClick={() => navigate('/')} className="mt-6 text-indigo-600 hover:text-indigo-500 font-medium">
                        ホームに戻る
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 mb-4">
                        <Users className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                        家計簿に参加
                    </h2>
                    <p className="text-gray-500 mb-6">
                        <strong>{householdName}</strong> に招待されています。<br />
                        参加しますか？
                    </p>

                    <button
                        onClick={handleJoin}
                        disabled={joining}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {joining ? '処理中...' : '参加する'}
                    </button>

                    <button
                        onClick={() => navigate('/')}
                        className="mt-4 w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        キャンセル
                    </button>
                </div>
            </div>
        </div>
    );
}

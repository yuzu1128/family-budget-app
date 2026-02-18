import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { UserPlus } from 'lucide-react';

export default function Register() {
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const location = useLocation();
    const navigate = useNavigate();
    const from = location.state?.from
        ? (location.state.from.pathname + (location.state.from.search || ''))
        : "/";

    const DUMMY_DOMAIN = '@familybudget.com';

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const email = `${userId}${DUMMY_DOMAIN}`;

        const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });

        if (signUpError) {
            // Translate common errors
            if (signUpError.message.includes('User already registered') || signUpError.message.includes('already been registered')) {
                setError('そのIDは既に使用されています。');
            } else if (signUpError.message.includes('valid email')) {
                // Fallback for email validation error (though acceptable domain should fix this)
                setError('IDに使用できない文字が含まれている可能性があります。');
            } else {
                setError(signUpError.message);
            }
            setLoading(false);
            return;
        }

        // Auto-login: Check session or explicitly sign in
        let session = data.session;
        let signInErrorMessage = '';

        if (!session) {
            // Try explicit sign in
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (!signInError && signInData.session) {
                session = signInData.session;
            } else {
                signInErrorMessage = signInError?.message || '';
            }
        }

        if (session) {
            navigate(from, { replace: true });
        } else {
            // If still no session, likely email confirmation is enforced on server
            setError(`登録は完了しましたが、自動ログインに失敗しました (${signInErrorMessage || '不明な理由'})。Supabaseの「Confirm email」設定がOFFであることを確認してください。`);
        }
        setLoading(false);
    };

    const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Only allow alphanumeric
        if (/^[a-zA-Z0-9]*$/.test(val)) {
            setUserId(val);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8">
                <div className="flex justify-center mb-6">
                    <div className="bg-gradient-to-tr from-green-400 to-teal-500 rounded-xl p-3 shadow-lg transform -rotate-3">
                        <UserPlus className="h-10 w-10 text-white" />
                    </div>
                </div>
                <h2 className="text-center text-3xl font-extrabold text-gray-900 tracking-tight">アカウント作成</h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    または{' '}
                    <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
                        既存のアカウントでログイン
                    </Link>
                </p>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-xl shadow-teal-100/50 sm:rounded-2xl sm:px-10 border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 via-teal-500 to-blue-500"></div>

                    <form className="space-y-6" onSubmit={handleRegister}>
                        {error && (
                            <div className="bg-blue-50 border border-blue-400 text-blue-700 px-4 py-3 rounded relative" role="alert">
                                <span className="block sm:inline">{error}</span>
                            </div>
                        )}

                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">氏名 (表示名)</label>
                            <div className="mt-1">
                                <input
                                    id="fullName"
                                    name="fullName"
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-shadow"
                                    placeholder="例: 山田 太郎"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="userId" className="block text-sm font-medium text-gray-700">ユーザーID (半角英数字)</label>
                            <div className="mt-1">
                                <input
                                    id="userId"
                                    name="userId"
                                    type="text"
                                    required
                                    value={userId}
                                    onChange={handleIdChange}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-shadow"
                                    placeholder="例: tarou"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">パスワード</label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-shadow"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 focus:outline-none focus:ring-4 focus:ring-green-200 transition-all transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                            >
                                {loading ? '登録中...' : '登録'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

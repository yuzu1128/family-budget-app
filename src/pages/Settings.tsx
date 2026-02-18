import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { supabase } from '../lib/supabase';
import { LogOut, ArrowLeft, Copy, Check, Archive, Edit2, Plus, Share2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';

export default function Settings() {
    const { user, signOut } = useAuth();
    const { currentHouseholdId, setCurrentHouseholdId, refreshHouseholds } = useHousehold();
    const navigate = useNavigate();

    const [households, setHouseholds] = useState<any[]>([]);
    const [archivedHouseholds, setArchivedHouseholds] = useState<any[]>([]);
    const [members, setMembers] = useState<{ [key: string]: string[] }>({});
    const [userName, setUserName] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newHouseholdName, setNewHouseholdName] = useState('');
    const [editingHousehold, setEditingHousehold] = useState<{ id: string, name: string } | null>(null);
    const [invitingHousehold, setInvitingHousehold] = useState<{ id: string, name: string } | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);

        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        if (profile) setUserName(profile.full_name);

        const { data: memberships } = await supabase
            .from('household_members')
            .select(`
                role,
                household_id,
                households (
                    id,
                    name,
                    is_archived
                )
            `)
            .eq('user_id', user.id);

        if (memberships) {
            const active = memberships.filter(m => !(m.households as any).is_archived);
            const archived = memberships.filter(m => (m.households as any).is_archived);
            setHouseholds(active);
            setArchivedHouseholds(archived);

            for (const m of active) {
                const { data: memberList } = await supabase
                    .from('household_members')
                    .select('profiles(full_name)')
                    .eq('household_id', m.household_id);
                if (memberList) {
                    setMembers(prev => ({ ...prev, [m.household_id]: memberList.map((ml: any) => ml.profiles?.full_name || '名前なし') }));
                }
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const handleCreateHousehold = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newHouseholdName.trim()) return;
        const { error } = await supabase.rpc('create_household', { name: newHouseholdName });
        if (!error) {
            setNewHouseholdName('');
            setIsCreating(false);
            await fetchData();
            await refreshHouseholds();
        }
    };

    const handleRename = async () => {
        if (!editingHousehold) return;
        const { error } = await supabase.from('households').update({ name: editingHousehold.name }).eq('id', editingHousehold.id);
        if (!error) {
            setEditingHousehold(null);
            fetchData();
        }
    };

    const handleArchive = async (id: string, archive: boolean) => {
        const { error } = await supabase.from('households').update({ is_archived: archive }).eq('id', id);
        if (!error) {
            fetchData();
            await refreshHouseholds();
        }
    };

    const handleCopy = (id: string) => {
        const url = `${window.location.origin}/join?token=${id}`;
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (loading && households.length === 0) return <div className="p-10 text-center text-gray-500">読み込み中...</div>;

    return (
        <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-24">
            <div className="bg-white shadow-sm sticky top-0 z-50 px-4 py-4 flex items-center justify-between border-b border-gray-100">
                <div className="flex items-center">
                    <button onClick={() => navigate('/')} className="mr-3 text-gray-500 hover:bg-gray-100 p-1 rounded-full transition-colors">
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-lg font-bold text-gray-900">家計簿の管理</h1>
                </div>
                <button onClick={() => setIsCreating(true)} className="text-indigo-600 p-1 hover:bg-indigo-50 rounded-full transition-colors">
                    <Plus className="h-6 w-6" />
                </button>
            </div>

            <div className="p-4 space-y-4">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">参加中の家計簿</h2>
                {households.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 text-center border-2 border-dashed border-gray-200">
                        <p className="text-sm text-gray-500 mb-4">参加中の家計簿がありません</p>
                        <button onClick={() => setIsCreating(true)} className="text-indigo-600 font-bold text-sm">新しく作成する</button>
                    </div>
                ) : (
                    households.map(m => (
                        <div key={m.household_id} className={`bg-white rounded-2xl shadow-sm border ${currentHouseholdId === m.household_id ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-gray-100'} overflow-hidden transition-all`}>
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                        <h3 className="text-base font-bold text-gray-900 flex items-center">
                                            {(m.households as any).name}
                                            {m.role === 'owner' && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold">オーナー</span>}
                                        </h3>
                                        <p className="text-xs text-gray-400 mt-1">
                                            <span className="font-medium">メンバー:</span> {members[m.household_id]?.join(', ') || '読み込み中...'}
                                        </p>
                                    </div>
                                    <div className="flex space-x-1">
                                        <button onClick={() => setInvitingHousehold({ id: m.household_id, name: (m.households as any).name })} className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="家族を招待">
                                            <Share2 className="h-4 w-4" />
                                        </button>
                                        {m.role === 'owner' && (
                                            <>
                                                <button onClick={() => setEditingHousehold({ id: m.household_id, name: (m.households as any).name })} className="p-2 text-gray-300 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => handleArchive(m.household_id, true)} className="p-2 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Archive className="h-4 w-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center mt-5 space-x-2">
                                    <button
                                        onClick={() => setCurrentHouseholdId(m.household_id)}
                                        disabled={currentHouseholdId === m.household_id}
                                        className={`flex-1 flex items-center justify-center py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${currentHouseholdId === m.household_id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        {currentHouseholdId === m.household_id ? '表示中' : 'この家計簿に切り替え'}
                                    </button>
                                    <button
                                        onClick={() => handleCopy(m.household_id)}
                                        className={`p-2.5 rounded-xl transition-all ${copiedId === m.household_id ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400 hover:text-gray-600'}`}
                                        title="招待リンクをコピー"
                                    >
                                        {copiedId === m.household_id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {isCreating && (
                    <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
                        <h3 className="text-sm font-bold text-indigo-900 mb-3">新しい家計簿を作成</h3>
                        <form onSubmit={handleCreateHousehold} className="space-y-3">
                            <input
                                autoFocus
                                value={newHouseholdName}
                                onChange={e => setNewHouseholdName(e.target.value)}
                                className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                placeholder="家計簿の名前 (例: 個人用)"
                            />
                            <div className="flex space-x-2">
                                <button type="submit" className="flex-1 bg-indigo-600 text-white text-xs font-bold py-3 rounded-xl shadow-md shadow-indigo-200">作成</button>
                                <button type="button" onClick={() => setIsCreating(false)} className="flex-1 bg-white text-gray-500 text-xs font-bold py-3 rounded-xl border border-indigo-100">キャンセル</button>
                            </div>
                        </form>
                    </div>
                )}

                {archivedHouseholds.length > 0 && (
                    <div className="mt-8 space-y-4">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">アーカイブ済み</h2>
                        {archivedHouseholds.map(m => (
                            <div key={m.household_id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex justify-between items-center group">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-500">{(m.households as any).name}</h3>
                                    <p className="text-[10px] text-gray-400 mt-0.5">アーカイブ中</p>
                                </div>
                                <button
                                    onClick={() => handleArchive(m.household_id, false)}
                                    className="text-xs font-bold text-indigo-600 px-4 py-2 bg-white rounded-xl shadow-sm border border-indigo-50 hover:bg-indigo-50 transition-colors"
                                >
                                    復元
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-12 bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
                    <h2 className="text-base font-bold text-gray-800 mb-5">アカウント詳細</h2>
                    <div className="flex items-center space-x-4 mb-8 p-3 bg-gray-50 rounded-2xl">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-100">
                            {(userName || '名').charAt(0)}
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">ログイン中のユーザー</p>
                            <p className="text-lg font-black text-gray-800 tracking-tight">{userName || '未設定'}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="w-full bg-red-50 text-red-600 font-bold py-4 rounded-2xl hover:bg-red-100 transition-all flex justify-center items-center active:scale-[0.98]"
                    >
                        <LogOut className="h-5 w-5 mr-3" />
                        ログアウト
                    </button>
                </div>
            </div>

            {editingHousehold && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-black text-gray-900 mb-2 tracking-tight">名称変更</h3>
                        <p className="text-sm text-gray-500 mb-6">家計簿の新しい名前を入力してください</p>
                        <input
                            autoFocus
                            value={editingHousehold.name}
                            onChange={e => setEditingHousehold({ ...editingHousehold, name: e.target.value })}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl px-5 py-4 mb-6 outline-none transition-all font-bold text-gray-800"
                            placeholder="名称"
                        />
                        <div className="flex space-x-3">
                            <button onClick={handleRename} className="flex-2 bg-indigo-600 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-indigo-200 active:scale-[0.96] transition-transform">保存</button>
                            <button onClick={() => setEditingHousehold(null)} className="flex-1 bg-gray-100 text-gray-500 font-bold py-4 rounded-2xl active:scale-[0.96] transition-transform">中止</button>
                        </div>
                    </div>
                </div>
            )}

            {invitingHousehold && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 duration-200 relative">
                        <button onClick={() => setInvitingHousehold(null)} className="absolute top-6 right-6 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                            <X className="h-5 w-5" />
                        </button>

                        <div className="flex flex-col items-center">
                            <div className="bg-indigo-50 p-3 rounded-2xl mb-4">
                                <Share2 className="h-6 w-6 text-indigo-600" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-1 tracking-tight">家族を招待</h3>
                            <p className="text-sm text-gray-500 mb-8 text-center">「{invitingHousehold.name}」にメンバーを追加します</p>

                            <div className="bg-white p-4 rounded-3xl shadow-xl border border-gray-100 mb-8">
                                <QRCode value={`${window.location.origin}/join?token=${invitingHousehold.id}`} size={180} />
                            </div>

                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3">招待リンクを共有</p>
                            <button
                                onClick={() => handleCopy(invitingHousehold.id)}
                                className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all active:scale-[0.98] ${copiedId === invitingHousehold.id ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-indigo-100'}`}
                            >
                                <span className="text-xs font-bold truncate mr-2">
                                    {window.location.origin}/join?token={invitingHousehold.id}
                                </span>
                                {copiedId === invitingHousehold.id ? <Check className="h-5 w-5 flex-shrink-0" /> : <Copy className="h-5 w-5 flex-shrink-0" />}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useCallback, useEffect, useState } from 'react';
import { LogOut, ArrowLeft, Copy, Check, Archive, Edit2, Plus, Share2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { apiClient, getErrorMessage } from '../lib/api-client';
import type { HouseholdMembership, InviteLink } from '../lib/api-types';

interface InviteDialogState {
    householdId: string;
    householdName: string;
    inviteUrl: string | null;
    expiresAt: string | null;
}

export default function Settings() {
    const { user, signOut } = useAuth();
    const { currentHouseholdId, setCurrentHouseholdId, refreshHouseholds } = useHousehold();
    const navigate = useNavigate();

    const [households, setHouseholds] = useState<HouseholdMembership[]>([]);
    const [archivedHouseholds, setArchivedHouseholds] = useState<HouseholdMembership[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newHouseholdName, setNewHouseholdName] = useState('');
    const [editingHousehold, setEditingHousehold] = useState<{ id: string; name: string } | null>(null);
    const [invitingHousehold, setInvitingHousehold] = useState<InviteDialogState | null>(null);
    const [inviteLoadingId, setInviteLoadingId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!user) return;

        setLoading(true);
        try {
            const { activeHouseholds, archivedHouseholds: archived } = await apiClient.households.list();
            setHouseholds(activeHouseholds);
            setArchivedHouseholds(archived);
            setError(null);
        } catch (fetchError) {
            setError(getErrorMessage(fetchError, '家計簿一覧の取得に失敗しました。'));
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const handleCreateHousehold = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newHouseholdName.trim()) return;

        try {
            const { household } = await apiClient.households.create(newHouseholdName.trim());
            setNewHouseholdName('');
            setIsCreating(false);
            await fetchData();
            await refreshHouseholds();
            setCurrentHouseholdId(household.id);
        } catch (createError) {
            setError(getErrorMessage(createError, '家計簿の作成に失敗しました。'));
        }
    };

    const handleRename = async () => {
        if (!editingHousehold) return;

        try {
            await apiClient.households.update(editingHousehold.id, { name: editingHousehold.name });
            setEditingHousehold(null);
            await fetchData();
        } catch (renameError) {
            setError(getErrorMessage(renameError, '名称変更に失敗しました。'));
        }
    };

    const handleArchive = async (id: string, archive: boolean) => {
        try {
            await apiClient.households.update(id, { isArchived: archive });
            await fetchData();
            await refreshHouseholds();
        } catch (archiveError) {
            setError(getErrorMessage(archiveError, archive ? 'アーカイブに失敗しました。' : '復元に失敗しました。'));
        }
    };

    const buildInviteUrl = useCallback((invite: InviteLink) => (
        `${window.location.origin}/join?token=${invite.token}`
    ), []);

    const createInvite = useCallback(async (householdId: string) => {
        const { invite } = await apiClient.households.createInvite(householdId);
        return {
            inviteUrl: buildInviteUrl(invite),
            expiresAt: invite.expiresAt,
        };
    }, [buildInviteUrl]);

    const openInviteModal = async (membership: HouseholdMembership) => {
        setInviteLoadingId(membership.householdId);
        setInvitingHousehold({
            householdId: membership.householdId,
            householdName: membership.household.name,
            inviteUrl: null,
            expiresAt: null,
        });

        try {
            const invite = await createInvite(membership.householdId);
            setInvitingHousehold({
                householdId: membership.householdId,
                householdName: membership.household.name,
                inviteUrl: invite.inviteUrl,
                expiresAt: invite.expiresAt,
            });
            setError(null);
        } catch (inviteError) {
            setInvitingHousehold(null);
            setError(getErrorMessage(inviteError, '招待リンクの発行に失敗しました。'));
        } finally {
            setInviteLoadingId(null);
        }
    };

    const handleCopy = async (householdId: string, inviteUrl?: string | null) => {
        setInviteLoadingId(householdId);

        try {
            const invite = inviteUrl
                ? {
                    inviteUrl,
                    expiresAt: invitingHousehold?.householdId === householdId ? invitingHousehold.expiresAt : null,
                }
                : await createInvite(householdId);

            await navigator.clipboard.writeText(invite.inviteUrl);
            setCopiedId(householdId);
            window.setTimeout(() => setCopiedId(null), 2000);
            setError(null);

            setInvitingHousehold((current) => {
                if (!current || current.householdId !== householdId) {
                    return current;
                }

                return {
                    ...current,
                    inviteUrl: invite.inviteUrl,
                    expiresAt: invite.expiresAt ?? current.expiresAt,
                };
            });
        } catch (inviteError) {
            setError(getErrorMessage(inviteError, '招待リンクのコピーに失敗しました。'));
        } finally {
            setInviteLoadingId(null);
        }
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
                {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">参加中の家計簿</h2>
                {households.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 text-center border-2 border-dashed border-gray-200">
                        <p className="text-sm text-gray-500 mb-4">参加中の家計簿がありません</p>
                        <button onClick={() => setIsCreating(true)} className="text-indigo-600 font-bold text-sm">新しく作成する</button>
                    </div>
                ) : (
                    households.map((membership) => (
                        <div key={membership.householdId} className={`bg-white rounded-2xl shadow-sm border ${currentHouseholdId === membership.householdId ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-gray-100'} overflow-hidden transition-all`}>
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                        <h3 className="text-base font-bold text-gray-900 flex items-center">
                                            {membership.household.name}
                                            {membership.role === 'owner' && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold">オーナー</span>}
                                        </h3>
                                        <p className="text-xs text-gray-400 mt-1">
                                            <span className="font-medium">メンバー:</span> {membership.members.join(', ') || '読み込み中...'}
                                        </p>
                                    </div>
                                    <div className="flex space-x-1">
                                        <button
                                            onClick={() => void openInviteModal(membership)}
                                            disabled={inviteLoadingId === membership.householdId}
                                            className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                                            title="家族を招待"
                                        >
                                            <Share2 className="h-4 w-4" />
                                        </button>
                                        {membership.role === 'owner' && (
                                            <>
                                                <button onClick={() => setEditingHousehold({ id: membership.householdId, name: membership.household.name })} className="p-2 text-gray-300 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => void handleArchive(membership.householdId, true)} className="p-2 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Archive className="h-4 w-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center mt-5 space-x-2">
                                    <button
                                        onClick={() => setCurrentHouseholdId(membership.householdId)}
                                        disabled={currentHouseholdId === membership.householdId}
                                        className={`flex-1 flex items-center justify-center py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${currentHouseholdId === membership.householdId ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        {currentHouseholdId === membership.householdId ? '表示中' : 'この家計簿に切り替え'}
                                    </button>
                                    <button
                                        onClick={() => void handleCopy(membership.householdId)}
                                        disabled={inviteLoadingId === membership.householdId}
                                        className={`p-2.5 rounded-xl transition-all disabled:opacity-50 ${copiedId === membership.householdId ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400 hover:text-gray-600'}`}
                                        title="招待リンクをコピー"
                                    >
                                        {copiedId === membership.householdId ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
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
                                onChange={(e) => setNewHouseholdName(e.target.value)}
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
                        {archivedHouseholds.map((membership) => (
                            <div key={membership.householdId} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex justify-between items-center group">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-500">{membership.household.name}</h3>
                                    <p className="text-[10px] text-gray-400 mt-0.5">アーカイブ中</p>
                                </div>
                                <button
                                    onClick={() => void handleArchive(membership.householdId, false)}
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
                            {(user?.fullName || '名').charAt(0)}
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">ログイン中のユーザー</p>
                            <p className="text-lg font-black text-gray-800 tracking-tight">{user?.fullName || '未設定'}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => void signOut()}
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
                            onChange={(e) => setEditingHousehold({ ...editingHousehold, name: e.target.value })}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl px-5 py-4 mb-6 outline-none transition-all font-bold text-gray-800"
                            placeholder="名称"
                        />
                        <div className="flex space-x-3">
                            <button onClick={() => void handleRename()} className="flex-2 bg-indigo-600 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-indigo-200 active:scale-[0.96] transition-transform">保存</button>
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
                            <p className="text-sm text-gray-500 mb-4 text-center">「{invitingHousehold.householdName}」にメンバーを追加します</p>
                            <p className="text-xs text-gray-400 mb-8 text-center">新しい招待リンクを発行すると、前のリンクは無効になります。</p>

                            {invitingHousehold.inviteUrl ? (
                                <>
                                    <div className="bg-white p-4 rounded-3xl shadow-xl border border-gray-100 mb-6">
                                        <QRCode value={invitingHousehold.inviteUrl} size={180} />
                                    </div>

                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3">招待リンクを共有</p>
                                    <button
                                        onClick={() => void handleCopy(invitingHousehold.householdId, invitingHousehold.inviteUrl)}
                                        disabled={inviteLoadingId === invitingHousehold.householdId}
                                        className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all active:scale-[0.98] disabled:opacity-50 ${copiedId === invitingHousehold.householdId ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-indigo-100'}`}
                                    >
                                        <span className="text-xs font-bold truncate mr-2">
                                            {invitingHousehold.inviteUrl}
                                        </span>
                                        {copiedId === invitingHousehold.householdId ? <Check className="h-5 w-5 flex-shrink-0" /> : <Copy className="h-5 w-5 flex-shrink-0" />}
                                    </button>
                                    {invitingHousehold.expiresAt && (
                                        <p className="mt-3 text-xs text-gray-400 text-center">
                                            有効期限: {new Date(invitingHousehold.expiresAt).toLocaleString('ja-JP')}
                                        </p>
                                    )}
                                </>
                            ) : (
                                <div className="py-12 text-sm text-gray-400">招待リンクを発行中...</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import type { PagesFunction } from '@cloudflare/workers-types';
import { AppEnv, HttpError, buildSessionCookie, createSession, errorResponse, getDb, json, readJson, verifyPassword } from '../../../server/app';

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
    try {
        const body = await readJson<{ userId?: string; password?: string }>(context.request);
        const userId = body.userId?.trim() ?? '';
        const password = body.password ?? '';

        if (!userId || !password) {
            throw new HttpError(400, 'ユーザーIDとパスワードを入力してください。');
        }

        const user = await getDb(context.env)
            .prepare(`
                SELECT id, user_id, full_name, password_hash, password_salt
                FROM users
                WHERE user_id = ?
                LIMIT 1
            `)
            .bind(userId)
            .first<{ id: string; user_id: string; full_name: string; password_hash: string; password_salt: string }>();

        if (!user || !(await verifyPassword(password, user.password_salt, user.password_hash))) {
            throw new HttpError(401, 'ログイン情報が正しくありません。');
        }

        const sessionToken = await createSession(context.env, user.id);
        return json({
            user: {
                id: user.id,
                userId: user.user_id,
                fullName: user.full_name,
            },
        }, 200, {
            'Set-Cookie': buildSessionCookie(sessionToken),
        });
    } catch (error) {
        return errorResponse(error);
    }
};

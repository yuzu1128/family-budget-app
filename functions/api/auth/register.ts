import type { PagesFunction } from '@cloudflare/workers-types';
import { AppEnv, HttpError, buildSessionCookie, createSession, errorResponse, getDb, hashPassword, json, readJson } from '../../../server/app';

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
    try {
        const body = await readJson<{ userId?: string; password?: string; fullName?: string }>(context.request);
        const userId = body.userId?.trim() ?? '';
        const password = body.password ?? '';
        const fullName = body.fullName?.trim() ?? '';

        if (!/^[a-zA-Z0-9]+$/.test(userId)) {
            throw new HttpError(400, 'ユーザーIDは半角英数字のみ使用できます。');
        }

        if (!password) {
            throw new HttpError(400, 'パスワードを入力してください。');
        }

        if (!fullName) {
            throw new HttpError(400, '氏名を入力してください。');
        }

        const existing = await getDb(context.env)
            .prepare('SELECT id FROM users WHERE user_id = ? LIMIT 1')
            .bind(userId)
            .first();

        if (existing) {
            throw new HttpError(409, 'そのIDは既に使用されています。');
        }

        const user = {
            id: crypto.randomUUID(),
            userId,
            fullName,
            createdAt: new Date().toISOString(),
        };
        const passwordData = await hashPassword(password);

        await getDb(context.env)
            .prepare(`
                INSERT INTO users (id, user_id, full_name, password_hash, password_salt, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `)
            .bind(user.id, user.userId, user.fullName, passwordData.hash, passwordData.salt, user.createdAt)
            .run();

        const sessionToken = await createSession(context.env, user.id);
        return json({ user }, 201, {
            'Set-Cookie': buildSessionCookie(sessionToken),
        });
    } catch (error) {
        return errorResponse(error);
    }
};

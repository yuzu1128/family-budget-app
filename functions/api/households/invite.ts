import type { PagesFunction } from '@cloudflare/workers-types';
import { AppEnv, HttpError, errorResponse, getDb, json } from '../../../server/app';

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
    try {
        const token = new URL(context.request.url).searchParams.get('token');
        if (!token) {
            throw new HttpError(400, '無効な招待リンクです。');
        }

        const household = await getDb(context.env)
            .prepare('SELECT id, name FROM households WHERE id = ? LIMIT 1')
            .bind(token)
            .first<{ id: string; name: string }>();

        if (!household) {
            throw new HttpError(404, '家計簿が見つかりませんでした。');
        }

        return json({ household });
    } catch (error) {
        return errorResponse(error);
    }
};

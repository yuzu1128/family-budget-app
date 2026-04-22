import type { PagesFunction } from '@cloudflare/workers-types';
import { AppEnv, clearSessionCookie, destroySession, errorResponse, json } from '../../../server/app';

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
    try {
        await destroySession(context.env, context.request);
        return json({ ok: true }, 200, {
            'Set-Cookie': clearSessionCookie(),
        });
    } catch (error) {
        return errorResponse(error);
    }
};

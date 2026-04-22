import type { PagesFunction } from '@cloudflare/workers-types';
import { errorResponse, getSessionUser, json } from '../../../server/app';

export const onRequestGet: PagesFunction = async (context) => {
    try {
        const user = await getSessionUser(context.env, context.request);
        return json({ user });
    } catch (error) {
        return errorResponse(error);
    }
};

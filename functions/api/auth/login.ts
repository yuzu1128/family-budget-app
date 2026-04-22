import type { PagesFunction } from '@cloudflare/workers-types';
import { AppEnv, HttpError, buildSessionCookie, createSession, errorResponse, getDb, hashPassword, json, readJson, verifyPassword } from '../../../server/app';

interface LoginRow {
    id: string;
    user_id: string;
    email: string | null;
    full_name: string;
    password_hash: string;
    password_salt: string;
}

async function findUser(env: AppEnv, identifier: string) {
    return getDb(env)
        .prepare(`
            SELECT id, user_id, email, full_name, password_hash, password_salt
            FROM users
            WHERE user_id = ?
               OR LOWER(COALESCE(email, '')) = LOWER(?)
            LIMIT 1
        `)
        .bind(identifier, identifier)
        .first<LoginRow>();
}

function buildLegacyEmails(identifier: string, localEmail: string | null) {
    const emails = new Set<string>();
    const trimmed = identifier.trim().toLowerCase();

    if (localEmail) {
        emails.add(localEmail.trim().toLowerCase());
    }

    if (!trimmed) {
        return [...emails];
    }

    if (trimmed.includes('@')) {
        emails.add(trimmed);
    } else {
        emails.add(`${trimmed}@familybudget.com`);
    }

    return [...emails];
}

async function tryLegacySignIn(env: AppEnv, identifier: string, password: string, localUser: LoginRow | null) {
    if (!env.LEGACY_SUPABASE_URL || !env.LEGACY_SUPABASE_PUBLISHABLE_KEY) {
        return null;
    }

    const baseUrl = env.LEGACY_SUPABASE_URL.replace(/\/+$/, '');
    const candidateEmails = buildLegacyEmails(identifier, localUser?.email ?? null);

    for (const email of candidateEmails) {
        const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                apikey: env.LEGACY_SUPABASE_PUBLISHABLE_KEY,
                Authorization: `Bearer ${env.LEGACY_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            continue;
        }

        const payload = await response.json() as { user?: { email?: string | null } };
        const resolvedEmail = payload.user?.email?.trim().toLowerCase() ?? email;
        const migratedUser = localUser ?? await findUser(env, resolvedEmail);

        if (!migratedUser) {
            continue;
        }

        const passwordData = await hashPassword(password);
        await getDb(env)
            .prepare(`
                UPDATE users
                SET password_hash = ?, password_salt = ?, email = COALESCE(email, ?)
                WHERE id = ?
            `)
            .bind(passwordData.hash, passwordData.salt, resolvedEmail, migratedUser.id)
            .run();

        return {
            ...migratedUser,
            email: migratedUser.email ?? resolvedEmail,
            password_hash: passwordData.hash,
            password_salt: passwordData.salt,
        } satisfies LoginRow;
    }

    return null;
}

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
    try {
        const body = await readJson<{ identifier?: string; userId?: string; password?: string }>(context.request);
        const identifier = (body.identifier ?? body.userId ?? '').trim();
        const password = body.password ?? '';

        if (!identifier || !password) {
            throw new HttpError(400, 'User ID and password are required.');
        }

        let user = await findUser(context.env, identifier);

        if (!user || !(await verifyPassword(password, user.password_salt, user.password_hash))) {
            user = await tryLegacySignIn(context.env, identifier, password, user);
        }

        if (!user) {
            throw new HttpError(401, 'Invalid login credentials.');
        }

        const sessionToken = await createSession(context.env, user.id);
        return json({
            user: {
                id: user.id,
                userId: user.user_id,
                fullName: user.full_name,
                email: user.email,
            },
        }, 200, {
            'Set-Cookie': buildSessionCookie(sessionToken),
        });
    } catch (error) {
        return errorResponse(error);
    }
};

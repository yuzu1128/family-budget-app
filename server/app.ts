export interface AppUser {
    id: string;
    userId: string;
    fullName: string;
}

export interface AppEnv {
    DB: D1Database;
    RECEIPTS?: R2Bucket;
}

interface SessionRow {
    user_id: string;
    userId: string;
    full_name: string;
}

const SESSION_COOKIE = 'fb_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const PASSWORD_ITERATIONS = 100_000;
const encoder = new TextEncoder();

export class HttpError extends Error {
    status: number;
    details?: unknown;

    constructor(status: number, message: string, details?: unknown) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
        this.details = details;
    }
}

export function json(data: unknown, status = 200, headers?: HeadersInit) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'content-type': 'application/json; charset=utf-8',
            ...headers,
        },
    });
}

export function errorResponse(error: unknown) {
    if (error instanceof HttpError) {
        return json({ error: error.message, details: error.details }, error.status);
    }

    console.error('Unexpected server error:', error);
    return json({ error: 'Internal server error' }, 500);
}

export async function readJson<T>(request: Request): Promise<T> {
    try {
        return await request.json() as T;
    } catch {
        throw new HttpError(400, 'Invalid JSON body');
    }
}

export function getDb(env: AppEnv) {
    if (!env.DB) {
        throw new HttpError(500, 'D1 binding `DB` is missing.');
    }

    return env.DB;
}

export function parseCookies(request: Request) {
    const header = request.headers.get('cookie');
    if (!header) {
        return new Map<string, string>();
    }

    return new Map(
        header
            .split(';')
            .map((chunk) => chunk.trim())
            .filter(Boolean)
            .map((chunk) => {
                const separatorIndex = chunk.indexOf('=');
                const key = separatorIndex >= 0 ? chunk.slice(0, separatorIndex) : chunk;
                const value = separatorIndex >= 0 ? chunk.slice(separatorIndex + 1) : '';
                return [key, decodeURIComponent(value)] as const;
            }),
    );
}

export function buildSessionCookie(token: string) {
    return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`;
}

export function clearSessionCookie() {
    return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function randomBytes(length: number) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
}

function bytesToHex(bytes: Uint8Array) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let index = 0; index < bytes.length; index += 1) {
        bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
    }
    return bytes;
}

async function sha256Hex(value: string) {
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
    return bytesToHex(new Uint8Array(digest));
}

async function pbkdf2Hex(password: string, salt: Uint8Array) {
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits'],
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt,
            iterations: PASSWORD_ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        256,
    );

    return bytesToHex(new Uint8Array(derivedBits));
}

export async function hashPassword(password: string) {
    const salt = randomBytes(16);
    return {
        salt: bytesToHex(salt),
        hash: await pbkdf2Hex(password, salt),
    };
}

export async function verifyPassword(password: string, saltHex: string, expectedHash: string) {
    const actualHash = await pbkdf2Hex(password, hexToBytes(saltHex));
    return actualHash === expectedHash;
}

export async function createSession(env: AppEnv, userId: string) {
    const token = bytesToHex(randomBytes(32));
    const tokenHash = await sha256Hex(token);
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();

    await getDb(env)
        .prepare(`
            INSERT INTO sessions (id, token_hash, user_id, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?)
        `)
        .bind(sessionId, tokenHash, userId, new Date().toISOString(), expiresAt)
        .run();

    return token;
}

export async function destroySession(env: AppEnv, request: Request) {
    const token = parseCookies(request).get(SESSION_COOKIE);
    if (!token) {
        return;
    }

    const tokenHash = await sha256Hex(token);
    await getDb(env)
        .prepare('DELETE FROM sessions WHERE token_hash = ?')
        .bind(tokenHash)
        .run();
}

export async function getSessionUser(env: AppEnv, request: Request) {
    const token = parseCookies(request).get(SESSION_COOKIE);
    if (!token) {
        return null;
    }

    const tokenHash = await sha256Hex(token);
    const now = new Date().toISOString();
    const row = await getDb(env)
        .prepare(`
            SELECT users.id AS user_id, users.user_id AS userId, users.full_name
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token_hash = ? AND sessions.expires_at > ?
            LIMIT 1
        `)
        .bind(tokenHash, now)
        .first<SessionRow>();

    if (!row) {
        return null;
    }

    return {
        id: row.user_id,
        userId: row.userId,
        fullName: row.full_name,
    } satisfies AppUser;
}

export async function requireUser(env: AppEnv, request: Request) {
    const user = await getSessionUser(env, request);
    if (!user) {
        throw new HttpError(401, 'Authentication required');
    }

    return user;
}

export async function requireHouseholdMembership(env: AppEnv, householdId: string, userId: string) {
    const membership = await getDb(env)
        .prepare(`
            SELECT role
            FROM household_members
            WHERE household_id = ? AND user_id = ?
            LIMIT 1
        `)
        .bind(householdId, userId)
        .first<{ role: 'owner' | 'member' }>();

    if (!membership) {
        throw new HttpError(403, 'You do not have access to this household.');
    }

    return membership.role;
}

export async function requireHouseholdOwner(env: AppEnv, householdId: string, userId: string) {
    const role = await requireHouseholdMembership(env, householdId, userId);
    if (role !== 'owner') {
        throw new HttpError(403, 'Only household owners can perform this action.');
    }

    return role;
}

export function parseMonthKey(month: string | null) {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        throw new HttpError(400, 'Invalid month. Expected format: YYYY-MM');
    }

    const [yearRaw, monthRaw] = month.split('-');
    const year = Number.parseInt(yearRaw, 10);
    const monthIndex = Number.parseInt(monthRaw, 10);

    if (Number.isNaN(year) || Number.isNaN(monthIndex) || monthIndex < 1 || monthIndex > 12) {
        throw new HttpError(400, 'Invalid month value.');
    }

    const start = `${yearRaw}-${monthRaw}-01`;
    const endDate = new Date(Date.UTC(year, monthIndex, 0));
    const end = `${yearRaw}-${monthRaw}-${String(endDate.getUTCDate()).padStart(2, '0')}`;
    return { start, end };
}

export function sanitizeText(value: FormDataEntryValue | null) {
    return typeof value === 'string' ? value.trim() : '';
}

export function parseInteger(value: FormDataEntryValue | null, fieldName: string) {
    const parsed = Number.parseInt(sanitizeText(value), 10);
    if (Number.isNaN(parsed)) {
        throw new HttpError(400, `Invalid ${fieldName}`);
    }

    return parsed;
}

function sanitizeFileName(fileName: string) {
    const extension = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : '';
    if (!extension) {
        return 'bin';
    }

    return extension.replace(/[^a-z0-9]/g, '') || 'bin';
}

export async function putReceipt(env: AppEnv, householdId: string, expenseId: string, file: File) {
    if (!env.RECEIPTS) {
        throw new HttpError(503, 'R2 binding `RECEIPTS` is missing.');
    }

    const key = `${householdId}/${expenseId}.${sanitizeFileName(file.name)}`;
    await env.RECEIPTS.put(key, await file.arrayBuffer(), {
        httpMetadata: {
            contentType: file.type || 'application/octet-stream',
        },
    });

    return key;
}

export async function deleteReceipt(env: AppEnv, receiptKey: string | null | undefined) {
    if (!receiptKey || !env.RECEIPTS) {
        return;
    }

    await env.RECEIPTS.delete(receiptKey);
}

export async function getExpenseRecord(env: AppEnv, expenseId: string) {
    return getDb(env)
        .prepare(`
            SELECT id, household_id, amount, receipt_key
            FROM expenses
            WHERE id = ?
            LIMIT 1
        `)
        .bind(expenseId)
        .first<{ id: string; household_id: string; amount: number; receipt_key: string | null }>();
}

export function mapExpense(row: {
    id: string;
    amount: number;
    description: string | null;
    transaction_date: string;
    created_at: string;
    creator_name: string;
    receipt_key: string | null;
}) {
    return {
        id: row.id,
        amount: Number(row.amount),
        description: row.description ?? '',
        transactionDate: row.transaction_date,
        createdAt: row.created_at,
        creatorName: row.creator_name,
        receiptUrl: row.receipt_key ? `/api/expenses/${row.id}/receipt` : null,
    };
}

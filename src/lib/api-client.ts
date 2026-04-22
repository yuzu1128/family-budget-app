import type {
    AppUser,
    HouseholdListResponse,
    HouseholdSummary,
    JoinPreview,
    LedgerExpense,
    LedgerResponse,
    RecentExpensesResponse,
    SummaryResponse,
} from './api-types';

type JsonBody = Record<string, unknown>;

interface RequestOptions extends Omit<RequestInit, 'body'> {
    body?: BodyInit | null;
    json?: JsonBody;
}

interface SessionResponse {
    user: AppUser | null;
}

interface UserResponse {
    user: AppUser;
}

interface HouseholdResponse {
    household: HouseholdSummary;
}

interface JoinResponse {
    household: JoinPreview;
}

interface ExpenseResponse {
    expense: LedgerExpense;
}

export class ApiError extends Error {
    status: number;
    details: unknown;

    constructor(status: number, message: string, details?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.details = details;
    }
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const headers = new Headers(options.headers);
    let body = options.body ?? null;

    if (options.json !== undefined) {
        headers.set('Content-Type', 'application/json');
        body = JSON.stringify(options.json);
    }

    const response = await fetch(path, {
        credentials: 'same-origin',
        ...options,
        headers,
        body,
    });

    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        const message = typeof payload === 'object' && payload && 'error' in payload
            ? String((payload as { error: unknown }).error)
            : response.statusText;

        throw new ApiError(response.status, message || 'Request failed', payload);
    }

    return payload as T;
}

function buildExpenseFormData(payload: {
    amount: number;
    description: string;
    transactionDate: string;
    receipt?: File | null;
}) {
    const formData = new FormData();
    formData.set('amount', String(payload.amount));
    formData.set('description', payload.description);
    formData.set('transactionDate', payload.transactionDate);

    if (payload.receipt) {
        formData.set('receipt', payload.receipt);
    }

    return formData;
}

export const apiClient = {
    auth: {
        getSession() {
            return apiRequest<SessionResponse>('/api/auth/session');
        },
        login(identifier: string, password: string) {
            return apiRequest<UserResponse>('/api/auth/login', {
                method: 'POST',
                json: { identifier, password },
            });
        },
        register(userId: string, password: string, fullName: string) {
            return apiRequest<UserResponse>('/api/auth/register', {
                method: 'POST',
                json: { userId, password, fullName },
            });
        },
        logout() {
            return apiRequest<{ ok: true }>('/api/auth/logout', { method: 'POST' });
        },
    },
    households: {
        list() {
            return apiRequest<HouseholdListResponse>('/api/households');
        },
        create(name: string) {
            return apiRequest<HouseholdResponse>('/api/households', {
                method: 'POST',
                json: { name },
            });
        },
        get(householdId: string) {
            return apiRequest<HouseholdResponse>(`/api/households/${householdId}`);
        },
        update(householdId: string, payload: { name?: string; isArchived?: boolean }) {
            return apiRequest<HouseholdResponse>(`/api/households/${householdId}`, {
                method: 'PATCH',
                json: payload,
            });
        },
        getInvite(token: string) {
            return apiRequest<JoinResponse>(`/api/households/invite?token=${encodeURIComponent(token)}`);
        },
        join(householdId: string) {
            return apiRequest<HouseholdResponse>(`/api/households/${householdId}/join`, {
                method: 'POST',
            });
        },
        getLedger(householdId: string, month: string) {
            return apiRequest<LedgerResponse>(`/api/households/${householdId}/ledger?month=${encodeURIComponent(month)}`);
        },
        getSummary(householdId: string, month: string) {
            return apiRequest<SummaryResponse>(`/api/households/${householdId}/summary?month=${encodeURIComponent(month)}`);
        },
        getRecentExpenses(householdId: string, limit = 100) {
            return apiRequest<RecentExpensesResponse>(`/api/households/${householdId}/expenses?limit=${limit}`);
        },
        adjustBalance(householdId: string, mode: 'add' | 'set', amount: number) {
            return apiRequest<{ ok: true }>(`/api/households/${householdId}/balance`, {
                method: 'POST',
                json: { mode, amount },
            });
        },
    },
    expenses: {
        create(householdId: string, payload: {
            amount: number;
            description: string;
            transactionDate: string;
            receipt?: File | null;
        }) {
            return apiRequest<ExpenseResponse>(`/api/households/${householdId}/expenses`, {
                method: 'POST',
                body: buildExpenseFormData(payload),
            });
        },
        update(expenseId: string, payload: {
            amount: number;
            description: string;
            transactionDate: string;
            receipt?: File | null;
        }) {
            return apiRequest<ExpenseResponse>(`/api/expenses/${expenseId}`, {
                method: 'PATCH',
                body: buildExpenseFormData(payload),
            });
        },
        delete(expenseId: string) {
            return apiRequest<{ ok: true }>(`/api/expenses/${expenseId}`, {
                method: 'DELETE',
            });
        },
        receiptUrl(expenseId: string) {
            return `/api/expenses/${expenseId}/receipt`;
        },
    },
};

export function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof ApiError) {
        return error.message || fallback;
    }

    if (error instanceof Error) {
        return error.message || fallback;
    }

    return fallback;
}

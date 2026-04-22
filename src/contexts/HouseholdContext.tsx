import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../lib/api-client';
import type { HouseholdMembership } from '../lib/api-types';
import { useAuth } from './AuthContext';

interface HouseholdContextType {
    currentHouseholdId: string | null;
    memberships: HouseholdMembership[];
    setCurrentHouseholdId: (id: string | null) => void;
    refreshHouseholds: () => Promise<void>;
    isLoading: boolean;
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

export const HouseholdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [currentHouseholdId, setCurrentHouseholdIdState] = useState<string | null>(null);
    const [memberships, setMemberships] = useState<HouseholdMembership[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const setCurrentHouseholdId = useCallback((id: string | null) => {
        setCurrentHouseholdIdState(id);

        if (!user) {
            return;
        }

        if (id) {
            localStorage.setItem(`last_household_${user.id}`, id);
        } else {
            localStorage.removeItem(`last_household_${user.id}`);
        }
    }, [user]);

    const refreshHouseholds = useCallback(async () => {
        if (!user) {
            setMemberships([]);
            setCurrentHouseholdIdState(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const { activeHouseholds } = await apiClient.households.list();
            setMemberships(activeHouseholds);

            const savedId = localStorage.getItem(`last_household_${user.id}`);
            const isValidSavedId = activeHouseholds.some((membership) => membership.householdId === savedId);

            if (isValidSavedId) {
                setCurrentHouseholdIdState(savedId);
            } else if (activeHouseholds.length > 0) {
                const firstHouseholdId = activeHouseholds[0].householdId;
                setCurrentHouseholdIdState(firstHouseholdId);
                localStorage.setItem(`last_household_${user.id}`, firstHouseholdId);
            } else {
                setCurrentHouseholdIdState(null);
                localStorage.removeItem(`last_household_${user.id}`);
            }
        } catch (error) {
            console.error('Failed to fetch households:', error);
            setMemberships([]);
            setCurrentHouseholdIdState(null);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void refreshHouseholds();
    }, [refreshHouseholds]);

    const value = useMemo(() => ({
        currentHouseholdId,
        memberships,
        setCurrentHouseholdId,
        refreshHouseholds,
        isLoading,
    }), [currentHouseholdId, isLoading, memberships, refreshHouseholds, setCurrentHouseholdId]);

    return (
        <HouseholdContext.Provider value={value}>
            {children}
        </HouseholdContext.Provider>
    );
};

export const useHousehold = () => {
    const context = useContext(HouseholdContext);
    if (context === undefined) {
        throw new Error('useHousehold must be used within a HouseholdProvider');
    }
    return context;
};

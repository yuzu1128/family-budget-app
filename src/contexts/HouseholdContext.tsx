import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface HouseholdContextType {
    currentHouseholdId: string | null;
    setCurrentHouseholdId: (id: string | null) => void;
    refreshHouseholds: () => Promise<void>;
    isLoading: boolean;
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

export const HouseholdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [currentHouseholdId, setCurrentHouseholdIdState] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const setCurrentHouseholdId = (id: string | null) => {
        setCurrentHouseholdIdState(id);
        if (id) {
            localStorage.setItem(`last_household_${user?.id}`, id);
        }
    };

    const refreshHouseholds = async () => {
        if (!user) {
            setCurrentHouseholdIdState(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const { data: memberships } = await supabase
                .from('household_members')
                .select('household_id, households(is_archived)')
                .eq('user_id', user.id);

            const activeHouseholds = memberships?.filter(m => !(m.households as any)?.is_archived) || [];

            const savedId = localStorage.getItem(`last_household_${user.id}`);
            const isValidSavedId = activeHouseholds.some(m => m.household_id === savedId);

            if (isValidSavedId) {
                setCurrentHouseholdIdState(savedId);
            } else if (activeHouseholds.length > 0) {
                setCurrentHouseholdIdState(activeHouseholds[0].household_id);
            } else {
                setCurrentHouseholdIdState(null);
            }
        } catch (err) {
            console.error('Failed to fetch households:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshHouseholds();
    }, [user]);

    return (
        <HouseholdContext.Provider value={{ currentHouseholdId, setCurrentHouseholdId, refreshHouseholds, isLoading }}>
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

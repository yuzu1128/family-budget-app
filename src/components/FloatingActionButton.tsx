import { Plus } from 'lucide-react';

interface FloatingActionButtonProps {
    onClick: () => void;
}

export default function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
    return (
        <button
            onClick={onClick}
            className="md:hidden fixed bottom-20 right-4 bg-indigo-600 text-white rounded-full p-4 shadow-lg hover:bg-indigo-700 transition-transform active:scale-95 z-50 flex items-center justify-center"
            aria-label="Add Expense"
        >
            <Plus className="h-8 w-8" />
        </button>
    );
}

import React, { createContext, useCallback, useContext, useState } from "react";

export type LocationEntry = {
	id: string;
	latitude: number;
	longitude: number;
	accuracy: number | null;
	timestamp: string; // ISO string
};

type LocationHistoryContextValue = {
	entries: LocationEntry[];
	addEntry: (entry: Omit<LocationEntry, "id">) => void;
	clearHistory: () => void;
};

const LocationHistoryContext =
	createContext<LocationHistoryContextValue | null>(null);

function makeId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function LocationHistoryProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [entries, setEntries] = useState<LocationEntry[]>([]);

	const addEntry = useCallback((entry: Omit<LocationEntry, "id">) => {
		setEntries((prev) => [{ ...entry, id: makeId() }, ...prev]);
	}, []);

	const clearHistory = useCallback(() => setEntries([]), []);

	const value: LocationHistoryContextValue = {
		entries,
		addEntry,
		clearHistory,
	};

	return (
		<LocationHistoryContext.Provider value={value}>
			{children}
		</LocationHistoryContext.Provider>
	);
}

export function useLocationHistory(): LocationHistoryContextValue {
	const ctx = useContext(LocationHistoryContext);
	if (!ctx) {
		throw new Error(
			"useLocationHistory must be used within LocationHistoryProvider",
		);
	}
	return ctx;
}

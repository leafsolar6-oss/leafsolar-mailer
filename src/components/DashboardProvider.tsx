'use client';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { CampaignStats } from '@/types';

interface AppContextType {
  refreshKey: number;
  triggerRefresh: () => void;
  stats: CampaignStats | null;
  setStats: (s: CampaignStats | null) => void;
}

const AppContext = createContext<AppContextType>({
  refreshKey: 0,
  triggerRefresh: () => {},
  stats: null,
  setStats: () => {},
});

export function DashboardsProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState<CampaignStats | null>(null);

  const triggerRefresh = useCallback(() => setRefreshKey(k => k + 1), []);

  return (
    <AppContext.Provider value={{ refreshKey, triggerRefresh, stats, setStats }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);

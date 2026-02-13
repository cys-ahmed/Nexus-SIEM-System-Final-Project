import { useState, useEffect } from 'react';
import { syncManager, AppState } from '@/lib/syncManager';

export const useAuth = () => {
  const [state, setState] = useState<AppState>(syncManager.getState());

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((newState) => {
      setState(newState);
    });

    return () => unsubscribe();
  }, []);

  return {
    ...state,
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    role: state.user?.role,
    isAdmin: state.user?.role?.toLowerCase() === 'admin',
    isAnalyst: state.user?.role?.toLowerCase() === 'analyst',
  };
};

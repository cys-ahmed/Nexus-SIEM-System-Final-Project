type Listener<T> = (state: T) => void;

class SyncManager<T> {
  private state: T;
  private readonly listeners: Set<Listener<T>>;

  constructor(initialState: T) {
    this.state = initialState;
    this.listeners = new Set();
  }

  getState(): T {
    return this.state;
  }

  setState(newState: Partial<T> | ((prevState: T) => Partial<T>)) {
    const nextState =
      typeof newState === 'function'
        ? (newState as (prevState: T) => Partial<T>)(this.state)
        : newState;

    this.state = { ...this.state, ...nextState };
    this.notify();
  }

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.state));
  }
}


export interface AppState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  userStatus: Record<number, 'active' | 'inactive'>;
  deviceStatus: Record<string, 'Online' | 'Offline'>;
}

export interface User {
  email: string;
  role?: string;
  user_id?: number;
  username?: string;
  last_login?: string;
}


const STORAGE_KEY = '__nexus_auth_state__';
let saved: Partial<AppState> = {};
try {
  const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      saved = {
        user: parsed.user ?? null,
        token: parsed.token ?? null,
        isAuthenticated: parsed.isAuthenticated ?? false,
      };
    }
  }
} catch (e) {
  console.error("Failed to restore auth state:", e);
}

const initialState: AppState = {
  user: null,
  token: null,
  isAuthenticated: false,
  userStatus: {},
  deviceStatus: {},
};

export const syncManager = new SyncManager<AppState>(initialState);

syncManager.subscribe((state) => {
  try {
    const toSave = {
      user: state.user,
      token: state.token,
      isAuthenticated: state.isAuthenticated,
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    }
  } catch (e) {
    console.error("Failed to save auth state:", e);
  }
});

if (saved && (saved.user || saved.token || saved.isAuthenticated)) {
  syncManager.setState({
    user: saved.user ?? null,
    token: saved.token ?? null,
    isAuthenticated: !!saved.isAuthenticated,
  });
}

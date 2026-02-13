import { syncManager, User } from "./syncManager";

export const login = async (
  email: string,
  password: string
): Promise<{ success: boolean; requiresMFA?: boolean; email?: string; error?: string }> => {
  try {
    const API_URL = import.meta.env.VITE_API_URL || '/api';
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.error || 'Login failed' };
    }

    const data = await response.json();

    if (data.success && data.requiresMFA) {
      return {
        success: true,
        requiresMFA: true,
        email: data.email
      };
    }

    if (data.success && data.token && data.user) {
      const userData: User = {
        email: data.user.email,
        role: data.user.role,
        user_id: data.user.user_id,
        username: data.user.username,
        last_login: data.user.last_login
      };

      syncManager.setState((prev) => ({
        user: userData,
        token: data.token,
        isAuthenticated: true,
        userStatus: {
          ...prev.userStatus,
          [userData.user_id]: 'active'
        }
      }));

      return { success: true, requiresMFA: false };
    }

    return { success: false, error: 'Invalid response from server' };
  } catch (error) {
    console.error("Login failed:", error);
    return { success: false, error: 'Network error occurred' };
  }
};


export const verifyMFA = async (
  email: string,
  pin: string
): Promise<boolean> => {
  try {
    const API_URL = import.meta.env.VITE_API_URL || '/api';
    const response = await fetch(`${API_URL}/auth/verify-mfa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pin })
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();

    if (data.success && data.user && data.token) {
      const userData: User = {
        email: data.user.email,
        role: data.user.role,
        user_id: data.user.user_id,
        username: data.user.username,
        last_login: data.user.last_login
      };

      
      syncManager.setState((prev) => ({
        user: userData,
        token: data.token,
        isAuthenticated: true,
        userStatus: {
          ...prev.userStatus,
          [userData.user_id]: 'active'
        }
      }));

      return true;
    }

    return false;
  } catch (error) {
    console.error("Verify MFA failed:", error);
    return false;
  }
};

export const logout = (): void => {
  localStorage.removeItem("last_path");
  syncManager.setState((prev) => {
    const currentId = prev.user?.user_id;
    const nextUserStatus = { ...prev.userStatus };
    if (typeof currentId === 'number') {
      nextUserStatus[currentId] = 'inactive';
    }
    return {
      user: null,
      token: null,
      isAuthenticated: false,
      userStatus: nextUserStatus
    };
  });
};

export const getCurrentUser = (): User | null => {
  return syncManager.getState().user;
};

export const getToken = (): string | null => {
  return syncManager.getState().token;
};

export const getUserRole = (): string | null => {
  const user = getCurrentUser();
  return user?.role || null;
};

export const isAdmin = (): boolean => {
  const role = getUserRole();
  return role?.toLowerCase() === 'admin';
};

export const isAnalyst = (): boolean => {
  const role = getUserRole();
  return role?.toLowerCase() === 'analyst';
};

export const getAuthHeaders = (contentType: string | null = 'application/json'): HeadersInit => {
  const token = getToken();
  const headers: Record<string, string> = {};

  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

export const isAuthenticated = (): boolean => {
  return syncManager.getState().isAuthenticated;
};

export const forgotPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const API_URL = import.meta.env.VITE_API_URL || '/api';
    const frontendUrl = globalThis.location.origin;
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, frontendUrl })
    });

    const data = await response.json();

    if (data.success) {
      return { success: true };
    } else {
      return { success: false, error: data.error || 'Failed to send reset email' };
    }
  } catch (error) {
    console.error("Forgot password failed:", error);
    return { success: false, error: 'An error occurred. Please try again.' };
  }
};

export const resetPassword = async (
  email: string,
  otpCode: string,
  newPassword: string,
  confirmPassword: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const API_URL = import.meta.env.VITE_API_URL || '/api';
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otpCode, newPassword, confirmPassword })
    });

    const data = await response.json();

    if (data.success) {
      return { success: true };
    } else {
      return { success: false, error: data.error || 'Failed to reset password' };
    }
  } catch (error) {
    console.error("Reset password failed:", error);
    return { success: false, error: 'An error occurred. Please try again.' };
  }
};

export const changePassword = async (
  oldPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const API_URL = import.meta.env.VITE_API_URL || '/api';
    const response = await fetch(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ oldPassword, newPassword, confirmPassword })
    });

    const data = await response.json();

    if (data.success) {
      return { success: true };
    } else {
      return { success: false, error: data.error || 'Failed to update password' };
    }
  } catch (error) {
    console.error("Change password failed:", error);
    return { success: false, error: 'An error occurred. Please try again.' };
  }
};

export const adminResetPassword = async (
  email: string,
  newPassword: string,
  confirmPassword: string,
  adminPassword: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const API_URL = import.meta.env.VITE_API_URL || '/api';
    const response = await fetch(`${API_URL}/auth/admin/reset-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, newPassword, confirmPassword, adminPassword })
    });

    const data = await response.json();

    if (data.success) {
      return { success: true };
    } else {
      return { success: false, error: data.error || 'Failed to reset password' };
    }
  } catch (error) {
    console.error("Admin reset password failed:", error);
    return { success: false, error: 'An error occurred. Please try again.' };
  }
};

export const resendMFA = async (email: string): Promise<{ success: boolean; pin?: string; error?: string }> => {
  try {
    const API_URL = import.meta.env.VITE_API_URL || '/api';
    const response = await fetch(`${API_URL}/auth/resend-mfa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await response.json();
    if (response.ok && data.success) {
      return { success: true, pin: data.pin };
    }
    return { success: false, error: data.error || 'Failed to resend PIN' };
  } catch (error) {
    console.error("Resend MFA failed:", error);
    return { success: false, error: 'Network error occurred' };
  }
};

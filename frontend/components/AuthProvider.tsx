"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { authAPI } from "@/lib/api";

const getTokenExpiry = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setUser, user } = useStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        } catch {
          localStorage.removeItem("user");
        }
      }
    }
  }, [user, setUser]);

  useEffect(() => {
    const checkAndRefresh = async () => {
      if (typeof window === 'undefined') return;

      const token = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');

      if (!token || !refreshToken) return;

      const expiry = getTokenExpiry(token);
      if (!expiry) return;

      const now = Date.now();
      const timeUntilExpiry = expiry - now;
      const refreshBefore = 6 * 60 * 1000;

      if (timeUntilExpiry <= refreshBefore) {
        try {
          await authAPI.refresh(refreshToken);
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    };

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(checkAndRefresh, 5 * 60 * 1000);
    checkAndRefresh();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user]);

  return <>{children}</>;
}

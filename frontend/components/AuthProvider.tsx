"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setUser, user } = useStore();

  useEffect(() => {
    // Only load from localStorage if user is not already set
    if (!user) {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        } catch {
          // Invalid JSON, clear it
          localStorage.removeItem("user");
        }
      }
    }
  }, [user, setUser]);

  return <>{children}</>;
}

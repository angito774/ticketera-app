import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { User } from "@/modules/account/services/auth.service";

interface SessionState {
  /** Sesión simulada en el navegador (mock): no es autenticación real. */
  user: User | null;
  /** Cuentas creadas en este navegador (sin contraseña). */
  registeredUsers: User[];
  signIn: (user: User) => void;
  /** Guarda la cuenta nueva e inicia su sesión. */
  signUp: (user: User) => void;
  signOut: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      registeredUsers: [],
      signIn: (user) => set({ user }),
      signUp: (user) =>
        set((state) => ({
          user,
          registeredUsers: [...state.registeredUsers.filter((item) => item.email !== user.email), user],
        })),
      signOut: () => set({ user: null }),
    }),
    {
      name: "ticketera-session",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ user, registeredUsers }) => ({ user, registeredUsers }),
    }
  )
);

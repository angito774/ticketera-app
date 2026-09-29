import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { OrganizerEvent } from "@/modules/organizer/types/organizer.types";

interface OrganizerState {
  /** Eventos creados o editados en el panel (datos mock en el navegador). */
  savedEvents: OrganizerEvent[];
  /** Crea o reemplaza (por id) un evento. */
  saveEvent: (event: OrganizerEvent) => void;
}

export const useOrganizerStore = create<OrganizerState>()(
  persist(
    (set) => ({
      savedEvents: [],
      saveEvent: (event) =>
        set((state) => ({
          savedEvents: [...state.savedEvents.filter((item) => item.id !== event.id), event],
        })),
    }),
    {
      name: "ticketera-organizer",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ savedEvents }) => ({ savedEvents }),
    }
  )
);

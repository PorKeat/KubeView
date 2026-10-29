import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HelmRepository } from "@kubeview/contracts";

interface HelmState {
  repositories: HelmRepository[];
  selectedRepositoryId: string | null;
  addRepository: (name: string, url: string) => HelmRepository;
  removeRepository: (id: string) => void;
  selectRepository: (id: string | null) => void;
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `helm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useHelmStore = create<HelmState>()(
  persist(
    (set) => ({
      repositories: [],
      selectedRepositoryId: null,
      addRepository: (name, url) => {
        const repository: HelmRepository = {
          id: createId(),
          name: name.trim(),
          url: url.trim(),
        };
        set((state) => ({
          repositories: [repository, ...state.repositories],
          selectedRepositoryId: repository.id,
        }));
        return repository;
      },
      removeRepository: (id) =>
        set((state) => ({
          repositories: state.repositories.filter((repo) => repo.id !== id),
          selectedRepositoryId:
            state.selectedRepositoryId === id
              ? (state.repositories.find((repo) => repo.id !== id)?.id ?? null)
              : state.selectedRepositoryId,
        })),
      selectRepository: (id) => set({ selectedRepositoryId: id }),
    }),
    {
      name: "kubeview-helm",
      skipHydration: true,
      partialize: (state) => ({
        repositories: state.repositories,
        selectedRepositoryId: state.selectedRepositoryId,
      }),
    },
  ),
);

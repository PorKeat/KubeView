import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HelmRepository } from "@kubeview/contracts";

interface HelmState {
  repositories: HelmRepository[];
  selectedRepositoryId: string | null;
  /** Last-used chart repository per release, keyed by namespace/name. */
  releaseRepositories: Record<string, string>;
  addRepository: (name: string, url: string) => HelmRepository;
  removeRepository: (id: string) => void;
  selectRepository: (id: string | null) => void;
  rememberReleaseRepository: (
    namespace: string,
    name: string,
    url: string,
  ) => void;
}

function releaseKey(namespace: string, name: string): string {
  return `${namespace}/${name}`;
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
      releaseRepositories: {},
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
      rememberReleaseRepository: (namespace, name, url) => {
        const trimmed = url.trim();
        if (!namespace || !name || !trimmed) return;
        set((state) => ({
          releaseRepositories: {
            ...state.releaseRepositories,
            [releaseKey(namespace, name)]: trimmed,
          },
        }));
      },
    }),
    {
      name: "kubeview-helm",
      skipHydration: true,
      partialize: (state) => ({
        repositories: state.repositories,
        selectedRepositoryId: state.selectedRepositoryId,
        releaseRepositories: state.releaseRepositories,
      }),
    },
  ),
);

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type EnvTag = "prod" | "staging" | "dev" | "other";

export const ENV_TAG_OPTIONS: { value: EnvTag; label: string }[] = [
  { value: "prod", label: "Production" },
  { value: "staging", label: "Staging" },
  { value: "dev", label: "Development" },
  { value: "other", label: "Other" },
];

export interface CatalogLink {
  id: string;
  label: string;
  url: string;
  contextName?: string;
}

export interface CatalogLinkInput {
  label: string;
  url: string;
  contextName?: string;
}

interface CatalogState {
  pinned: string[];
  tags: Record<string, EnvTag>;
  images: Record<string, string>;
  aliases: Record<string, string>;
  links: CatalogLink[];
  togglePin: (contextName: string) => void;
  setTag: (contextName: string, tag: EnvTag | null) => void;
  setContextImage: (contextName: string, image: string | null) => void;
  setContextAlias: (contextName: string, alias: string | null) => void;
  addLink: (input: CatalogLinkInput) => CatalogLink;
  updateLink: (id: string, input: CatalogLinkInput) => void;
  removeLink: (id: string) => void;
}

function createLinkId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function inferEnvTag(name: string): EnvTag {
  const lower = name.toLowerCase();
  if (/(^|[^a-z])(prod|prd|production)([^a-z]|$)/.test(lower)) return "prod";
  if (/(^|[^a-z])(stag|stg|stage|staging)([^a-z]|$)/.test(lower))
    return "staging";
  if (/(^|[^a-z])(dev|develop|development)([^a-z]|$)/.test(lower)) return "dev";
  return "other";
}

export function resolveEnvTag(
  tags: Record<string, EnvTag>,
  contextName: string,
): EnvTag {
  return tags[contextName] ?? inferEnvTag(contextName);
}

export const useCatalogStore = create<CatalogState>()(
  persist(
    (set) => ({
      pinned: [],
      tags: {},
      images: {},
      aliases: {},
      links: [],
      togglePin: (contextName) =>
        set((state) => ({
          pinned: state.pinned.includes(contextName)
            ? state.pinned.filter((name) => name !== contextName)
            : [...state.pinned, contextName],
        })),
      setTag: (contextName, tag) =>
        set((state) => {
          const tags = { ...state.tags };
          if (tag) tags[contextName] = tag;
          else delete tags[contextName];
          return { tags };
        }),
      setContextImage: (contextName, image) =>
        set((state) => {
          const images = { ...state.images };
          if (image) images[contextName] = image;
          else delete images[contextName];
          return { images };
        }),
      setContextAlias: (contextName, alias) =>
        set((state) => {
          const aliases = { ...state.aliases };
          const value = alias?.trim();
          if (value) aliases[contextName] = value;
          else delete aliases[contextName];
          return { aliases };
        }),
      addLink: (input) => {
        const link: CatalogLink = {
          id: createLinkId(),
          label: input.label.trim(),
          url: input.url.trim(),
          contextName: input.contextName,
        };
        set((state) => ({ links: [link, ...state.links] }));
        return link;
      },
      updateLink: (id, input) =>
        set((state) => ({
          links: state.links.map((link) =>
            link.id === id
              ? {
                  ...link,
                  label: input.label.trim(),
                  url: input.url.trim(),
                  contextName: input.contextName,
                }
              : link,
          ),
        })),
      removeLink: (id) =>
        set((state) => ({
          links: state.links.filter((link) => link.id !== id),
        })),
    }),
    {
      name: "kubeview-catalog",
      // Hydrate after mount so server-prerendered markup and the first client
      // render agree; pinned order and tags then apply immediately.
      skipHydration: true,
      partialize: (state) => ({
        pinned: state.pinned,
        tags: state.tags,
        images: state.images,
        aliases: state.aliases,
        links: state.links,
      }),
    },
  ),
);

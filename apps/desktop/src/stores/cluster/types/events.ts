export interface EventListenersSlice {
  initEventListener: () => Promise<() => void>;
}

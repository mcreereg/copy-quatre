const store = new Map<string, string>();

export function resetPreferencesMock(): void {
  store.clear();
}

export const Preferences = {
  async get({ key }: { key: string }) {
    return { value: store.get(key) ?? null };
  },
  async set({ key, value }: { key: string; value: string }) {
    store.set(key, value);
  },
  async remove({ key }: { key: string }) {
    store.delete(key);
  },
};

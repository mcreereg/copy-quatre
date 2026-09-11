const store = new Map<string, string>();
const operations: string[] = [];

export function resetPreferencesMock(): void {
  store.clear();
  operations.length = 0;
}

export function getPreferenceOperations(): string[] {
  return [...operations];
}

export function clearPreferenceOperations(): void {
  operations.length = 0;
}

export const Preferences = {
  async get({ key }: { key: string }) {
    return { value: store.get(key) ?? null };
  },
  async set({ key, value }: { key: string; value: string }) {
    operations.push(`set:${key}`);
    store.set(key, value);
  },
  async remove({ key }: { key: string }) {
    operations.push(`remove:${key}`);
    store.delete(key);
  },
};

import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContextStore {
  actor?: string;
  ip?: string;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContextStore>();

export class RequestContext {
  static run<T>(store: RequestContextStore, callback: () => T): T {
    return asyncLocalStorage.run(store, callback);
  }

  static getActor(): string {
    return asyncLocalStorage.getStore()?.actor || 'system';
  }

  static getIp(): string | undefined {
    return asyncLocalStorage.getStore()?.ip;
  }

  static setActor(actor: string): void {
    const store = asyncLocalStorage.getStore();
    if (store) {
      store.actor = actor;
    }
  }
}

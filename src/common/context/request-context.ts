import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContextStore {
  userId?: number;
  ip?: string;
  tenantSlug?: string;
  dbName?: string;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContextStore>();

export class RequestContext {
  static run<T>(store: RequestContextStore, callback: () => T): T {
    return asyncLocalStorage.run(store, callback);
  }

  static getUserId(): number | undefined {
    return asyncLocalStorage.getStore()?.userId;
  }

  static getIp(): string | undefined {
    return asyncLocalStorage.getStore()?.ip;
  }

  static getTenantSlug(): string | undefined {
    return asyncLocalStorage.getStore()?.tenantSlug;
  }

  static getDbName(): string | undefined {
    return asyncLocalStorage.getStore()?.dbName;
  }

  static setUserId(userId: number): void {
    const store = asyncLocalStorage.getStore();
    if (store) {
      store.userId = userId;
    }
  }

  static setTenant(tenantSlug: string, dbName: string): void {
    const store = asyncLocalStorage.getStore();
    if (store) {
      store.tenantSlug = tenantSlug;
      store.dbName = dbName;
    }
  }

  static setDbName(dbName: string): void {
    const store = asyncLocalStorage.getStore();
    if (store) {
      store.dbName = dbName;
    }
  }
}

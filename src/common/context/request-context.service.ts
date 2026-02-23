import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { RequestData } from '../types/common.types';

const storage = new AsyncLocalStorage<RequestData>();

@Injectable()
export class RequestContextService {
  run(data: RequestData, callback: () => void): void {
    storage.run(data, callback);
  }

  private get _data(): RequestData {
    return storage.getStore() ?? {};
  }

  public setData(data: RequestData): void {
    const store = storage.getStore();
    if (store) {
      Object.assign(store, data);
    }
  }

  public getCurrentUser(): string | undefined {
    return this._data.currentUser;
  }

  public getIsExcel(): boolean | undefined {
    return this._data.isExcel;
  }

  public getSystem(): number | undefined {
    return this._data.systemUsed;
  }
}

import { Injectable, Scope } from '@nestjs/common';
import { RequestData } from '../types/common.types';

@Injectable({ scope: Scope.REQUEST })
export class RequestContextService {
  private _data: RequestData = {};

  // Setters
  public setData(data: RequestData): void {
    this._data = data;
  }

  // Getters
  public getCurrentUser(): string | undefined {
    return this._data.currentUser;
  }

  public getIsExcel(): boolean | undefined {
    return this._data.isExcel;
  }
}

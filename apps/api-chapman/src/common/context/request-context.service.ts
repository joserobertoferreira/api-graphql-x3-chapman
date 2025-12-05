import { RequestData } from '@chapman/shared-types';
import { Injectable, Scope } from '@nestjs/common';

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

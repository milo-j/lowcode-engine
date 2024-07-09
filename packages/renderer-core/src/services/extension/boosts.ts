import { createDecorator, Provide, type StringDictionary } from '@alilc/lowcode-shared';
import { isObject } from 'lodash-es';
import { ICodeRuntime, ICodeRuntimeService } from '../code-runtime';
import { IRuntimeUtilService } from '../runtimeUtilService';
import { IRuntimeIntlService } from '../runtimeIntlService';

export type IBoosts<Extends> = IBoostsApi & Extends & { [key: string]: any };

export interface IBoostsApi {
  readonly codeRuntime: ICodeRuntime;

  readonly intl: Pick<IRuntimeIntlService, 't' | 'setLocale' | 'getLocale' | 'addTranslations'>;

  readonly util: Pick<IRuntimeUtilService, 'add' | 'remove'>;
  /**
   * 允许插件挂载额外的对象在 boosts 上，方便其他插件使用
   */
  temporaryUse(name: string, value: any): void;
}

/**
 * 提供了与运行时交互的接口
 */
export interface IBoostsService {
  extend(name: string, value: any, force?: boolean): void;
  extend(value: StringDictionary, force?: boolean): void;

  toExpose<Extends>(): IBoosts<Extends>;
}

export const IBoostsService = createDecorator<IBoostsService>('boostsService');

@Provide(IBoostsService)
export class BoostsService implements IBoostsService {
  private builtInApis: IBoostsApi;

  private extendsValue: StringDictionary = {};

  private _expose: any;

  constructor(
    @ICodeRuntimeService codeRuntimeService: ICodeRuntimeService,
    @IRuntimeIntlService private runtimeIntlService: IRuntimeIntlService,
    @IRuntimeUtilService private runtimeUtilService: IRuntimeUtilService,
  ) {
    this.builtInApis = {
      get codeRuntime() {
        return codeRuntimeService.rootRuntime;
      },
      intl: this.runtimeIntlService,
      util: this.runtimeUtilService,
      temporaryUse: (name, value) => {
        this.extend(name, value);
      },
    };
  }

  extend(name: string, value: any, force?: boolean | undefined): void;
  extend(value: StringDictionary, force?: boolean | undefined): void;
  extend(name: string | StringDictionary, value?: any, force?: boolean | undefined): void {
    if (typeof name === 'string') {
      if (force) {
        this.extendsValue[name] = value;
      } else {
        if (!this.extendsValue[name]) {
          this.extendsValue[name] = value;
        } else {
          console.warn(`${name} is exist`);
        }
      }
    } else if (isObject(name)) {
      Object.keys(name).forEach((key) => {
        this.extend(key, name[key], value);
      });
    }
  }

  toExpose<Extends>(): IBoosts<Extends> {
    if (!this._expose) {
      this._expose = new Proxy(this.builtInApis, {
        get: (_, p, receiver) => {
          return (
            Reflect.get(this.builtInApis, p, receiver) ||
            Reflect.get(this.extendsValue, p, receiver)
          );
        },
        set() {
          return false;
        },
        has: (_, p) => {
          return Reflect.has(this.builtInApis, p) || Reflect.has(this.extendsValue, p);
        },
      });
    }

    return this._expose;
  }
}

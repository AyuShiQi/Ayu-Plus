/**
 * 这里是数据劫持流程
 */
import { activeFn } from './register'

// reactive的实现
export const reactive = (data: object): object => {
    const proxyObj = new Proxy(data, {
        get(target: object, key: any): object {
            if(!activeFn) return Reflect.get(target, key)
            // 找寻deps的过程
            return Reflect.get(target, key)
        },
        set(target: object, key: any, value: any): boolean {
            return Reflect.set(target, key, value)
        }
    })
    return proxyObj
}

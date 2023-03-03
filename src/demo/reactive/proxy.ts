/**
 * 这里是数据劫持流程
 */
import { activeFn, deps } from './register'
import type { ActiveFn } from './register'

// 副作用函数储存追踪
const track = (target: object, key: any): void => {
    if(!activeFn) return
    // 找obj
    let dep = deps.get(target)
    if(!dep) deps.set(target, (dep = new Map<string, Set<ActiveFn>>()))
    let bucket = dep.get(key)
    if(!bucket) dep.set(key, (bucket = new Set<ActiveFn>()))
    bucket.add(activeFn)
}
// 触发副作用函数
const trigger = (target: object, key: any): void => {
    let dep = deps.get(target)
    if(!dep) return
    let bucket = dep.get(key)
    if(!bucket) return
    bucket.forEach(item => {
        if(item) item()
    })
}
// reactive的实现
export const reactive = (data: object): object => {
    const proxyObj = new Proxy(data, {
        get(target: object, key: any): object {
            // 找寻deps的过程
            track(target, key)
            return Reflect.get(target, key)
        },
        set(target: object, key: any, value: any): boolean {
            const res = Reflect.set(target, key, value)
            if(!res) return false
            trigger(target, key)
            return true
        }
    })
    return proxyObj
}
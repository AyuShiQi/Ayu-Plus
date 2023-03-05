/**
 * 这里是数据劫持流程
 */
import { activeFn, deps } from './register'
import type { EffectFn } from './register'

// 副作用函数储存追踪
export const track = (target: object, key: any): void => {
    if(!activeFn) return
    // 找obj
    let dep = deps.get(target)
    if(!dep) deps.set(target, (dep = new Map<string, Set<EffectFn>>()))
    let bucket = dep.get(key)
    if(!bucket) dep.set(key, (bucket = new Set<EffectFn>()))
    bucket.add(activeFn)
    // 在这个地方要把当前的bucket添加进函数的dep名单中
    activeFn.deps.push(bucket)
}
// 触发副作用函数
export const trigger = (target: object, key: any): void => {
    let dep = deps.get(target)
    if(!dep) return
    let bucket = dep.get(key)
    // if(!bucket) return 改成下面更好
    // 为了保证当前迭代是准确的(因为底层正在进行删除bucket中对应fn的过程)，复制一份新的bucket集合
    const nowBucket = new Set<EffectFn>(bucket)
    nowBucket && nowBucket.forEach(item => {
        if(item === activeFn) return
        if(item.options.scheduler)
        item.options.scheduler(item)
        else item()
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
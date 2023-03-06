/**
 * 这里是数据劫持流程
 */
import { activeFn, deps, effect, effectFnStack } from './register'
import type { EffectFn } from './register'
import State from './state'

// 用来标记某个对象的获取key操作属性，用来标记获取key操作的副作用函数
const ITERATE_KEY = Symbol()

// 副作用函数储存追踪
export const track = (target: object, key: any): void => {
    if(!activeFn) return
    // 找obj
    let dep = deps.get(target)
    if(!dep) deps.set(target, (dep = new Map<string | Symbol, Set<EffectFn>>()))
    let bucket = dep.get(key)
    if(!bucket) dep.set(key, (bucket = new Set<EffectFn>()))
    bucket.add(activeFn)
    // 在这个地方要把当前的bucket添加进函数的dep名单中
    activeFn.deps.push(bucket)
}

// 触发副作用函数
export const trigger = (target: object, key: any, type: string = State.SET): void => {
    let dep = deps.get(target)
    if(!dep) return
    let bucket = dep.get(key)
    // if(!bucket) return 改成下面更好
    // 为了保证当前迭代是准确的(因为底层正在进行删除bucket中对应fn的过程)，复制一份新的bucket集合
    const nowBucket = new Set<EffectFn>(bucket)
    if(type === State.ADD || type === State.DELETE) {
        dep.get(ITERATE_KEY)?.forEach(effectFn => {
            nowBucket.add(effectFn)
        })
    }
    nowBucket && nowBucket.forEach(effectFn => {
        if(effectFn === activeFn) return
        if(effectFn.options.scheduler) effectFn.options.scheduler(effectFn)
        else effectFn()
    })
}

// reactive的实现
export const reactive = (data: object): object => {
    const proxyObj = new Proxy(data, {
        get(target: object, key: any, receiver: object): object {
            // 找寻deps的过程
            track(target, key)
            // receiver用来修正get和set函数的this指向
            return Reflect.get(target, key, receiver)
        },
        set(target: object, key: any, value: any, receiver: object): boolean {
            const type = Reflect.has(target, key) ? State.SET : State.ADD
            const res = Reflect.set(target, key, value, receiver)
            const oldValue = Reflect.get(target, key, receiver)
            // 如果和老值一样，就不重新触发了
            if(res && !Object.is(oldValue, value)) trigger(target, key, type)
            return res
        },
        // 用来劫持in、Object.has操作
        has(target: object, key: any): boolean {
            track(target, key)
            return Reflect.has(target, key)
        },
        // 拦截for in操作
        ownKeys(target: object): (string | symbol)[] {
            track(target, ITERATE_KEY)
            return Reflect.ownKeys(target)
        },
        deleteProperty(target: object, key: string): boolean {
            const has = Reflect.has(target, key)
            const res = Reflect.deleteProperty(target, key)
            if(has && res) trigger(target, key, State.DELETE)
            return res
        }
    })
    return proxyObj
}
/**
 * 这里是数据劫持流程
 */
import { activeFn, deps } from './register'
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

const createReactive = (data: object, isShallow: boolean = false, isReadonly = false): object => {
    const proxyObj = new Proxy(data, {
        get(target: object, key: any, receiver: object & {raw: object}): object {
            // 忽略读取raw的操作，不需要副作用函数添加进raw的执行名单桶中
            if(key === 'raw') return target
            // 找寻deps的过程
            if(!isReadonly) track(target, key)
            // receiver用来修正get和set函数的this指向
            const res = Reflect.get(target, key, receiver)
            if(!isShallow && typeof res === 'object' && res !== null) {
                return createReactive(data, isShallow, isReadonly)
            }
            return res
        },
        set(target: object, key: any, value: any, receiver: object & {raw: object}): boolean {
            if(isReadonly) {
                console.log(`属性${key}为只读`)
                return true
            }
            const type = Reflect.has(target, key) ? State.SET : State.ADD
            const oldValue = Reflect.get(target, key, receiver)
            const res = Reflect.set(target, key, value, receiver)
            // 如果target是reciver的原型才去触发，否则在原型上可能会进行另一次触发
            if(receiver.raw === target) {
                // 如果和老值一样，就不重新触发了
                if(res && !Object.is(oldValue, value)) trigger(target, key, type)
            }
            return res
        },
        // 用来劫持in、Object.has操作
        has(target: object, key: any): boolean {
            if(!isReadonly) track(target, key)
            return Reflect.has(target, key)
        },
        // 拦截for in操作
        ownKeys(target: object): (string | symbol)[] {
            if(!isReadonly) track(target, ITERATE_KEY)
            return Reflect.ownKeys(target)
        },
        deleteProperty(target: object, key: string): boolean {
            if(isReadonly) {
                console.log(`属性${key}为只读`)
                return true
            }
            const has = Reflect.has(target, key)
            const res = Reflect.deleteProperty(target, key)
            if(has && res) trigger(target, key, State.DELETE)
            return res
        }
    })
    return proxyObj
}

// reactive的实现
export const reactive = (data: object): object => {
    return createReactive(data)
}

// 浅层响应
export const shallowReactive = (data: object): object => {
    return createReactive(data, true)
}

// 深层只读
export const readonly = (data: object) => {
    return createReactive(data, false, true)
}

// 深层只读
export const shallowReadonly = (data: object) => {
    return createReactive(data, true, true)
}
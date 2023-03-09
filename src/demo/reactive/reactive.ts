/**
 * 这里是数据劫持流程
 */
import { activeFn, deps } from './register'
import type { EffectFn } from './register'
import State from './state'
import { arrayInstrumentations } from './array'

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
export const trigger = (target: object, key: any, type: string = State.SET, newValue?: any): void => {
    let dep = deps.get(target)
    if(!dep) return
    let bucket = dep.get(key)
    // if(!bucket) return 改成下面更好
    // 为了保证当前迭代是准确的(因为底层正在进行删除bucket中对应fn的过程)，复制一份新的bucket集合
    // 对数组进行处理，当key是length的时候，要判断newValue是是否小于老value
    const nowBucket = new Set<EffectFn>(bucket)
    if(type === State.ADD || type === State.DELETE) {
        dep.get(ITERATE_KEY)?.forEach(effectFn => {
            if(effectFn === activeFn) nowBucket.add(effectFn)
        })
    }
    // 如果是添加属性，那么要吧数组的length相关副作用也添加进来重新执行
    if(type === State.ADD && Array.isArray(target)) {
        dep.get('length')?.forEach(effectFn => {
            if(effectFn === activeFn) nowBucket.add(effectFn)
        })
    }
    // 如果是更新的数组长度，那么大于数组长度值的被调用都要重新执行
    if(Array.isArray(target) && key === 'length') {
        dep.forEach((effects, key) => {
            if(key >= newValue) {
                effects.forEach(effectFn => {
                    if(effectFn === activeFn) nowBucket.add(effectFn)
                })
            }
        })
    }
    nowBucket && nowBucket.forEach(effectFn => {
        if(effectFn === activeFn) return
        if(effectFn.options.scheduler) effectFn.options.scheduler(effectFn)
        else effectFn()
    })
}

const deepReactiveMap = new WeakMap<object, object>()
const createReactive = (data: object, isShallow: boolean = false, isReadonly = false): object => {
    // 如果有这个reactive的代理函数，那么直接返回
    if(deepReactiveMap.has(data)) {
        return deepReactiveMap.get(data) as object
    } 
    const proxyObj = new Proxy(data, {
        get(target: object, key: any, receiver: object & {raw: object}): object {
            // 忽略读取raw的操作，不需要副作用函数添加进raw的执行名单桶中
            if(key === 'raw') return target
            if(!isShallow && arrayInstrumentations.hasOwnProperty(key)) {
                return Reflect.get(arrayInstrumentations, key, receiver)
            }
            // 找寻deps的过程
            if(!isReadonly && typeof key !== 'symbol') track(target, key)
            // receiver用来修正get和set函数的this指向
            const res = Reflect.get(target, key, receiver)
            if(!isShallow && typeof res === 'object' && res !== null) {
                // 每次都重新生成，那么我们把这个存起来
                return createReactive(res, isShallow, isReadonly)
            }
            return res
        },
        set(target: object, key: any, value: any, receiver: object & {raw: object}): boolean {
            if(isReadonly) {
                console.log(`属性${key}为只读`)
                return true
            }
            // 对数组判断进行扩充,如果key可以被转化为数字且小于长度，那么为set，否则都是add
            const type = 
            Array.isArray(target)? Number(key) < target.length ? State.SET : State.ADD
            : Reflect.has(target, key) ? State.SET : State.ADD
            const oldValue = Reflect.get(target, key, receiver)
            const res = Reflect.set(target, key, value, receiver)
            // 如果target是reciver的原型才去触发，否则在原型上可能会进行另一次触发
            if(receiver.raw === target) {
                // 如果和老值一样，就不重新触发了
                if(res && !Object.is(oldValue, value)) trigger(target, key, type, value) // 把新值传递过去
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
            if(!isReadonly) 
                track(target, Array.isArray(target)? 'length' : ITERATE_KEY)
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
    deepReactiveMap.set(data, proxyObj)
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
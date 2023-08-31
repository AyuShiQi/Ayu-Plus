/**
 * 这里是数据劫持流程
 */
// import { activeFn, deps } from './register'
// import type { EffectFn } from './register'
// import State, { shouldTrack } from './state'
// import { arrayInstrumentations } from './array'
// import { mutableInstrumentations, shallow } from './map'
import {
  trigger,
  track
} from './effect'
import { 
  TriggerOpTypes
} from './operations'
/**
 * 用来标记某个对象的获取key操作属性，用来标记获取key操作的副作用函数
 */
export const ITERATE_KEY = Symbol()
/**
 * 用于标记一个代理对象的原型
 */
export const RAW_KEY = Symbol()
/**
 * 用来收集values迭代器锁所调用的值(for in)
 */
export const MAP_KEY_ITERATE_KEY = Symbol()

const deepReactiveMap = new WeakMap<object, object>()
const createReactive = (data: object, isShallow: boolean = false, isReadonly = false): object => {
    // 如果有这个reactive的代理函数，那么直接返回
    // if(deepReactiveMap.has(data)) {
    //     return deepReactiveMap.get(data) as object
    // } 
  const proxyObj = new Proxy(data, {
    get(target: object, key: any, receiver: object): object {
      // 忽略读取raw的操作，不需要副作用函数添加进raw的执行名单桶中
      // 读取raw，直接将target返回，也就是它的原型
      if(key === RAW_KEY) return target
      // 如果是map或者是set
      if(target instanceof Set || target instanceof Map) {
        if(key === 'size') {
          track(target, ITERATE_KEY)
          return Reflect.get(target, key, target)
        }
        shallow.set(isShallow)
        // 稍微谨慎防备一下乱调用的情况，做出何时的提醒
        if(!Reflect.has(target, key)) {
          console.error(`你调用错啦，${target}没有${key}这个方法`)
        } else if(mutableInstrumentations.hasOwnProperty(key)) {
          return Reflect.get(mutableInstrumentations, key, receiver)
        }
        return Reflect.get(target, key).bind(target)
      }
      // 是数组，且调用某些方法
      if(Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
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
    set(target: object, key: any, value: any, receiver: object & {[RAW_KEY]: object}): boolean {
      if(isReadonly) {
        console.log(`属性${key}为只读`)
        return true
      }
      // 对数组判断进行扩充,如果key可以被转化为数字且小于长度，那么为set，否则都是add
      const type = Array.isArray(target) ?
      Number(key) < target.length ?
      TriggerOpTypes.SET : TriggerOpTypes.ADD
      : Reflect.has(target, key) ? TriggerOpTypes.SET : TriggerOpTypes.ADD
      const oldValue = Reflect.get(target, key, receiver)
      const res = Reflect.set(target, key, value, receiver)
      // 如果target是reciver的原型才去触发，否则在原型上可能会进行另一次触发
      if(receiver[RAW_KEY] === target) {
        // console.log('raw: ', key, res, oldValue, value, !Object.is(oldValue, value))
        // 如果和老值一样，就不重新触发了(合理触发响应)
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
      if(!isReadonly) track(target, Array.isArray(target)? 'length' : ITERATE_KEY)
      return Reflect.ownKeys(target)
    },
    deleteProperty(target: object, key: string): boolean {
      if(isReadonly) {
          console.log(`属性${key}为只读`)
          return true
      }
      const has = Reflect.has(target, key)
      const res = Reflect.deleteProperty(target, key)
      if(has && res) trigger(target, key, TriggerOpTypes.DELETE)
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
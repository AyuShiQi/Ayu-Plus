/**
 * 这里是数据劫持流程
 */
import {
  trigger,
  track,
  shouldTrack,
  activeFn
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

// 重写数组方法
const arrayInstrumentations: any = {};

['includes', 'lastIndexOf', 'indexOf'].forEach(method => {
  const originMethod = Array.prototype[method as (keyof typeof Array.prototype)]
  arrayInstrumentations[method] = function(...arg: any): boolean {
    let res = originMethod.apply(this, arg)
    if(res === false) {
      res = originMethod.apply(this.raw, arg)
    }
    return res
  }
});

['push','shift', 'unshift', 'pop', 'splice'].forEach(method => {
  // 也就是调用这些会直接改变length的栈方法的函数，不可以被添加入副作用函数执行名单
  const originMethod = Array.prototype[method as any]
  arrayInstrumentations[method] = function(...arg: any): boolean {
    shouldTrack.value = false
    // 自己加的，目的是认证禁止追踪的函数是否是本身
    shouldTrack.target.add(activeFn)
    let res = originMethod.apply(this, arg)
    shouldTrack.value = true
    return res
  }
})

// map与set
let isShallow = false
export const shallow = {
  get() {
    return isShallow
  },
  set(value: boolean) {
    isShallow = value
  }
}

export const mutableInstrumentations = {
  add(key: any) {
    const target = (this as any)[RAW_KEY]
    const had = target.has(key)
    const res = target.add(key)
    if(!had) {
      trigger(target, key, TriggerOpTypes.ADD)
    }
    return res
  },
  set(key: any, value: any) {
    const target = (this as any)[RAW_KEY]
    const had = target.has(key)
    const oldValue = target.get(key)
    const rawValue = value[RAW_KEY] || value
    const res = target.set(key, rawValue)
    if(!had) {
      trigger(target, key, TriggerOpTypes.ADD)
    }
    // 两个值不相等才触发
    else if(!Object.is(oldValue, value)) {
      trigger(target, key, TriggerOpTypes.SET)
    }
    return res
  },
  delete(key: any) {
    const target = (this as any)[RAW_KEY]
    const had = target.has(key)
    const res = target.delete(key)
    if(had) trigger(target, key, TriggerOpTypes.DELETE)
    return res
  },
  has(key: any) {
    const target = (this as any)[RAW_KEY]
    track(target, key)
    return target.delete(key)
  },
  get(key: any) {
    const target = (this as any)[RAW_KEY]
    const had = target.has(key)
    track(target, key)
    if(had) {
      const res = target.get(key)
      return typeof res === 'object' && isShallow ? reactive(res) : res 
    }
    return undefined
  },
  forEach(cb: any, thisArg: any) {
    const target = (this as any)[RAW_KEY]
    const wrap = (res: any) => typeof res === 'object' && isShallow ? reactive(res) : res 
    track(target, ITERATE_KEY)
    target.forEach((val: any, key: any) => {
      cb.call(thisArg, wrap(val), wrap(key), this)
    })
  },
  [Symbol.iterator]() {
    const target = (this as any)[RAW_KEY]
    const wrap = (res: any) => typeof res === 'object' && res !== null && isShallow ? reactive(res) : res
    const iter = target[Symbol.iterator]()
    track(target, ITERATE_KEY)

    return target instanceof Map ?
    {
      next() {
        const { value, done } = iter.next()
        return {
          value: value ? [wrap(value[0]), wrap(value[1])] : value,
          done
        }
      }
    }
    :
    {
      next() {
        const { value, done } = iter.next()
        return {
          value: value ? wrap(value) : value,
          done
        }
      }
    }
  },
  entries: function() {
    const target = (this as any)[RAW_KEY]
    const wrap = (res: any) => typeof res === 'object' && res !== null && isShallow ? reactive(res) : res
    const iter = target.entries()
    track(target, ITERATE_KEY)

    return {
      [Symbol.iterator]() {
        return {
          next() {
            const { value, done } = iter.next()
            return {
              value: value ? [wrap(value[0]), wrap(value[1])] : value,
              done
            }
          }
        }
      }
    }
  },
  values: function() {
      const target = (this as any)[RAW_KEY]
      const wrap = (res: any) => typeof res === 'object' && res !== null && isShallow ? reactive(res) : res
      const iter = target.values()
      track(target, ITERATE_KEY)

      return {
        [Symbol.iterator]() {
          return {
            next() {
              const { value, done } = iter.next()
              return {
                value: value ? wrap(value) : value,
                done
              }
            }
          }
        }
      }
  },
  keys: function() {
    const target = (this as any)[RAW_KEY]
    const wrap = (res: any) => typeof res === 'object' && res !== null && isShallow ? reactive(res) : res
    const iter = target.keys()
    track(target, MAP_KEY_ITERATE_KEY)

    return {
      [Symbol.iterator]() {
        return {
          next() {
            const { value, done } = iter.next()
            return {
              value: value ? wrap(value) : value,
              done
            }
          }
        }
      }
    }
  }
}

/**
 * 生成响应对象收集
 */
const deepReactiveMap = new WeakMap<object, object>()
/**
 * 为对象添加响应
 * @param data 数据对象
 * @param isShallow 是否是浅响应
 * @param isReadonly 是否是只读
 * @returns 代理trap对象
 */
const createReactive = (data: object, isShallow: boolean = false, isReadonly = false): object => {
  // 如果有这个reactive的代理函数，那么直接返回
  if(deepReactiveMap.has(data)) {
      return deepReactiveMap.get(data) as object
  } 
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
      // 原始值或浅响应返回
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
  proxyObj[RAW_KEY] = data
  // 存储副本
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
import { trigger, track } from './proxy'

/**
 * 这里是函数的注册流程
 **/
// ts类型
export type ActiveFn = ((...props: unknown[])=>any)
export type EffectFn = (() => void) & 
{ 
  deps: Set<EffectFn>[],
  options: any
 }
/**
 * 当前活跃状态副作用函数
 */
export let activeFn: EffectFn
export const effectFnStack: EffectFn[] = []
/**
 * deps表单
 */
export const deps = new WeakMap<object, Map<string, Set<EffectFn>>>()

export const effect = (fn: ActiveFn, options: any = {}): EffectFn => {
  const effectFn: EffectFn = () => {
    activeFn = effectFn
    cleanup()
    effectFnStack.push(activeFn)
    const res = fn()
    effectFnStack.pop()
    activeFn = effectFnStack[effectFnStack.length - 1]
    return res
  }
  // cleanup 附属容器，用来保存
  effectFn.options = options
  effectFn.deps = new Array<Set<EffectFn>>()
  if(!options.lazy) effectFn()
  return effectFn  
}

/**
 * 用来清除当前activeFn的deps中的fn
 */
const cleanup = () => {
  activeFn.deps.forEach(bucket => {
    bucket.delete(activeFn)
  });
  // 数组清0，重新进入绑定程序
  // 这里是没有动最开始的初始化数组的
  activeFn.deps.length = 0
}


export const computed = (fn: any): any => {
  let dirty = false
  let value: any
  const effectFn = effect(fn, {
    lazy: true,
    scheduler() {
      dirty = false
      trigger(obj, 'value')
    }
  })

  const obj = {
    get value() : any {
      // 获取的时候，我们把调用它的函数，放进其deps中
      if(!dirty) {
        value = effectFn()
        dirty = true
      }
      track(obj, 'value')
      return value
    }
  }

  return obj
}


export const watched = (obj: any,fn: any, options: any = {}) => {
  let getter: () => void
  if(typeof obj === 'function') {
    getter = obj
  }
  else {
    getter = () => traverse(obj)
  }
  
  const onInvalidate = getInvalidate()
  let oldValue: any,newValue: any
  const effectFn = effect(() => getter(), {
    lazy: true,
    // 因为是自己的调用器，所以并不会先去执行effectFn
    scheduler() {
      newValue = effectFn()
      fn(newValue, oldValue, onInvalidate())
      oldValue = newValue
    }
  })// 获得那个effectFn，执行它会返回那个值
  oldValue = effectFn()
  if(options.immediate) fn(undefined, oldValue)
}


const traverse = (val: any, seen = new Set<any>()): void => {
    if(typeof val !== 'object' || val === null || seen.has(val)) return
    seen.add(val)
    for(const k of val) {
      traverse(k)
    }
}

const getInvalidate = () => {
  let lastInvalid: any
  return () => {
    const onInvalidate = {
      value: false,
    }
    if(lastInvalid) lastInvalid.value = true
    lastInvalid = onInvalidate
    return onInvalidate
  }
}
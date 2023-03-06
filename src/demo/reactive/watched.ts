import { effect } from './register'

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
  
  // 用于遍历需要watched操作的obj中的每一个属性
  const traverse = (val: any, seen = new Set<any>()): void => {
      if(typeof val !== 'object' || val === null || seen.has(val)) return
      seen.add(val)
      for(const k of val) {
        traverse(k)
      }
  }
  // 用于过期watch（竞态问题）这个实现不是书上的源码
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
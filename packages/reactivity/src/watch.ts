import { effect } from './effect'

type Options = {
  flush: 'pre' | 'post' | 'sync',
  immediate: boolean
}

export const watch = (obj: any,fn: any, options: Options = { flush: 'sync', immediate: false }) => {
  let getter: () => void
  if(typeof obj === 'function') {
    getter = obj
  }
  else {
    getter = () => traverse(obj)
  }
  
  const onInvalidate = getInvalidate()
  // 调度器执行函数
  const job = () => {
    newValue = effectFn()
    fn(newValue, oldValue, onInvalidate())
    oldValue = newValue
  }

  let oldValue: any, newValue: any
  const effectFn = effect(() => getter(), {
    lazy: true,
    // 因为是自己的调用器，所以并不会先去执行effectFn
    scheduler() {
      if (options.flush === 'post') {
        const p = Promise.resolve()
        p.then(job)
      } else {
        job()
      }
    }
  })

  // 获得那个effectFn，执行它会返回那个值
  if(options.immediate) {
    job()
  } else {
    oldValue = effectFn()
  }
}

/**
 * 用于遍历需要watched操作的obj中的每一个属性
 * @param val 当前遍历内容
 * @param seen 已经遍历过的内容
 */
const traverse = (val: any, seen = new Set<any>()): void => {
  if(typeof val !== 'object' || val === null || seen.has(val)) return
  seen.add(val)
  for(const k of val) {
    traverse(k)
  }
}

/**
 * 用于过期watch（竞态问题）这个实现不是书上的源码
 * @returns 返回生成过期标记对象
 */
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
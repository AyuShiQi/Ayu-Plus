import { effect, trigger, track } from './effect'

type Computed = <T>(fn: (a: any[]) => T) => ComputedRef<T>
export type ComputedRef<T> = {
  readonly value: T
}

export const computed: Computed = <T>(fn: (a: any[]) => T) => {
  let dirty = false
  let value: T
  const effectFn = effect(fn, {
    lazy: true,
    scheduler() {
      // 只将dirty置为false，提醒这个计算属性需要重新获取新的值 
      dirty = false
      // 直接去触发这个计算属性绑定的副作用函数
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
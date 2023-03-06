import { trigger, track } from './proxy'
import { effect } from './register'

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
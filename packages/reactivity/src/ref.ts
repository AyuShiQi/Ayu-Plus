import { reactive } from "./reactive"

export type Ref<T> = {
  value: T,
  __v_isRef: boolean
}

export const ref = <T>(val: T) => {
  let res
  if(typeof val === 'object' && val !== null) {
    res =  reactive(val)
  } else res = reactive({
    value: val
  })
  Object.defineProperty(res, '__v_isRef', {
    value: true,
    writable: false
  })
  return res as Ref<T>
}

export const toRef = (obj: any, key: string) => {
  const res =  {
    get value(): string {
      return obj[key]
    },
    set value(v: any) {
      obj[key] = v
    }  
  }
  Object.defineProperty(res, '__v_isRef', {
    value: true,
    writable: false
  })
  return res
}

export const toRefs = (obj: any) => {
  const res: any = {}
  for(const key in obj) {
    res[key] = toRef(obj, key)
  }
  return res
}

/**
 * 脱Ref处理
 * @param target ref目标 
 * @returns 
 */
export const proxyRefs = (target: any) => {
  return new Proxy(target, {
    get(target: any, key: string, receiver: any) {
      // console.log(target, key)
      if (key as any === Symbol.unscopables) return undefined
      const value = Reflect.get(target, key, receiver)
      return value.__v_isRef ? value.value : value
    },
    set(target: any, key: string, value: any, receiver: any) {
      const val = target[key]
      if(val.__v_isRef) {
        val.value = value
        return true
      }
      return Reflect.set(target, key, value, receiver)
    }
  })
}
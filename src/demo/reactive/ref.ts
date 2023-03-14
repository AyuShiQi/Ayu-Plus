import { reactive } from "./reactive"

export const ref = <T>(val: T) => {
    let res
    if(typeof val === 'object' && val !== null) {
        res =  reactive(val)
    }
    else res = reactive({
        value: val
    })
    Object.defineProperty(res, '__v_isRef', {
        value: true,
        writable: false
    })
    return res
}

export const toRef = (obj: any, key: any) => {
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

export const proxyRefs = (target: any) => {
    return new Proxy(target, {
        get(target: any, key: any, receiver: any) {
            const value = Reflect.get(target, key, receiver)
            return value.__v_isRef ? value.value : value
        },
        set(target: any, key: any, value: any, receiver: any) {
            const val = target[key]
            if(val.__v_isRef) {
                val.value = value
                return true
            }
            return Reflect.set(target, key, value, receiver)
        }
    })
}
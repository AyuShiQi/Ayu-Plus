import { RAW_KEY, track, trigger } from './reactive'
import State from './state'
import { reactive } from './reactive'

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
    set(key: any, value: any) {
        const target = (this as any)[RAW_KEY]
        const had = target.has(key)
        const oldValue = target.get(key)
        const rawValue = value[RAW_KEY] || value
        const res = target.set(key, rawValue)
        if(!had) {
            trigger(target, key, State.ADD)
        }
        // 两个值不相等才触发
        else if(!Object.is(oldValue, value)) {
             trigger(target, key, State.SET)
        }
        return res
    },
    delete(key: any) {
        const target = (this as any)[RAW_KEY]
        const had = target.has(key)
        const res = target.delete(key)
        if(had) trigger(target, key, State.DELETE)
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
    forEach(fn: any) {
        
    }
};
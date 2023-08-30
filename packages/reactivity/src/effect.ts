/**
 * 这里是函数的注册流程
 **/
// import { shouldTrack } from './state'

// ts类型
export type ActiveFn = ((...props: unknown[])=>any)
export type EffectFn = (() => void) &
{ 
  deps: Set<EffectFn>[],
  options: any
}

/**
 * 是否需要追踪
 */
export const shouldTrack = {
    value: true,
    target: new Set()
}

/**
 * 当前活跃状态副作用函数
 */
export let activeFn: EffectFn
/**
 * 副作用函数栈
 */
export const effectFnStack: EffectFn[] = []
/**
 * deps表单(用于分类存放所有副作用函数桶（按相应数据分类）)
 */
export const deps = new WeakMap<object, Map<string | Symbol, Set<EffectFn>>>()

/**
 * 注册副作用函数
 * @param fn 目标函数
 * @param options 
 * @returns 
 */
export const effect = (fn: ActiveFn, options: any = {}): EffectFn => {
  const effectFn: EffectFn = () => {
    activeFn = effectFn
    // 这个是我自己加的，如果目前不允许追踪，可能会导致一部分副作用函数，只能通过不清理的方式让已经追踪的函数不清除
    if(shouldTrack.value || shouldTrack.target.has(effectFn)) cleanup()
    effectFnStack.push(activeFn)
    // 自己加的，如果这个函数是一个不允许追踪函数，那么这一次就不再执行
    const res = shouldTrack.target.has(effectFn)? undefined : fn()
    effectFnStack.pop()
    // 交回上一栈的activeFn
    activeFn = effectFnStack[effectFnStack.length - 1]
    return res
  }
  // cleanup 附属容器，用来保存
  effectFn.options = options
  effectFn.deps = new Array<Set<EffectFn>>()
  // 首次调用
  if(!options.lazy) effectFn()
  return effectFn  
}

/**
 * 用来清除当前activeFn的deps中的fn
 */
const cleanup = () => {
  activeFn.deps.forEach(bucket => {
    // 删除响应数据桶中的副作用函数
    bucket.delete(activeFn)
  });
  // 数组清0，重新进入绑定程序
  // 这里是没有动最开始的初始化数组的
  activeFn.deps.length = 0
}

/**
 * 追踪副作用函数，把副作用函数放入相应的桶里
 * @param target 
 * @param key 
 * @returns 
 */
export const track = (target: object, key: any): void => {
    if(!activeFn || !shouldTrack.value) return
    // 找obj
    let dep = deps.get(target)
    if(!dep) deps.set(target, (dep = new Map<string | Symbol, Set<EffectFn>>()))
    let bucket = dep.get(key)
    if(!bucket) dep.set(key, (bucket = new Set<EffectFn>()))
    bucket.add(activeFn)
    // 在这个地方要把当前的bucket添加进函数的dep名单中
    activeFn.deps.push(bucket)
}

// 触发副作用函数
export const trigger = (target: object, key: any, type: string = State.SET, newValue?: any): void => {
    // console.log('trigger', key)
    const dep = deps.get(target)
    if(!dep) return
    const bucket = dep.get(key)
    // if(!bucket) return 改成下面更好
    // 为了保证当前迭代是准确的(因为底层正在进行删除bucket中对应fn的过程)，复制一份新的bucket集合
    // 对数组进行处理，当key是length的时候，要判断newValue是是否小于oldValue
    const nowBucket = new Set<EffectFn>(bucket)
    if(type === State.ADD || type === State.DELETE || target instanceof Map) {
        dep.get(ITERATE_KEY)?.forEach(effectFn => {
            if(effectFn !== activeFn) nowBucket.add(effectFn)
        })
    }
    // 取出和keys迭代器相关的值
    if((type === State.ADD || type === State.DELETE) && target instanceof Map) {
        dep.get(MAP_KEY_ITERATE_KEY)?.forEach(effectFn => {
            if(effectFn !== activeFn) nowBucket.add(effectFn)
        })
    }
    // 如果是添加属性，那么要吧数组的length相关副作用也添加进来重新执行
    if((type === State.ADD || type === State.DELETE) && Array.isArray(target)) {
        dep.get('length')?.forEach(effectFn => {
            if(effectFn !== activeFn) nowBucket.add(effectFn)
        })
    }
    // 如果是更新的数组长度，那么大于数组长度值的被调用都要重新执行
    if(Array.isArray(target) && key === 'length') {
        dep.forEach((effects, key) => {
            if(key >= newValue) {
                effects.forEach(effectFn => {
                    if(effectFn !== activeFn) nowBucket.add(effectFn)
                })
            }
        })
    }
    nowBucket && nowBucket.forEach(effectFn => {
        // 如果当前所处副作用函数还需要触发，那就阻止本次操作（也就是在一个函数里既调用了数据又修改了数据）
        if(effectFn === activeFn) return
        if(effectFn.options.scheduler) effectFn.options.scheduler(effectFn)
        else effectFn()
    })
}

/**
 * 我的碎碎念时间
 * 我的总结，响应式的精髓就在于，当响应式数据变化时，需要重新执行度去过该数据的语句或者函数（副作用函数）
 */
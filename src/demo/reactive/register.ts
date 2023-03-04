/**
 * 这里是函数的注册流程
 **/
// ts类型
export type ActiveFn = ((...props: unknown[])=>any) | undefined
export type EffectFn = (() => void) & { deps: Set<EffectFn>[] }
/**
 * 当前活跃状态副作用函数
 */
export let activeFn: EffectFn
export const effectFnStack: EffectFn[] = []
/**
 * deps表单
 */
export const deps = new WeakMap<object, Map<string, Set<EffectFn>>>()

export const effect = (fn: ActiveFn): void => {
  const effectFn: EffectFn = () => {
    activeFn = effectFn
    cleanup()
    effectFnStack.push(activeFn)
    if(fn) fn()
    effectFnStack.pop()
    activeFn = effectFnStack[effectFnStack.length - 1]
  }
  // cleanup 附属容器，用来保存
  effectFn.deps = new Array<Set<EffectFn>>()
  effectFn()
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

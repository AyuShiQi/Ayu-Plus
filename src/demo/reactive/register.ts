/**
 * 这里是函数的注册流程
 **/
export type ActiveFn = ((...props: unknown[])=>any) | undefined
/**
 * 当前活跃状态副作用函数
 */
export let activeFn: ActiveFn = undefined
/**
 * deps表单
 */
export const deps = new WeakMap<object, Map<string, Set<ActiveFn>>>()

export const effect = (fn: ActiveFn): void => {
  const effectFn = () => {
    activeFn = effectFn
    if(fn) fn()
  }
  effectFn()
}

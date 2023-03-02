/**
 * 这里是函数的注册流程
 **/
type ActiveFn = ((...props: unknown[])=>any) | undefined
/**
 * 当前活跃状态副作用函数
 */
export let activeFn: ActiveFn = undefined

export const effect = (fn: ActiveFn): void => {
  const effectFn = () => {
    activeFn = fn
    if(fn) fn()
  }
  effectFn()
}

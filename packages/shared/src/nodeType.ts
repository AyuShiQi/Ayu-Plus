// 标记文本节点
export const Text = Symbol()
// 标记注释节点
export const Comment = Symbol()
// 标记组件Fragment
export const Fragment = Symbol()

export type Container = Element & {
  _vnode: any,
  _vei: any
}

export type VNode = {
  type: any,
  children?: VNode[],
  el: Container,
  parent: Container,
  props: any,
  key?: number
}
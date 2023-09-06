import { Text, Comment } from './type'
import { normalizeClass } from '@ayu-plus/shared'
import { lis } from '@ayu-plus/shared'

const browserOptions = {
  /**
 * 挂载补足props
 * @param el 节点
 * @param key props名
 * @param prevValue 老值
 * @param nextValue 新值
 */
  patchProps(el: Container, key: string, prevValue: any, nextValue: any) {
    // 说明是一个事件onXxx
    if(/^on/.test(key)) {
      const invokers = el._vei || (el._vei = {})
      const name = key.slice(2).toLowerCase()
      // 一个伪造事件函数对象，抛弃掉传统的remove事件操作
      let invoker = invokers[key]
      if(nextValue) {
        // 不存在就绑定
        if(!invoker) {
          invoker = el._vei[name] = (e: Event) => {
            // 忽略绑定晚于当前事件发生的函数
            if(e.timeStamp <= invoker.attached) return
            if(Array.isArray(invoker.value)) {
              invoker.value.forEach((method: any) => method(e))
            } else invoker.value(e)
          }
          // 使用高精度时间
          invoker.attached = performance.now
          invoker.value = nextValue
          el.addEventListener(name, invoker)
        } else {
          // 直接替换
          invoker.value = nextValue
        }
      // (没有nextValue)说明在执行卸载操作，直接removeEventListener
      } else if (invoker) {
        el.removeEventListener(name, invoker)
      }
    } else if(key === 'class') {
      el.className = nextValue ? normalizeClass(nextValue) : ''
      // DOM properties存在这个属性
    } else if(shouldSetAsProps(el, key)) {
      const type = typeof el[key]
      if(type === 'boolean' && nextValue === '') {
        el[key] = true
      } else {
        el[key] = nextValue
      }
    } else el.setAttribute(key, nextValue)
  },
  unmount(vnode: VNode) {
    const el = vnode.el
    const parent = el.parentNode
    if(parent) parent.removeChild(el)
  },
  /**
   * 创建元素
   * @param tag 元素tag名 
   */
  createElement (tag: string) {
    return document.createElement(tag)
  },
  /**
   * 设置元素文本节点
   * @param el 目标元素
   * @param text 文本
   */
  setElementText (el: Element, text: string) {
    el.textContent = text
  },
  /**
   * 给定parent添加指定节点
   * @param el 添加节点
   * @param parent 指定目标
   * @param anchor 锚点
   */
  insert (el: Element, parent: Container, anchor = null) {
    parent.insertBefore(el, anchor)
  },
  createText (text: string) {
    return document.createTextNode(text)
  },
  setText (el: Container, text: string) {
    el.nodeValue = text
  },
  createComment (text: string) {
    return document.createComment(text)
  },
  setComment (el: Container, text: string) {
    el.nodeValue = text
  }
}

type Options = typeof browserOptions

type Container = Element & {
  _vnode: any,
  _vei: any
}

type VNode = {
  type: any,
  children?: VNode[],
  el: Container,
  parent: Container,
  props: any,
  key?: number
}

export function createRenderer(options: Options) {
  const {
    createElement,
    insert,
    setElementText,
    patchProps,
    unmount,
    createText,
    setText,
    createComment,
    setComment
  } = options

  /**
   * 渲染
   * @param vnode 虚拟DOM 
   * @param container 挂载容器
   */
  function render(vnode: VNode,container: Container, anchor = null) {
    if(vnode) {
      patch(container._vnode, vnode, container, anchor)
    } else {
      // 新DOM为null且原来有内容需要取消挂载
      if(container._vnode) {
        unmount(container._vnode)
      }
    }
    container._vnode = vnode
  }
    
  /**
   * 打补丁（diff入口点）
   * @param oldVnode 老虚拟DOM
   * @param vnode 新虚拟DOM
   * @param container 挂载容器
   */
  function patch(oldVnode: VNode, vnode: VNode, container: Container, anchor: Container = null) {
    // 节点tag类型都不一样肯定不能打补丁，需要重新挂载一个新的
    if(oldVnode.type !== vnode.type) {
      unmount(oldVnode)
      // 以便后续重新挂载操作
      oldVnode = null
    }
    const { type } = vnode
    // 说明是个普通的节点
    if(typeof type === 'string') {
      // 没有老虚拟node，直接挂载
      if(!oldVnode) {
        mountElement(vnode, container, anchor)
      } else {
        // diff算法入口
        patchElement(oldVnode, vnode)
      }
    // 说明是文本节点
    } else if (type === Text) {
      if(!oldVnode) {
        const el = vnode.el = createText(vnode.children as unknown as string) as unknown as Container
        insert(el, container, anchor)
      } else {
        const el = vnode.el = oldVnode.el
        if (vnode.children !== oldVnode.children) {
          setText(el, vnode.children as unknown as string)
        }
      }
    // 或者注释节点
    } else if (type === Comment) {
      if(!oldVnode) {
        const el = vnode.el = createComment(vnode.children as unknown as string) as unknown as Container
        insert(el, container, anchor)
      } else {
        const el = vnode.el = oldVnode.el
        if (vnode.children !== oldVnode.children) {
          setComment(el, vnode.children as unknown as string)
        }
      }
    } else if (typeof type === 'object') {
      // 说明是个组件
    }
  }

  function patchElement(oldVnode: VNode, newVnode: VNode) {
    const el = newVnode.el = oldVnode.el
    // 先更新一下props
    const oldProps = oldVnode.props
    const newProps = newVnode.props
    for(const key in newProps) {
      if(newProps[key] !== oldProps[key]) {
        patchProps(el, key, oldProps[key], newProps[key])
      }
    }
    // 卸载老props
    for(const key in oldProps) {
      if(!(key in newProps)) {
        patchProps(el, key, oldProps[key], null)
      }
    }
    // 更新这个el的孩儿们
    patchChildren(oldVnode, newVnode, el)
  }

  function patchChildren(oldVnode: VNode, newVnode: VNode,el: Container) {
    if(typeof newVnode.children === 'string') {
      if(Array.isArray(oldVnode.children)) {
        oldVnode.children.forEach((child: any) => unmount(child))
      }
      setElementText(el, newVnode.children)
    } else if(Array.isArray(newVnode.children)) {
      if(Array.isArray(oldVnode.children)) {
        // diff算法入口！！！
        // sampleDiff(oldVnode, newVnode, el)
        patchKeyedChildren3(oldVnode, newVnode, el)
      } else {
        setElementText(el, '')
        newVnode.children.forEach((child: any) => patch(null, child, el))
      }
    // 代表新节点为null
    } else {
      if(Array.isArray(oldVnode.children)) {
        oldVnode.children.forEach((child: any) => unmount(child))
      } else if(typeof oldVnode.children === 'string') setElementText(el, '')
    }
  }

  /**
   * 挂载元素
   * @param vnode 虚拟DOM 
   * @param container 挂载容器
   */
  function mountElement(vnode: VNode, container: Container, anchor: Container) {
    const el = vnode.el = createElement(vnode.type) as unknown as Container
    if(typeof vnode.children === 'string') {
      setElementText(el, vnode.children)
    } else if(Array.isArray(vnode.children)) {
      vnode.children.forEach((child: any) => {
        patch(null, child, el)
      })
    }
    if(vnode.props) {
      for(const key in vnode.props) {
        patchProps(el, key, null, vnode.props[key])
      }
    }
    // 插入操作
    insert(el, container, anchor)
  }

  /**
   * 简单diff算法
   * @param n1 老dom
   * @param n2 新dom
   * @param container 容器 
   */
  function sampleDiff (n1: VNode, n2: VNode, container: Container) {
    const oldChildren = n1.children
    const newChildren = n2.children
    // 遍历新dom
    let lastIndex = 0
    for (let i = 0; i < newChildren.length; i++) {
      const newNode = newChildren[i]
      // 记录是否找到key相同的节点
      let flag = false
      for (let j = 0; j < oldChildren.length; j++) {
        const oldNode = oldChildren[j]
        if (oldNode.key === newNode.key) {
          patch(oldNode, newNode, container, null)
          flag = true

          // 说明要移动位置
          if (j < lastIndex) {
            const preNode = newChildren[i - 1]
            if (preNode) {
              const anchor = preNode.el.nextSibling
              insert(preNode.el, container, anchor)
            }
          } else {
            lastIndex = j
          }
          break
        }
      }

      // 说明没找到
      if (!flag) {
        const preNode = newChildren[i - 1]
        let anchor = null
        if (preNode) {
          anchor = preNode.el.nextSibling
        // 说明是第一个节点
        } else {
          anchor = container.firstChild
        }
        patch(null, newNode, container, anchor)
      }
    }

    // 卸载旧的不用节点
    for (let i = 0; i < oldChildren.length; i++) {
      const oldNode = oldChildren[i]
      // 记录是否找到key相同的节点
      let flag = newChildren.find(vnode => vnode.key === oldNode.key)

      if (!flag) {
        unmount(oldNode)
      }
    }
  }

  /**
   * 双端diff算法
   * @param n1 老dom
   * @param n2 新dom
   * @param container 容器 
   */
  function patchKeyedChildren2 (n1: VNode, n2: VNode, container: Container) {
    const oldChildren = n1.children
    const newChildren = n2.children
    // 索引值
    let oldStartIdx = 0
    let oldEndIdx = oldChildren.length - 1
    let newStartIdx = 0
    let newEndIdx = newChildren.length - 1

    let oldStartVNode = oldChildren[oldStartIdx]
    let oldEndVNode = oldChildren[oldEndIdx]
    let newStartVNode = newChildren[newStartIdx]
    let newEndVNode = newChildren[oldStartIdx]

    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (oldStartVNode.key === newStartVNode.key) {
        patch(oldStartVNode, newStartVNode, container)
        oldStartVNode = oldChildren[++oldStartIdx]
        newStartVNode = newChildren[++newStartIdx]
      } else if (oldEndVNode.key === newEndVNode.key) {
        patch(oldEndVNode, newEndVNode, container)
        oldEndVNode = oldChildren[--oldEndIdx]
        newEndVNode = newChildren[--newEndIdx]
      } else if (oldStartVNode.key === newEndVNode.key) {
        patch(oldStartVNode, newEndVNode, container)
        insert(oldStartVNode.el, container, oldEndVNode.el.nextSibling)
        oldStartVNode = oldChildren[++oldStartIdx]
        newEndVNode = newChildren[--newEndIdx]
      } else if (oldEndVNode.key === newStartVNode.key) {
        patch(oldEndVNode, newStartVNode, container)
        insert(oldEndVNode.el, container, oldStartVNode.el)
        newStartVNode = newChildren[++newStartIdx]
        oldEndVNode = oldChildren[--oldEndIdx]
      } else {
        const idxInOld = oldChildren.findIndex(vnode => vnode.key === newStartVNode.key)

        if (idxInOld > 0) {
          const vnodeToMove = oldChildren[idxInOld]
          patch(vnodeToMove, newStartVNode, container)
          insert(vnodeToMove.el, container, oldStartVNode.el)
          oldChildren[idxInOld] = undefined
        // 没有找到
        } else {
          patch(null, newStartVNode, container)
        }
        newStartVNode = newStartVNode[++newStartIdx]
      }
    }

    if (oldEndIdx < oldStartIdx && newStartIdx <= newEndIdx) {
      for (let i = newStartIdx; i <= newEndIdx; i++) {
        patch(null, newChildren[i], container, oldStartVNode.el)
      }
    } else if (oldEndIdx < newStartIdx && oldStartIdx <= oldEndIdx) {
      for (let i = oldStartIdx; i <= oldEndIdx; i++) {
        unmount(oldChildren[i])
      }
    }
  }

  /**
   * 快速diff算法
   * @param n1 老dom
   * @param n2 新dom
   * @param container 容器 
   */
  function patchKeyedChildren3 (n1: VNode, n2: VNode, container: Container) {
    const oldChildren = n1.children
    const newChildren = n2.children

    // 前置预处理
    let j = 0
    let oldVNode = oldChildren[j]
    let newVNode = newChildren[j]

    while (oldVNode.key === newVNode.key) {
      patch(oldVNode, newVNode, container)
      j++
      oldVNode = oldChildren[j]
      newVNode = newChildren[j]
    }

    // 后置预处理
    let oldEnd = oldChildren.length - 1
    let newEnd = newChildren.length - 1

    oldVNode = oldChildren[oldEnd]
    newVNode = newChildren[newEnd]

    while (oldVNode.key === newVNode.key) {
      patch(oldVNode, newVNode, container)
      oldVNode = oldChildren[--oldEnd]
      newVNode = newChildren[--newEnd]
    }

    // 预处理最后判断
    // 说明有需要挂载的新节点
    if (j > oldEnd && j <= newEnd) {
      const anchorIndex = newEnd - 1
      const anchor = anchorIndex < newChildren.length ? newChildren[anchorIndex].el : null
      while (j <= newEnd) {
        patch(null, newChildren[j++], container, anchor)
      }
    } else if (j <= oldEnd && j > newEnd) {
      while (j <= oldEnd) {
        unmount(oldChildren[j++])
      }
    // 还需要diff
    } else {
      const count = newEnd - j + 1
      const sources = new Array(count).fill(-1)

      const oldStart = j
      const newStart = j

      // 双层循环，性能代价大
      // for (let i = oldStart; i <= oldEnd; i++) {
      //   const oldVNode = oldChildren[i]
      //   for (let k = newStart; k <= newEnd; k++) {
      //     const newVNode = newChildren[k]
      //     if (oldVNode.key === newVNode.key) {
      //       patch(oldVNode, newVNode, container)
      //       source[k - newStart] = i
      //     }
      //   }
      // }

      const keyIndex = {}
      // 构建索引表
      for (let i = newStart; i <= newEnd; i++) {
        keyIndex[newChildren[i].key] = i
      }

      // 节点是否需要移动
      let moved = false
      // 当前最大索引
      let pos = 0
      // 已经更新过的节点
      let patched = 0

      for (let i = oldStart; i <= oldEnd; i++) {
        // 说明还没有更新完节点
        if (patched <= count) {
          const oldVNode = oldChildren[i]
          const k = keyIndex[oldVNode.key]
          // 说明该节点存在
          if (k) {
            const newVNode = newChildren[k]
            patched++
            patch(oldVNode, newVNode, container)
            sources[k - newStart] = i

            if (k < pos) {
              moved = true
            } else {
              pos = k
            }
          } else {
            unmount(oldVNode)
          }
        } else {
          unmount(oldVNode)
        }
      }
      // 说明还有节点没有适配，快速diff开始
      if (moved) {
        // 最长上升子序列
        const seq = lis(sources)

        // 记录最长递增子序列最后一个元素
        let s = seq.length - 1
        // i初始指向新子节点最后一个元素
        for (let i = count - 1; i >=0 ; i--) {
          // 新节点需要挂载
          if (sources[i] === -1) {
            const pos = i + newStart
            const newVNode = newChildren[pos]
            const anchor = pos + 1 < newChildren.length ? newChildren[pos + 1].el : null
            patch(null, newVNode, container, anchor)
          // 需要移动 
          } else if (seq[s] !== i) {
            const pos = i + newStart
            const newVNode = newChildren[pos]
            const anchor = pos + 1 < newChildren.length ? newChildren[pos + 1].el : null
            insert(newVNode.el, container, anchor)
          } else {
            s--
          }
        }
      }
    }
  }

  return {
    render
  }
}

function shouldSetAsProps(el: any, key: any): boolean {
  // 特殊处理，因为input节点的form prop是只读的，所以只能用setAttribute来设置
  if(key === 'form' && el.tagName === 'INPUT') return false
  // 是prop，就直接设置
  return key in el
}

/**
 * 这个是DOM渲染
 */
export const render = createRenderer(browserOptions)
import { Text, Comment } from './type'
import { normalizeClass } from 'packages/shared/src/className'

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
  props: any
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
  function render(vnode: VNode,container: Container) {
    if(vnode) {
      patch(container._vnode, vnode, container)
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
  function patch(oldVnode: VNode, vnode: VNode, container: Container) {
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
        mountElement(vnode, container)
      } else {
        // diff算法入口
        patchElement(oldVnode, vnode)
      }
    // 说明是文本节点
    } else if (type === Text) {
      if(!oldVnode) {
        const el = vnode.el = createText(vnode.children as unknown as string) as unknown as Container
        insert(el, container)
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
        insert(el, container)
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
        diff(oldVnode, newVnode)
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
  function mountElement(vnode: VNode, container: Container) {
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
    insert(el, container)
  }

  function diff (n1: VNode, n2: VNode) {

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

const render = createRenderer(browserOptions)
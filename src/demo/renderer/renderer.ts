const Type = Symbol()


export function createRenderer(options: any) {
    const { createElement, insert, setElementText, patchProps, unmount, createText, setText } = options

    function render(vnode: any,container: any) {
        if(vnode) {
            patch(container._vnode, vnode, container)
        }
        else {
            if(container._vnode) {
                unmount(container._vnode)
            }
        }
        container._vnode = vnode
    }
    
    function patch(oldVnode: any, vnode: any, container: any) {
        // 节点tag类型都不一样肯定不能打补丁，需要重新挂载一个新的
        if(oldVnode?.type !== vnode.type) {
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
            }
            else {
                // diff算法入口
                patchElement(oldVnode, vnode)
            }
        } else if (type === Type) {
            if(!oldVnode) {
                const el = vnode.el = createText(vnode.child)
                insert(el, container)
            } else {
                const el = vnode.el = oldVnode.el
                if (vnode.child !== oldVnode.child) {
                    setText(el, vnode.child)
                }
            }
        } else {
            // 说明是个组件
        }
    }

    function patchElement(oldVnode: any, newVnode: any) {
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

    function patchChildren(oldVnode: any, newVnode: any,el: any) {
        if(typeof newVnode.child === 'string') {
            if(Array.isArray(oldVnode.child)) {
                oldVnode.child.forEach((child: any) => unmount(child))
            }
            setElementText(el, newVnode.child)
        }
        else if(Array.isArray(newVnode.child)) {
            if(Array.isArray(oldVnode.child)) {
                // diff算法
            }
            else {
                setElementText(el, '')
                newVnode.child.forEach((child: any) => patch(null, child, el))
            }
        }
        else {
            if(Array.isArray(oldVnode.child)) {
                oldVnode.child.forEach((child: any) => unmount(child))
            }
            else if(typeof oldVnode.child === 'string') setElementText(el, '')
        }
    }

    function mountElement(vnode: any, container: any) {
        const el = vnode.el = createElement(vnode.type)
        if(typeof vnode.child === 'string') {
            setElementText(el, vnode.child)
        }
        else if(Array.isArray(vnode)) {
            vnode.forEach((child: any) => {
                patch(null, child, el)
            })
        }
        if(vnode.props) {
            for(const key in vnode.props) {
                patchProps(el, key, null, vnode.props[key])
            }
        }
        insert(el, container)
    }

    return {
        render
    }
}

function shouldSetAsProps(el: any, key: any, value: any): boolean {
    if(key === 'form' && el.tagName === 'INPUT') return false
    return key in el
}

const render = createRenderer({
    patchProps(el: any, key: any, prevValue: any, nextValue: any) {
        // 说明是一个事件
        if(/^on/.test(key)) {
            const invokers = el._vei || (el._vei = {})
            const name = key.slice(2).toLowerCase()
            // 一个伪造事件函数对象，抛弃掉传统的remove事件操作
            let invoker = invokers[key]
            // 不存在就绑定
            if(nextValue) {
                if(!invoker) {
                    invoker = el._vei[name] = (e: Event) => {
                        // 忽略绑定晚于当前事件发生的函数
                        if(e.timeStamp <= invoker.attached) return
                        if(Array.isArray(invoker.value)) {
                            invoker.value.forEach((method: any) => method(e))
                        }
                        else invoker.value(e)
                    }
                    // 使用高精度时间
                    invoker.attached = performance.now
                    invoker.value = nextValue
                    el.addEventListner(name, invoker)
                }
                else {
                    // 直接替换
                    invoker.value = nextValue
                }
            }
            // 说明在执行卸载操作，直接removeEventListener
            else if(invoker){
                el.removeEventListner(name, invoker)
            }
        } else if(key==='class') {
            el.className = nextValue || ''
        }
        // DOM properties存在这个属性
        else if(shouldSetAsProps(el, key, nextValue)) {
            const type = typeof el[key]
            if(type === 'boolean' && nextValue === '') {
                el[key] = true
            }
            else {
                el[key] = nextValue
            }
        }
        else el.setAttribute(key, nextValue)
    },
    unmount(vnode: any) {
        const el = vnode.el
        const parent = el.parent
        if(parent) parent.removeChild(el)
    },
    createElement () {},
    setElementText () {},
    insert () {},
    createText () {},
    setText (el: any, text: string) {}
})
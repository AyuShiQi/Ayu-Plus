export function createRenderer(options: any) {
    const { createElement, insert, setElementText, patchProps } = options

    function render(vnode: any,container: any) {
        if(vnode) {
            patch(container._vnode, vnode, container)
        }
        else {
            container.innerHTML = ''
        }
    }
    
    function patch(oldVnode: any, vnode: any, container: any) {
        if(!oldVnode) {
            mountElement(vnode, container)
        }
        else {
            // diff算法入口
        }
    }

    function mountElement(vnode: any, container: any) {
        const el = createElement(vnode.type)
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
        // DOM properties存在这个属性
        if(shouldSetAsProps(el, key, nextValue)) {
            const type = typeof el[key]
            if(type === 'boolean' && nextValue === '') {
                el[key] = true
            }
            else {
                el[key] = nextValue
            }
        }
        else el.setAttribute(key, nextValue)
    }
})
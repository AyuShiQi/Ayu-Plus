export function createRenderer(options: any) {
    const { createElement, insert, setElementText } = options

    function render(vnode: any,container: any) {
        if(vnode) {
            patch(container._vnode, vnode, container)
        }
        else {
            container.innerHTML = ''
        }
    }
    
    function patch(oldVnode: any, vnode: any, container: any) {
        if(oldVnode) {
            mountElement(oldVnode, vnode, container)
        }
        else {
            container.innerHTML
        }
    }

    function mountElement(oldVnode: any, vnode: any, container: any) {
        const el = createElement(vnode.tag)
        if(typeof vnode.child === 'string') {
            setElementText(el, vnode.child)
        }
        insert(el, container)
    }

    return {
        render
    }
}
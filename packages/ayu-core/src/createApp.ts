import { parse } from "@ayu-plus/dom-complier"
import { render } from '@ayu-plus/renderer'
import { showWarning } from "./warning"
import { proxyRefs } from "@ayu-plus/reactivity"

type Option = {
  el: string | Element,
  template?: string | Element,
  setup: () => any
}

export function createApp ({ el, template, setup }: Option) {
  if (typeof el === 'string') {
    el = document.querySelector(el)
  }

  if (!el) {
    console.warn(showWarning('请传入正确的el'))
    return
  }

  if (!template) {
    template = String(el.innerHTML)
  }

  const proxy = proxyRefs(setup())
  
  console.log(proxy)

  el.innerHTML = ''
  const AST = parse(template, el, proxy)

  render.render(AST, el as any, null)
}
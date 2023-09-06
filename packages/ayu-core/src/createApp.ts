import { parse } from "./index"
import { showWarning } from "./warning"

type Option = {
  el: string | Element,
  template?: string | Element
}

export function createApp ({ el, template }: Option) {
  if (typeof el === 'string') {
    el = document.querySelector(el)
  }

  if (!el) {
    console.warn(showWarning('请传入正确的el'))
    return
  }

  if (template) {
    el.innerHTML = ''
    parse(template, el)
  } else {
    parse(el, el)
  }
}
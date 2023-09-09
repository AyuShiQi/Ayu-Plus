import {
  Fragment,
  Text,
  type VNode
} from '@ayu-plus/shared'

import {
  effect
} from '@ayu-plus/reactivity'

export function parse (template: string | Element, el: Element, data: any) {
  if (typeof template === 'string') {
    const container = document.createElement('div')
    container.innerHTML = template
    template = container
  }
  const fragment = moveTemplateToFragment(template)
  // AST
  const AST: VNode = {
    type: Fragment,
    el: el as any,
    parent: null,
    props: null,
    children: []
  }
  // 开始编译
  fragment?.childNodes[0]?.childNodes.forEach(childNode => {
    // console.log(childNode, childNode.nodeType)
    const childAST = parseNode(el, childNode, data)
    if (childAST) AST.children.push(childAST)
  })

  console.log(AST)
  return AST
}

function parseNode (parent: ChildNode, target: ChildNode, data: any) {
  if (target.nodeType === 3) {
    return parseText(parent, target, data)
  } else if (target.nodeType === 1) {
    const AST: VNode = {
      type: target.nodeName,
      el: target as any,
      parent: parent as any,
      props: null,
      children: undefined
    }

    // 此处处理props
    handleAttribute(AST, target as any, data)
    console.log((target as any).attributes)


    if (target.childNodes) {
      AST.children = []
      target?.childNodes.forEach(childNode => {
        // console.log(childNode + '&' + childNode.nodeType)
        const childAST = parseNode(target, childNode, data)
        if (childAST) AST.children.push(childAST)
      })
    }
    return AST
  } else return null
}

function deleteBlank (str: string) {
  const regBlank = /[\n\r]/g
  const parts = str.split(regBlank)
  return parts.reduce((prev, attr) => {
    attr = attr.trim()
    return attr !== '' ? prev + attr : prev
  })
}

function parseText (parent: ChildNode, target: ChildNode, data: any) {
  data
  const AST: VNode = {
    type: Text,
    el: target as any,
    parent: parent as any,
    props: null,
    children: deleteBlank(target.nodeValue) as any
  }

  // 此处处理插值语法
  ipSyntax(AST, data)
  return (AST.children as any) !== '' ? AST : null
}

const beginReg = /{{/g
const endReg = /}}/g
/**
 * 处理插值语法
 * @param AST AST树
 * @param data 数据
 */
function ipSyntax (AST: VNode, data: any) {
  const { children: content } = AST 
  if (!content || !/{{.*}}/.test(content as any)) return
  const beginMatch: number[] = []
  const endMatch: number[] = []
  for (const item of (content as any).matchAll(beginReg)) {
    beginMatch.push(item.index)
  }
  for (const item of (content as any).matchAll(endReg)) {
    endMatch.push(item.index)
  }
  // console.log(endMatch, beginMatch)
  try {
    // 分别用于指向前后缀插值
    let s = 0
    let e = 0

    // 用于标记上一次结束处
    let preEnd = 0

    // 记录插值语句
    const syntaxRes = [`\'\'`]
    while (s < beginMatch.length && e < endMatch.length) {
      const beginIndex = beginMatch[s]
      const endIndex = endMatch[e]
      if (beginIndex < endIndex) {
        if (s + 1 < beginMatch.length && beginMatch[s + 1] <= endIndex) {
          break
        } else {
          // 插值决定处
          if (preEnd !== beginIndex) {
            syntaxRes.push(`\'${content.slice(preEnd, beginIndex)}\'`)
          }
          syntaxRes.push(`(${(content.slice(beginIndex + 2, endIndex) as unknown as string).trim()})`)
          preEnd = endIndex + 2
          s++
          e++
        }
      } else throw Error('插值语法错误')
    }
    if (s < beginMatch.length || e < endMatch.length) throw Error('插值语法错误')
    if (endMatch.length > 0 && preEnd < content.length) syntaxRes.push(`\'${content.slice(preEnd, )}\'`)
    effect(new Function('AST', `
      with (this) {
        AST.children = ${syntaxRes.join('+')};
        AST.el.nodeValue = AST.children;
        // console.log(AST.el.nodeValue, '你说', AST.el);
      }
    `).bind(data, AST))
  } catch (e: any) {
    console.error(e)
  }
}

function handleAttribute (AST: VNode, target: Element, data: any) {
  const attributes = target.attributes
  if (attributes.length !== 0) AST.props = {}
  for (let i = 0; i < attributes.length; i++) {
    if(!matchCommand(attributes[i])) {
      AST.props[attributes[i].name] = attributes[i].nodeValue
    }
  }

  function matchCommand (atr: Attr) {
    if (/^@/.test(atr.name)) {
      matchEvent(atr.name.slice(1), atr.nodeValue)
      return true
    } else if (/^v\-/.test(atr.name)) {
      matchVCommand(atr.name, atr.nodeValue)
      return true
    }
    return false
  }

  function matchEvent (event: string, methodName: string) {
    if (!event || event.length === 0) return 
    const name = `on${event[0].toUpperCase() + event.slice(1)}`
    if (/\(.*\)$/.test(methodName)) {
      console.log(/(.*)$/.exec(methodName))
    } else {
      // console.log(name, methodName)
      try {
        AST.props[name] = data[methodName]
      } catch {
        console.error('没有找到对应的属性')
      }
    }
  }

  function matchVCommand (command: string, value: string) {
    switch (command) {
      case 'v-model':
        console.log(AST.el, 'begin')
        setTimeout(() => {
          AST.el.addEventListener('input', new Function('AST', `
            with (this) {
              // console.log(AST.el.value, ${value})
              ${value} = AST.el.value
            }
          `).bind(data, AST))
        })
        effect(new Function('AST', `
          with (this) {
            AST.el.value = ${value}
          }
        `).bind(data, AST))
        break
      case 'v-text':
        effect(new Function('target', `
          with (this) {
            AST.el.nodeValue = ${value}
          }
        `).bind(data, AST))
        break
      case 'v-html':
        effect(new Function('target', `
          with (this) {
            AST.el.innerHTML = ${value}
          }
        `).bind(data, AST))
        break
    }
  }
}

function moveTemplateToFragment (template: Element) {
  const fragment = document.createDocumentFragment();
  if (template.childNodes.length !== 0) {
    fragment.appendChild(template)
  }
  return fragment
}
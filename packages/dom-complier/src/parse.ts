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
  if (!content) return
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
    const syntaxRes = []
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
    effect(new Function('AST', `
      with (this) {
        AST.children = ${syntaxRes.join('+')}
        AST.el.nodeValue = AST.children
      }
    `).bind(data, AST))
  } catch (e: any) {
    console.error(e)
  }
}

function moveTemplateToFragment (template: Element) {
  const fragment = document.createDocumentFragment();
  if (template.childNodes.length !== 0) {
    fragment.appendChild(template)
  }
  return fragment
}
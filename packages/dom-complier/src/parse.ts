import {
  Fragment,
  Text,
  type VNode
} from '@ayu-plus/shared'

export function parse (template: string | Element, el: Element) {
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
  fragment.childNodes[0].childNodes.forEach(childNode => {
    // console.log(childNode, childNode.nodeType)
    const childAST = parseNode(el, childNode)
    if (childAST) AST.children.push(childAST)
  })

  console.log(AST)
  return AST
}

function parseNode (parent: ChildNode, target: ChildNode) {
  if (target.nodeType === 3) {
    return parseText(parent, target)
  } else {
    const AST: VNode = {
      type: target.nodeName,
      el: target as any,
      parent: parent as any,
      props: null,
      children: undefined
    }

    if (target.childNodes) {
      AST.children = []
      target.childNodes.forEach(childNode => {
        // console.log(childNode + '&' + childNode.nodeType)
        const childAST = parseNode(target, childNode)
        if (childAST) AST.children.push(childAST)
      })
    }
    return AST
  }
}

function deleteBlank (str: string) {
  const regBlank = /[\n\r]/g
  const parts = str.split(regBlank)
  return parts.reduce((prev, attr) => {
    attr = attr.trim()
    return attr !== '' ? prev + attr : prev
  })
}

function parseText (parent: ChildNode, target: ChildNode) {
  const AST: VNode = {
    type: Text,
    el: target as any,
    parent: parent as any,
    props: null,
    children: deleteBlank(target.nodeValue) as any
  }

  return (AST.children as any) !== '' ? AST : null
}

function moveTemplateToFragment (template: Element) {
  const fragment = document.createDocumentFragment();
  if (template.childNodes.length !== 0) {
    fragment.appendChild(template)
  }
  return fragment
}
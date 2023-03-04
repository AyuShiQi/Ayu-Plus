import { reactive } from './reactive/proxy'
import { effect } from './reactive/register'


const data = {
    ok: true,
    text: '杨诗绮',
    two: false,
    count: 0
}

export const run = () => {
    const obj = reactive(data)
    effect(printName.bind(this, obj))
    effect(beEff.bind(this, obj))
    setTimeout(() => {
        (obj as any).text = '第一次变换文本'
    }, 1000)
    setTimeout(() => {
        (obj as any).ok = false
    }, 2000)
    setTimeout(() => {
        (obj as any).text = '第二次变换文本'
    }, 3000)
    setTimeout(() => {
        (obj as any).two = true
    }, 4000)
    setTimeout(() => {
        (obj as any).count = 4
    }, 5000)
}


function printName(obj: any) {
    // 一个不同的函数不会重复effect
    effect(twoStack.bind(undefined, obj))
    obj.ok ? console.log(obj.text) : console.log('确实被修改了')
}

function twoStack(obj: any) {
    console.log(obj.ok+'栈2')
}

function beEff(obj: any) {
    console.log(obj.count++)
}
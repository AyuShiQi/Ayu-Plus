import { reactive } from './reactive/reactive'
import { effect } from './reactive/register'
import { computed } from './reactive/computed'


const data = {
    ok: true,
    text: '杨诗绮',
    two: false,
    count: 0,
    el: {
        name: 'ysq'
    }
}

const ar: number[] = [1]

export const run = () => {
    const arr: any = reactive(ar)
    const obj: any = reactive(data)
    const map: any = reactive(new Map())
    const set: any = reactive(new Set());
    effect(() => {
        console.log(map.size, ' ', set.size)
    })
    effect(() => {
        for(const [key, val] of map.entries()) {
            console.log(key, val)
        }
    })
    effect(() => {
        for(const val of map.values()) {
            console.log('val', val)
        }
        for(const val of map.keys()) {
            console.log('key', val)
        }
    })
    // effect(() => {
    //     for(const key of set) {
    //         console.log('set', key)
    //     }
    // })
    setTimeout(() => {
        map.set(1,2)
    }, 1000)
    setTimeout(() => {
        map.set(1,3)
    }, 2000)
    setTimeout(() => {
        map.set(2, 4)
    }, 3000)
    setTimeout(() => {
        set.add(2)
    }, 4000)
    // effect(printName.bind(this, obj))
    // effect(beEff.bind(this, obj))
    // effect(print.bind(this, obj))
    // effect(beForIn.bind(this, obj))
    // const ac = computed(() => {
    //     return 'computed' + (obj as any).text + (obj as any).two
    // })
    // effect(function () {
    //     console.log(arr.length)
    //     console.log(arr)
    // })
    // effect(function () {
    //     for(const i of arr) {
    //         console.log(i)
    //     }
    // })
    // effect(function () {
    //     console.log('effect1', arr.length)
    //     arr.push(233)
    // })
    // effect(function () {
    //     console.log('effect2', arr.length)
    //     arr.push(123)
    // })
    // setTimeout(() => {
    //     arr.length = 2
    // }, 1000)
    // setTimeout(() => {
    //     console.log(arr)
    // }, 3000)
    // setTimeout(() => {
    //     arr.length = 1
    // }, 3000)
    // setTimeout(() => {
        
    // }, 1000)
    // effect(function lookComputed() {
    //     console.log(ac.value)
    // })
    // setTimeout(() => {
    //     (obj as any).text = '第一次变换文本'
    // }, 1000)
    // setTimeout(() => {
    //     (obj as any).ok = false
    // }, 2000)
    // setTimeout(() => {
    //     (obj as any).text = '第二次变换文本'
    // }, 3000)
    // setTimeout(() => {
    //     (obj as any).two = true
    // }, 4000)
    // setTimeout(() => {
    //     (obj as any).count = 4
    // }, 5000)
    // setTimeout(() => {
    //     lookShallow(obj)
    // }, 6000)
    // setTimeout(() => {
    //     console.log(obj)
    // }, 7000)
}


function printName(obj: any) {
    // 一个不同的函数不会重复effect
    effect(twoStack.bind(undefined, obj))
    obj.ok ? console.log(obj.text) : console.log('确实被修改了')
}

function twoStack(obj: any) {
    console.log(obj.ok+'栈2')
}

function print(obj: any) {
    console.log('看深层响应',obj.el.name)
}

function beEff(obj: any) {
    console.log(obj.count++)
}

function beForIn(obj: any) {
    let str = ''
    for(const k in obj) {
        str += k
    }
    console.log(str)
}

function lookShallow(obj: any) {
    obj.el.name = 'lss'
}
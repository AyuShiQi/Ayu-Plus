// trigger type
export default class {
    static readonly SET: 'set'
    static readonly DELETE: 'delete'
    static readonly ADD: 'add'

    constructor() {
        throw new SyntaxError('我现在假装它是一个接口，构造实例达咩达咩')
    }
}
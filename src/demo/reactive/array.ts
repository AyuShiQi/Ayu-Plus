import { shouldTrack } from './state';
import { activeFn } from './register';

export const arrayInstrumentations: any = {};

['includes', 'lastIndexOf', 'indexOf'].forEach(method => {
    const originMethod = Array.prototype[method as any]
    arrayInstrumentations[method] = function(...arg: any): boolean {
        let res = originMethod.apply(this, arg)
        if(res === false) {
            res = originMethod.apply(this.raw, arg)
        }
        return res
    }
});

['push','shift', 'unshift', 'pop', 'splice'].forEach(method => {
    // 也就是调用这些会直接改变length的栈方法的函数，不可以被添加入副作用函数执行名单
    const originMethod = Array.prototype[method as any]
    arrayInstrumentations[method] = function(...arg: any): boolean {
        shouldTrack.value = false
        // 自己加的，目的是认证禁止追踪的函数是否是本身
        shouldTrack.target.add(activeFn)
        let res = originMethod.apply(this, arg)
        shouldTrack.value = true;
        return res
    }
})
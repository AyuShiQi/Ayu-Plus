export const arrayInstrumentations: any = {};

['includes', 'lastIndexOf', 'indexOf'].forEach(method => {
    const originMethod = Array.prototype[method as any]
    arrayInstrumentations[method] = function(arg: any): boolean {
        let res = originMethod.apply(this, arg)

        if(res === false) {
            res = originMethod.apply(this.raw, arg)
        }

        return res
    }
})
// 找到最长上升子序列
export default function longest(arr: number[]): number[] {
    const dp = new Array<[number, number]>(arr.length)
    dp[0] = [1, -1]
    let max = dp[0]
    let m = 0
    for(let i = 1; i < arr.length; i++) {
        const cur: [number, number] = [0, 0]
        const now = arr[i]
        for(let j = i - 1; j >= 0; j--) {
            if(arr[j]<now) {
                if(dp[j][0] + 1 > cur[0]) {
                    cur[0] = dp[j][0] + 1
                    cur[1] = j
                }
            }
        }
        dp[i] = cur
        if(cur[0]>max[0]) {
            max = cur
            m = i
        }
    }
    const res = new Array<number>(max[0])
    do {
        res[max[0]-1] = m
        m = max[1]
        max = dp[m]
    } while(m!==-1)
    return res
}
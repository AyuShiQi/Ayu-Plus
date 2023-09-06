export function lis<T extends number> (target: T[], fn: (a: T, b: T) => number = (a, b) => a - b) {
  let start = 0
  let len = 1

  let maxStart = 0
  let maxLen = 1
  for (let i = 1; i < target.length; i++) {
    if (fn(target[i-1], target[i]) <= 0) {
      len++
    } else {
      if (len > maxLen) {
        maxLen = len
        maxStart = start
      }
      start = i
      len = 1
    }
  }

  const res = []
  for (let i = maxStart; i < maxStart + maxLen; i++) {
    res.push(i)
  }

  return res
}

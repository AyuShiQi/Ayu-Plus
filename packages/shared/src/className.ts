export function normalizeClass (value: any): string {
  const classList: string[] = []
  if (typeof value === 'string') {
    return value
  // 说明是数组形式的
  } else if (value instanceof Array) {
    for (const item of value) {
      classList.push(normalizeClass(item))
    }
  } else if (value instanceof Object) {
    for (const key in value) {
      const val = value[key]
      if (!!val) {
        classList.push(key)
      }
    }
  }
  return classList.join(' ')
}

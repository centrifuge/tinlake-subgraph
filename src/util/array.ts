export function push(arr: string[], item: string): string[] {
  if (!arr.includes(item)) {
    let temp = arr
    temp.push(item)
    return temp
  }
  return arr
}

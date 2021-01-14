export function pushUnique(arr: string[], item: string): string[] {
  if (!arr.includes(item)) {
    let temp = arr
    temp.push(item)
    return temp
  }
  return arr
}

export function pushOrMoveLast(arr: string[], item: string): string[] {
  let temp = arr.filter((a) => a !== item)
  temp.push(item)
  return temp
}

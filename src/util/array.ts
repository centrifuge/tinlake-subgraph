export function pushUnique(arr: string[], item: string): string[] {
  if (!arr.includes(item)) {
    let temp = arr
    temp.push(item)
    return temp
  }
  return arr
}

export function pushOrMoveLast(arr: string[], item: string): string[] {
  let temp = filter(arr, item)
  temp.push(item)
  return temp
}

// AssemblyScript doesn't support closures so we need our own filter function
function filter(arr: string[], item: string):string[] {
  let output: string[] = []
  for (let i = 0; i<arr.length; i++) {
    if (arr[i] !== item) {
      output.push(arr[i])
    }
  }
  return output
}
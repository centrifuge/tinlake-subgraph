import { Proxy } from '../../generated/schema'
import { Created } from '../../generated/ProxyRegistry/ProxyRegistry'

export function handleCreateProxy(event: Created): void {
  let proxy = new Proxy(event.params.proxy.toHex())
  proxy.owner = event.params.owner
  proxy.save()
}

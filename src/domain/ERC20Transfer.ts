import { ERC20Transfer } from '../../generated/schema'
import { Transfer as TransferEvent } from '../../generated/Block/ERC20'

export function createERC20Transfer(id: string, event: TransferEvent, poolId: string): ERC20Transfer {
  let transfer = new ERC20Transfer(id)
  transfer.transaction = event.transaction.hash.toHex()
  transfer.token = event.address.toHex()
  transfer.from = event.params.src.toHex()
  transfer.to = event.params.dst.toHex()
  transfer.amount = event.params.wad
  transfer.pool = poolId
  transfer.save()
  return transfer
}

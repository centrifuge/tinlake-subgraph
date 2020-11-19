import { log, dataSource } from '@graphprotocol/graph-ts'
import { Transfer as TransferEvent } from '../../generated/Block/ERC20'
import { ERC20Transfer } from '../../generated/schema'
import { createERC20Transfer } from '../domain/ERC20Transfer'
import { loadOrCreateToken } from '../domain/Token'
import { loadOrCreateTokenBalanceSrc, loadOrCreateTokenBalanceDst } from '../domain/TokenBalance'
import { updateAccounts } from '../domain/Account'

export function handleERC20Transfer(event: TransferEvent): void {
  let tokenAddress = dataSource.context().getString('tokenAddress')
  log.debug('handleERC20Transfer: token {}, from {}, to {}, amount {}', [
    tokenAddress,
    event.params.src.toHex(),
    event.params.dst.toHex(),
    event.params.wad.toString(),
  ])
  let token = loadOrCreateToken(tokenAddress)

  if (!token.owners.includes(event.params.dst.toHex())) {
    log.debug('handleERC20Transfer: adding owner {}', [event.params.dst.toHex()])
    let owners = token.owners
    // only push dst as owners
    owners.push(event.params.dst.toHex())
    token.owners = owners
    token.save()
  }

  loadOrCreateTokenBalanceDst(event, tokenAddress)
  loadOrCreateTokenBalanceSrc(event, tokenAddress)
  updateAccounts(event)

  let id = event.block.number
    .toString()
    .concat('-')
    .concat(event.logIndex.toString())
  if (ERC20Transfer.load(id) == null) {
    createERC20Transfer(id, event, dataSource.context().getString('id'))
  }
}

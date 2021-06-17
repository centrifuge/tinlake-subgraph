import { log, dataSource } from '@graphprotocol/graph-ts'
import { Transfer as TransferEvent } from '../../generated/Block/ERC20'
import { ERC20Transfer } from '../../generated/schema'
import { createERC20Transfer } from '../domain/ERC20Transfer'
import { loadOrCreateToken } from '../domain/Token'
import { loadOrCreateTokenBalance } from '../domain/TokenBalance'
import { isSystemAccount } from '../domain/Account'
import { pushUnique } from '../util/array'

export function handleERC20Transfer(event: TransferEvent): void {
  let tokenAddress = dataSource.context().getString('tokenAddress')
  let poolId = dataSource.context().getString('id')

  log.info('handleERC20Transfer: token {}, from {}, to {}, amount {}', [
    tokenAddress,
    event.params.src.toHex(),
    event.params.dst.toHex(),
    event.params.wad.toString(),
  ])

  let token = loadOrCreateToken(tokenAddress)
  let src = event.params.src.toHex()
  let dst = event.params.dst.toHex()
  if (!isSystemAccount(poolId, dst)) {
    log.info('handleERC20Transfer: adding owner {}', [dst])
    // only push dst as owners
    token.owners = pushUnique(token.owners, dst)
    token.save()
    let tb = loadOrCreateTokenBalance(dst, tokenAddress)
    tb.balanceAmount = tb.balanceAmount.plus(event.params.wad)
    tb.totalAmount = tb.balanceAmount.plus(tb.supplyAmount)
    tb.save()
  }
  if (!isSystemAccount(poolId, src)) {
    let tb = loadOrCreateTokenBalance(src, tokenAddress)
    tb.balanceAmount = tb.balanceAmount.minus(event.params.wad)
    tb.totalAmount = tb.balanceAmount.minus(tb.supplyAmount)
    tb.save()
  }

  let id = event.block.number
    .toString()
    .concat('-')
    .concat(event.logIndex.toString())
  if (ERC20Transfer.load(id) == null) {
    createERC20Transfer(id, event, dataSource.context().getString('id'))
  }
}

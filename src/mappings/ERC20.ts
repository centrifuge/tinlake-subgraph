import { Transfer as TransferEvent } from '../../generated/Block/ERC20'
import { ERC20Transfer } from "../../generated/schema"
import { poolFromIdentifier } from "../util/pool"
import { createERC20Transfer } from '../domain/ERC20Transfer'
import { createToken } from "../domain/Token";
import { loadOrCreateTokenBalanceSrc, loadOrCreateTokenBalanceDst } from "../domain/TokenBalance";
import { updateAccounts } from "../domain/Account";

export function handleERC20Transfer(event: TransferEvent): void {
  createToken(event);
  loadOrCreateTokenBalanceDst(event);
  loadOrCreateTokenBalanceSrc(event);
  updateAccounts(event);

  let poolMeta = poolFromIdentifier(event.address.toHex());
  let id = event.block.number
    .toString()
    .concat("-")
    .concat(event.logIndex.toString());
  if (ERC20Transfer.load(id) == null) {
    createERC20Transfer(id, event, poolMeta);
  }
}

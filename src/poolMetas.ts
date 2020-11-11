export type network = string // 'mainnet' | 'kovan' does not work in AssemblyScript
export type version = number // 2 | 3

// NOTE: interfaces are not supported by AssemblyScript
export class PoolMeta {
  shortName: string
  id: string // root contract address
  shelf: string // shelf contract address
  pile: string // pile contract address
  nftFeed: string // NFT or NAV feed contract address
  assessor: string // assessor contract address
  juniorTranche: string
  seniorTranche: string // senior tranche contract address
  seniorToken: string
  juniorToken: string
  reserve: string
  networkId: network
  startBlock: number // block where root contract was deployed
  version: version
}

// NOTE: the following addresses all need to be lower case. Also note that AssemblyScript does not support
// .toLowerCase()
export let poolMetas: PoolMeta[] = [
  // Mainnet production
  // CF4
  // {
  //   shortName: "ConsolFreight 4",
  //   id: "0xdb3bc9fb1893222d266762e9ff857eb74d75c7d6",
  //   shelf: "0xa0b0d8394adc79f5d1563a892abfc6186e519644",
  //   pile: "0x3fc72da5545e2ab6202d81fbeb1c8273be95068c",
  //   nftFeed: "0x69504da6b2cd8320b9a62f3aed410a298d3e7ac6",
  //   assessor: "0x6aaf2ee5b2b62fb9e29e021a1bf3b381454d900a",
  //   juniorTranche: "0x145d6256e20cd115eda44eb9258a3bc13c2a86fc",
  //   seniorTranche: "0xb101ed16ad86cb5cc92dadc357ad994ab6c663a5",
  //   seniorToken: "0x5b2f0521875b188c0afc925b1598e1ff246f9306",
  //   juniorToken: "0x05dd145aa26dbdcc7774e4118e34bb67c64661c6",
  //   reserve: "0x0d601b451afd502e473ba4ce6e3876d652bcbee7",
  //   networkId: "mainnet",
  //   startBlock: 11063166, // root deploy transaction, not root contract creation
  //   version: 3,
  // },
  // // BL1
  // {
  //   shortName: "Bling Series 1",
  //   id: "0x0ced6166873038ac0cc688e7e6d19e2cbe251bf0",
  //   shelf: "0xcfad06adacf221f8119995c8bca25184a6b5a268",
  //   pile: "0x05739c677286d38ccbf0ffc8f9cdbd45904b47fd",
  //   nftFeed: "0x1621b607a62dac0dc2e4044ff1235a30f135cbd2",
  //   assessor: "0x2b8fea4eedb43fca58ccb063221fae5858b47538",
  //   juniorTranche: "0x184cd2ba59c3a14f1770ebde41c0f3a1cb61a98f",
  //   seniorTranche: "0x56a128820d8c30181634162a49f79c22ba799fd2",
  //   seniorToken: "0x1aefc15de9c2e1ebb97146c3c2cdc4fc0ad539bc",
  //   juniorToken: "0xac1c0f9e1fb54694f43754b044b464b981554d8d",
  //   reserve: "0x932344ba99bf34035b4bc25cbd98f912ebc60371",
  //   networkId: "mainnet",
  //   startBlock: 11197245,
  //   version: 3,
  // },

  // Kovan Revolving Pool 1
  {
    shortName: "Kovan Revolving 1",
    id: "0xc4084221fb5d0f28f817c795435c2d17eab6c389",
    shelf: "0xc7e4515fb85bb5ba1a76a8624e2ab563b4dea8af",
    pile: "0x82ee3f4b872d2a53b7b5cf2bd88ebc8736914407",
    nftFeed: "0x677b85998f15921982b1548763f01ac6c265b8eb",
    assessor: "0x8b80927fca02566c29728c4a620c161f63116953",
    seniorTranche: "0x88ad5b21a01d838b15619f36f88b618410797b95",
    juniorTranche: "0xd36fe8e53a25376014b0ea7b5533c2e0b0fcd227",
    seniorToken: "0x085c3f24dc6b4131a5620a28702101d163ac7798",
    juniorToken: "0x3173244a39d3e918f3e27f6765f2438006c90e73",
    reserve: "0xa590f0f6b627b9e0a63e5062eed4dfcbbef7fced",
    networkId: "kovan",
    startBlock: 21406294,
    version: 3,
  },
];

// lookup that contains the pool by associated address or poolId
export let poolMetaByIdentifier = new Map<string, PoolMeta>()
for (let i = 0; i < poolMetas.length; i++) {
  poolMetaByIdentifier.set(poolMetas[i].id, poolMetas[i])
  poolMetaByIdentifier.set(poolMetas[i].shelf, poolMetas[i])
  poolMetaByIdentifier.set(poolMetas[i].pile, poolMetas[i])
  poolMetaByIdentifier.set(poolMetas[i].nftFeed, poolMetas[i])
  poolMetaByIdentifier.set(poolMetas[i].assessor, poolMetas[i])
  poolMetaByIdentifier.set(poolMetas[i].seniorTranche, poolMetas[i])
  poolMetaByIdentifier.set(poolMetas[i].juniorTranche, poolMetas[i])
  poolMetaByIdentifier.set(poolMetas[i].seniorToken, poolMetas[i])
  poolMetaByIdentifier.set(poolMetas[i].juniorToken, poolMetas[i])
  poolMetaByIdentifier.set(poolMetas[i].reserve, poolMetas[i])
}

export let poolStartBlocks = new Map<number, boolean>()
for (let i = 0; i < poolMetas.length; i++) {
  poolStartBlocks.set(poolMetas[i].startBlock, true)
}

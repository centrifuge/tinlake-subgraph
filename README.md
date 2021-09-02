# tinlake-subgraph
Subgraph for the Tinlake applications.

## Deployment

### Mainnet production

```
graph auth https://api.thegraph.com/deploy/ ACCESS_TOKEN
yarn run codegen ./subgraph-mainnet-production.yaml
yarn run deploy centrifuge/tinlake ./subgraph-mainnet-production.yaml
```

### Kovan staging

```
graph auth https://api.thegraph.com/deploy/ ACCESS_TOKEN
yarn run codegen ./subgraph-kovan-staging.yaml
yarn run deploy centrifuge/tinlake-kovan-staging ./subgraph-kovan-staging.yaml
```

### Goerli staging

```
graph auth https://api.thegraph.com/deploy/ ACCESS_TOKEN
yarn run codegen ./subgraph-goerli-staging.yaml
yarn run deploy centrifuge/tinlake-goerli ./subgraph-goerli-staging.yaml
```

## Query data

Kovan staging playground: https://thegraph.com/explorer/subgraph/centrifuge/tinlake-kovan-staging

### Get all loans

```
{ loans {
    id
    pool {
      id
    }
    index
    owner
    opened
    closed
    debt
    interestRatePerSecond
    ceiling
    threshold
    borrowsCount
    borrowsAggregatedAmount
    repaysCount
    repaysAggregatedAmount
    nftId,
    nftRegistry
  }
}
```

### Get all pools

```
{
  pools {
    id
    loans {
      id
    }
    totalDebt
    totalBorrowsCount
    totalBorrowsAggregatedAmount
    weightedInterestRate
    seniorDebt
    minJuniorRatio
    currentJuniorRatio
  }
```

## Testing

```
yarn test
```

## Deployment

In case you have made changes to the abi files or entities run

```
yarn run codegen ./subgraph-mainnet-production.yaml
```

### Mainnet production

```
graph auth https://api.thegraph.com/deploy/ ACCESS_TOKEN
yarn run deploy centrifuge/tinlake ./subgraph-mainnet-production.yaml
```

### Kovan staging

```
graph auth https://api.thegraph.com/deploy/ ACCESS_TOKEN
yarn run deploy centrifuge/tinlake-kovan-staging ./subgraph-kovan-staging.yaml
```

## Query data

Mainnet staging playground: https://thegraph.com/explorer/subgraph/centrifuge/tinlake-staging

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

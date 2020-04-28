## Deployment
override the name of the graph you want to deploy in the deploy script in package.json
default: centrifuge/tinlake.
In case you have made changes to the abi files or entities run

```
yarn run codegen
```

### auth for deployment

### testgraph/tinlake
```
graph auth https://api.thegraph.com/deploy/ YOUR_ACCESS_TOKEN
yarn run deploy
```

## Query data
kovan playground: https://thegraph.com/explorer/subgraph/centrifuge/tinlake
### get all loans 
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

### get all pools
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



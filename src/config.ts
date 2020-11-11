export const secondsInDay = 86400

export const handleBlockFrequencyMinutes = 5
export const blockTimeSeconds = 15

// the fast forward block should be
// updated to the latest block before every new deployment
// for optimal optimization
// TODO: set dependent on dataSource.network()
export const fastForwardUntilBlock = 11197245 
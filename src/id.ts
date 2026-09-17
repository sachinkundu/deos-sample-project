export interface CryptoLike {
  randomUUID?: () => string
}

export interface IdGenerator {
  candidate(): string
}

export function createBrowserIdGenerator(
  cryptoLike: CryptoLike | undefined = globalThis.crypto,
  now: () => number = Date.now,
): IdGenerator {
  let fallbackCounter = 0

  return {
    candidate() {
      try {
        if (typeof cryptoLike?.randomUUID === 'function') {
          return cryptoLike.randomUUID()
        }
      } catch {
        // A blocked or non-secure context uses the local identity fallback.
      }

      fallbackCounter += 1
      return `local-${now().toString(36)}-${fallbackCounter.toString(36)}`
    },
  }
}

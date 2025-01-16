type URLMatchEvent = 'onFirstMatch' | 'onEveryMatch' | 'onNoMatch'
type URLMatchCallback = (param: string) => void

interface URLMatcherConfig {
  queryParam: string
  targetValues?: string[]
}

interface URLMatchEvents {
  onFirstMatch?: URLMatchCallback
  onEveryMatch?: URLMatchCallback
  onNoMatch?: URLMatchCallback
}

class URLMatcher {
  private config: Required<URLMatcherConfig>
  private eventCallbacks: Map<URLMatchEvent, Map<string, Set<URLMatchCallback>>>
  private hasMatched: Map<string, boolean>
  private initialized: boolean = false
  private currentValue: string | null = null
  private initialURLChecked: boolean = false

  constructor(config: URLMatcherConfig) {
    this.config = {
      queryParam: config.queryParam,
      targetValues: config.targetValues || [],
    }

    this.eventCallbacks = new Map()
    this.hasMatched = new Map()
    ;['onFirstMatch', 'onEveryMatch', 'onNoMatch'].forEach(event => {
      this.eventCallbacks.set(event as URLMatchEvent, new Map())
    })

    this.config.targetValues.forEach(value => {
      this.initializeValueEvents(value)
    })

    // DOM yüklenmesini bekle
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init())
    } else {
      this.init()
    }
  }

  private init(): void {
    if (this.initialized) return

    // URL değişikliklerini dinle
    const checkURLBound = this.checkURL.bind(this)
    window.addEventListener('popstate', checkURLBound)
    window.addEventListener('hashchange', checkURLBound)

    // History API metodlarını wrap et
    const originalPushState = history.pushState.bind(history)
    const originalReplaceState = history.replaceState.bind(history)

    history.pushState = (...args) => {
      originalPushState(...args)
      this.checkURL()
    }

    history.replaceState = (...args) => {
      originalReplaceState(...args)
      this.checkURL()
    }

    this.initialized = true

    // İlk URL kontrolünü en son yap
    // Bu sayede tüm event listener'lar hazır olacak
    setTimeout(() => {
      if (!this.initialURLChecked) {
        this.checkURL()
        this.initialURLChecked = true
      }
    }, 0)
  }

  private initializeValueEvents(value: string): void {
    this.eventCallbacks.forEach(eventMap => {
      if (!eventMap.has(value)) {
        eventMap.set(value, new Set())
      }
    })
    this.hasMatched.set(value, false)
  }

  private checkURL(): void {
    const urlParams = new URLSearchParams(window.location.search)
    const paramValue = urlParams.get(this.config.queryParam)

    if (this.currentValue !== paramValue) {
      // Eski değer için noMatch event'ini tetikle
      if (
        this.currentValue &&
        this.config.targetValues.includes(this.currentValue)
      ) {
        this.triggerEvent('onNoMatch', this.currentValue)
      }

      // Yeni değer için event'leri tetikle
      if (paramValue && this.config.targetValues.includes(paramValue)) {
        const hasMatchedBefore = this.hasMatched.get(paramValue)

        if (!hasMatchedBefore) {
          this.triggerEvent('onFirstMatch', paramValue)
          this.hasMatched.set(paramValue, true)
        }

        this.triggerEvent('onEveryMatch', paramValue)
      }

      this.currentValue = paramValue
    }
  }

  private triggerEvent(event: URLMatchEvent, value: string): void {
    const eventMap = this.eventCallbacks.get(event)
    const callbacks = eventMap?.get(value)
    if (callbacks) {
      callbacks.forEach(callback => callback(value))
    }
  }

  public on(
    event: URLMatchEvent,
    value: string,
    callback: URLMatchCallback,
  ): void {
    if (!this.config.targetValues.includes(value)) {
      this.config.targetValues.push(value)
      this.initializeValueEvents(value)
    }

    const eventMap = this.eventCallbacks.get(event)
    eventMap?.get(value)?.add(callback)

    // Eğer sayfa zaten yüklendiyse ve ilk URL kontrolü yapılmadıysa, kontrol et
    if (this.initialized && !this.initialURLChecked) {
      this.checkURL()
      this.initialURLChecked = true
    }
  }

  public getCurrentValue(): string | null {
    return this.currentValue
  }

  public off(
    event: URLMatchEvent,
    value: string,
    callback: URLMatchCallback,
  ): void {
    const eventMap = this.eventCallbacks.get(event)
    eventMap?.get(value)?.delete(callback)
  }

  public reset(): void {
    this.hasMatched.clear()
    this.config.targetValues.forEach(value => {
      this.hasMatched.set(value, false)
    })
    this.currentValue = null
    this.checkURL()
  }

  public destroy(): void {
    window.removeEventListener('popstate', () => this.checkURL())
    window.removeEventListener('hashchange', () => this.checkURL())
    this.eventCallbacks.clear()
    this.hasMatched.clear()
    this.currentValue = null
  }
}

export { URLMatcher }
export type {
  URLMatcherConfig,
  URLMatchCallback,
  URLMatchEvent,
  URLMatchEvents,
}

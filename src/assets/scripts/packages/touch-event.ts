export class TouchDirectionDetector {
  private element: HTMLElement;
  private startX: number = 0;
  private startY: number = 0;
  private threshold: number;
  private onSwipeCallback?: (direction: "left" | "right") => void;
  private isHorizontalSwipe: boolean = false;

  constructor(
    elementId: string,
    options: {
      threshold?: number;
      onSwipe?: (direction: "left" | "right") => void;
    } = {},
  ) {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found.`);
    }
    this.element = element;
    this.threshold = options.threshold || 50;

    // If onSwipe callback is provided in constructor, set it immediately
    if (options.onSwipe) {
      this.onSwipeCallback = options.onSwipe;
    }

    this.setupTouchListeners();
    // Sadece yatay kaydırmayı engelle, dikey scroll'a izin ver
    this.element.style.touchAction = "pan-y";
  }

  private setupTouchListeners(): void {
    this.element.addEventListener(
      "touchstart",
      this.handleTouchStart.bind(this),
      { passive: true },
    );
    this.element.addEventListener(
      "touchmove",
      this.handleTouchMove.bind(this),
      { passive: false },
    );
    this.element.addEventListener("touchend", this.handleTouchEnd.bind(this), {
      passive: true,
    });
  }

  private handleTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.isHorizontalSwipe = false;
  }

  private handleTouchMove(event: TouchEvent): void {
    if (!event.touches[0]) return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - this.startX;
    const deltaY = touch.clientY - this.startY;

    // Hareketin yönünü belirle
    if (!this.isHorizontalSwipe) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        this.isHorizontalSwipe = true;
      }
    }

    // Sadece yatay kaydırma ise eventi engelle
    if (this.isHorizontalSwipe) {
      event.preventDefault();
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    if (!event.changedTouches[0]) return;

    // Eğer yatay kaydırma tespit edildiyse
    if (this.isHorizontalSwipe) {
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - this.startX;
      if (Math.abs(deltaX) >= this.threshold && this.onSwipeCallback) {
        this.onSwipeCallback(deltaX > 0 ? "right" : "left");
      }
    }
  }

  public onSwipe(callback: (direction: "left" | "right") => void): void {
    this.onSwipeCallback = callback;
  }

  public destroy(): void {
    this.element.removeEventListener(
      "touchstart",
      this.handleTouchStart.bind(this),
    );
    this.element.removeEventListener(
      "touchmove",
      this.handleTouchMove.bind(this),
    );
    this.element.removeEventListener(
      "touchend",
      this.handleTouchEnd.bind(this),
    );
  }
}

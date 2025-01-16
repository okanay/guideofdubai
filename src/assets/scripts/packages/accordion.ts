interface AccordionConfig {
  container: string;
  accordionSelector?: string;
  toggleButtonSelector?: string;
  contentSelector?: string;
  iconSelector?: string;
  defaultOpenIndex?: number;
  closeOthersOnOpen?: boolean;
  animation?: {
    duration: number;
    timingFunction: string;
    enabled: boolean;
  };
  attributes?: {
    stateAttribute?: string;
    expandedAttribute?: string;
    hiddenAttribute?: string;
  };
  classes?: {
    activeClass?: string;
    inactiveClass?: string;
  };
  onToggle?: (index: number, isOpen: boolean) => void;
}

class AccordionController {
  private accordions: NodeListOf<Element>;
  private config: Required<AccordionConfig>;
  private resizeTimeout: number | null = null;

  constructor(config: AccordionConfig) {
    this.config = {
      container: config.container,
      accordionSelector: config.accordionSelector || ".accordion",
      toggleButtonSelector: config.toggleButtonSelector || ".accordion-toggle",
      contentSelector: config.contentSelector || ".accordion-content",
      iconSelector: config.iconSelector || ".accordion-icon",
      defaultOpenIndex: config.defaultOpenIndex ?? 0,
      closeOthersOnOpen: config.closeOthersOnOpen ?? true,
      animation: {
        duration: config.animation?.duration ?? 300,
        timingFunction: config.animation?.timingFunction ?? "ease",
        enabled: config.animation?.enabled ?? true,
      },
      attributes: {
        stateAttribute: config.attributes?.stateAttribute ?? "data-state",
        expandedAttribute:
          config.attributes?.expandedAttribute ?? "aria-expanded",
        hiddenAttribute: config.attributes?.hiddenAttribute ?? "aria-hidden",
      },
      classes: {
        activeClass: config.classes?.activeClass ?? "accordion-active",
        inactiveClass: config.classes?.inactiveClass ?? "accordion-inactive",
      },
      onToggle: config.onToggle || (() => {}),
    };

    const container = document.querySelector(this.config.container);
    if (!container)
      throw new Error(`Container ${this.config.container} not found`);

    this.accordions = document.querySelectorAll(this.config.accordionSelector);

    // Window resize event listener ekle
    window.addEventListener("resize", this.handleWindowResize.bind(this));

    this.init();
  }

  private handleWindowResize(): void {
    // Performans için debounce uygula
    if (this.resizeTimeout) {
      window.clearTimeout(this.resizeTimeout);
    }

    this.resizeTimeout = window.setTimeout(() => {
      this.recalculateHeights();
    }, 150);
  }

  // Dışarıdan erişilebilir recalculate metodu
  public recalculate(): void {
    this.recalculateHeights();
  }

  private recalculateHeights(): void {
    this.accordions.forEach((accordion) => {
      const content = accordion.querySelector(
        this.config.contentSelector,
      ) as HTMLElement;

      if (!content) return;

      const isOpen =
        accordion.getAttribute(this.config.attributes.stateAttribute!) ===
        "open";

      if (isOpen) {
        // Geçici height hesaplaması için klon oluştur
        const clone = content.cloneNode(true) as HTMLElement;
        clone.style.height = "auto";
        clone.style.position = "fixed";
        clone.style.visibility = "hidden";
        document.body.appendChild(clone);

        const newHeight = clone.scrollHeight;
        document.body.removeChild(clone);

        // Animasyonlu şekilde yeni height'a geç
        content.style.height = `${newHeight}px`;
      }
    });
  }

  private init(): void {
    // İlk olarak tüm iconların transition'larını devre dışı bırak
    this.accordions.forEach((accordion) => {
      const icon = accordion.querySelector(
        this.config.iconSelector,
      ) as HTMLElement;
      if (icon) {
        icon.style.transition = "none";
      }
    });

    this.accordions.forEach((accordion, index) => {
      if (index === this.config.defaultOpenIndex) {
        this.setInitialStateForDefault(accordion);
      } else {
        this.setInitialState(accordion);
      }

      const button = accordion.querySelector(this.config.toggleButtonSelector);
      if (button) {
        button.addEventListener("click", () => {
          this.toggleAccordion(accordion, index);
        });
      }
    });

    // İlk render'dan sonra tüm transition'ları etkinleştir
    setTimeout(() => {
      this.accordions.forEach((accordion) => {
        const content = accordion.querySelector(
          this.config.contentSelector,
        ) as HTMLElement;
        const icon = accordion.querySelector(
          this.config.iconSelector,
        ) as HTMLElement;

        if (content) {
          content.style.transition = this.config.animation.enabled
            ? `height ${this.config.animation.duration}ms ${this.config.animation.timingFunction}`
            : "none";
        }

        if (icon) {
          icon.style.transition = "transform 300ms";
        }
      });
    }, 0);
  }

  private setInitialStateForDefault(accordion: Element): void {
    const { stateAttribute, expandedAttribute, hiddenAttribute } =
      this.config.attributes;
    const { activeClass, inactiveClass } = this.config.classes;

    accordion.setAttribute(stateAttribute!, "open");
    accordion.classList.add(activeClass!);
    accordion.classList.remove(inactiveClass!);

    const content = accordion.querySelector(
      this.config.contentSelector,
    ) as HTMLElement;
    const button = accordion.querySelector(this.config.toggleButtonSelector);
    const icon = accordion.querySelector(
      this.config.iconSelector,
    ) as HTMLElement;

    if (content && button) {
      button.setAttribute(expandedAttribute!, "true");
      content.setAttribute(hiddenAttribute!, "false");

      // Animasyonsuz direkt aç
      content.style.transition = "none";
      content.style.height = "auto";
      const height = content.scrollHeight;
      content.style.height = `${height}px`;

      // Icon'u animasyonsuz rotate et
      if (icon) {
        icon.style.transform = "rotate(180deg)";
      }
    }
  }

  private setInitialState(accordion: Element): void {
    const { stateAttribute, expandedAttribute, hiddenAttribute } =
      this.config.attributes;
    const { inactiveClass } = this.config.classes;

    accordion.setAttribute(stateAttribute!, "closed");
    accordion.classList.add(inactiveClass!);

    const content = accordion.querySelector(
      this.config.contentSelector,
    ) as HTMLElement;
    const button = accordion.querySelector(this.config.toggleButtonSelector);
    const icon = accordion.querySelector(
      this.config.iconSelector,
    ) as HTMLElement;

    if (content && button) {
      button.setAttribute(expandedAttribute!, "false");
      content.setAttribute(hiddenAttribute!, "true");
      content.style.transition = "none";
      content.style.height = "0px";

      // Icon'u başlangıç pozisyonuna getir
      if (icon) {
        icon.style.transform = "rotate(0deg)";
      }
    }
  }

  private toggleAccordion(accordion: Element, index: number): void {
    const { stateAttribute, expandedAttribute, hiddenAttribute } =
      this.config.attributes;
    const { activeClass, inactiveClass } = this.config.classes;

    const content = accordion.querySelector(
      this.config.contentSelector,
    ) as HTMLElement;
    const button = accordion.querySelector(this.config.toggleButtonSelector);
    const icon = accordion.querySelector(
      this.config.iconSelector,
    ) as HTMLElement;
    const isOpen = accordion.getAttribute(stateAttribute!) === "open";

    if (!content || !button) return;

    if (isOpen) {
      accordion.setAttribute(stateAttribute!, "closed");
      accordion.classList.remove(activeClass!);
      accordion.classList.add(inactiveClass!);
      button.setAttribute(expandedAttribute!, "false");
      content.setAttribute(hiddenAttribute!, "true");
      content.style.height = "0px";

      if (icon) {
        icon.style.transform = "rotate(0deg)";
      }

      this.config.onToggle(index, false);
    } else {
      // closeOthersOnOpen opsiyonuna göre diğer accordionları kapat
      if (this.config.closeOthersOnOpen) {
        this.closeOtherAccordions(accordion);
      }

      accordion.setAttribute(stateAttribute!, "open");
      accordion.classList.add(activeClass!);
      accordion.classList.remove(inactiveClass!);
      button.setAttribute(expandedAttribute!, "true");
      content.setAttribute(hiddenAttribute!, "false");
      content.style.height = `${content.scrollHeight}px`;

      if (icon) {
        icon.style.transform = "rotate(180deg)";
      }

      this.config.onToggle(index, true);
    }
  }

  private closeOtherAccordions(currentAccordion: Element): void {
    const { stateAttribute, expandedAttribute, hiddenAttribute } =
      this.config.attributes;
    const { activeClass, inactiveClass } = this.config.classes;

    this.accordions.forEach((accordion) => {
      if (
        accordion !== currentAccordion &&
        accordion.getAttribute(stateAttribute!) === "open"
      ) {
        const content = accordion.querySelector(
          this.config.contentSelector,
        ) as HTMLElement;
        const button = accordion.querySelector(
          this.config.toggleButtonSelector,
        );
        const icon = accordion.querySelector(
          this.config.iconSelector,
        ) as HTMLElement;

        if (content && button) {
          accordion.setAttribute(stateAttribute!, "closed");
          accordion.classList.remove(activeClass!);
          accordion.classList.add(inactiveClass!);
          button.setAttribute(expandedAttribute!, "false");
          content.setAttribute(hiddenAttribute!, "true");
          content.style.height = "0px";

          if (icon) {
            icon.style.transform = "rotate(0deg)";
          }
        }
      }
    });
  }

  public destroy(): void {
    // Event listener'ı temizle
    window.removeEventListener("resize", this.handleWindowResize.bind(this));

    if (this.resizeTimeout) {
      window.clearTimeout(this.resizeTimeout);
    }
  }
}

export { AccordionController, type AccordionConfig };

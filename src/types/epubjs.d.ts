declare module "epubjs" {
  type Location = { start: { cfi: string; percentage?: number } };
  interface Rendition {
    display(target?: string): Promise<void>;
    next(): Promise<void>;
    prev(): Promise<void>;
    on(event: "relocated", callback: (location: Location) => void): void;
    destroy(): void;
  }
  interface EpubBook {
    renderTo(
      element: HTMLElement,
      options: { width: string; height: string; flow: string },
    ): Rendition;
    ready: Promise<unknown>;
    destroy(): void;
  }
  export default function ePub(data: ArrayBuffer): EpubBook;
}

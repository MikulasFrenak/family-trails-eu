// jsdom doesn't implement matchMedia at all (throws "not a function"), which
// would crash useIsMobile and anything that renders it under test. Polyfill
// a real, working implementation so tests can exercise actual responsive
// behavior instead of just working around a crash.
class FakeMediaQueryList extends EventTarget implements MediaQueryList {
  media: string;
  matches: boolean;
  onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null = null;

  constructor(query: string) {
    super();
    this.media = query;
    this.matches = evaluate(query);
  }

  addListener(): void {}
  removeListener(): void {}
}

function evaluate(query: string): boolean {
  const match = /max-width:\s*(\d+)px/.exec(query);
  if (!match) return false;
  return window.innerWidth <= Number(match[1]);
}

window.matchMedia = (query: string) => new FakeMediaQueryList(query) as MediaQueryList;

/**
 * A small stand-in for the browser DOM, just large enough to run `site/main.js` under
 * vitest without a browser or a DOM library. It covers what that script calls and nothing
 * more. Selectors: `tag`, `.class`, `#id`, `tag[attr="value"]`, joined by spaces.
 */
type Listener = (event: FakeEvent) => void;

export interface FakeEvent {
  type: string;
  key?: string;
  target: FakeElement;
  defaultPrevented: boolean;
  preventDefault(): void;
}

export class FakeElement {
  readonly children: FakeElement[] = [];
  parent: FakeElement | null = null;
  readonly style: Record<string, string> = {};
  value = "";
  tabIndex = 0;
  type = "";
  href = "";
  rel = "";
  scope = "";
  title = "";
  open = false;
  private readonly attrs = new Map<string, string>();
  private readonly listeners = new Map<string, Listener[]>();
  private text = "";

  constructor(
    readonly doc: FakeDocument,
    readonly tagName: string,
  ) {}

  get id(): string {
    return this.attrs.get("id") ?? "";
  }
  set id(value: string) {
    this.attrs.set("id", value);
  }
  get className(): string {
    return this.attrs.get("class") ?? "";
  }
  set className(value: string) {
    this.attrs.set("class", value);
  }
  get classList() {
    const names = (): string[] => this.className.split(/\s+/).filter(Boolean);
    const write = (list: string[]): void => void this.attrs.set("class", list.join(" "));
    return {
      contains: (name: string): boolean => names().includes(name),
      add: (name: string): void => write([...new Set([...names(), name])]),
      remove: (name: string): void => write(names().filter((n) => n !== name)),
      toggle: (name: string, force?: boolean): void => {
        const on = force ?? !names().includes(name);
        write(on ? [...new Set([...names(), name])] : names().filter((n) => n !== name));
      },
    };
  }
  get textContent(): string {
    return this.text + this.children.map((c) => c.textContent).join("");
  }
  set textContent(value: string) {
    this.children.length = 0;
    this.text = value;
  }

  setAttribute(name: string, value: string): void {
    this.attrs.set(name, String(value));
  }
  getAttribute(name: string): string | null {
    return this.attrs.get(name) ?? null;
  }
  removeAttribute(name: string): void {
    this.attrs.delete(name);
  }

  appendChild(node: FakeElement): FakeElement {
    if (node.tagName === "#fragment") {
      for (const child of [...node.children]) this.appendChild(child);
      return node;
    }
    node.parent?.removeChild(node);
    node.parent = this;
    this.children.push(node);
    return node;
  }
  removeChild(node: FakeElement): void {
    const at = this.children.indexOf(node);
    if (at >= 0) this.children.splice(at, 1);
    node.parent = null;
    if (this.doc.activeElement === node) this.doc.activeElement = this.doc.body;
  }
  replaceChild(next: FakeElement, old: FakeElement): void {
    const at = this.children.indexOf(old);
    old.parent = null;
    next.parent = this;
    this.children[at] = next;
  }
  replaceChildren(...nodes: FakeElement[]): void {
    for (const child of [...this.children]) this.removeChild(child);
    this.text = "";
    for (const node of nodes) this.appendChild(node);
  }

  addEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  /** Runs listeners on this element, then on each ancestor, then on the document. */
  dispatch(type: string, init: { key?: string } = {}): FakeEvent {
    const event: FakeEvent = {
      type,
      key: init.key,
      target: this,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
    };
    for (const node of this.lineage()) {
      for (const listener of node.listeners.get(type) ?? []) listener(event);
    }
    for (const listener of this.doc.listeners.get(type) ?? []) listener(event);
    return event;
  }
  click(): void {
    this.dispatch("click");
  }
  focus(): void {
    this.doc.activeElement = this;
  }
  /** Like a real textarea, selecting its text also moves focus to it. */
  select(): void {
    this.focus();
    this.doc.selected = this.value;
  }

  /** This element followed by each ancestor, nearest first. */
  private lineage(): FakeElement[] {
    return this.parent ? [this, ...this.parent.lineage()] : [this];
  }

  matches(simple: string): boolean {
    const m = simple.match(
      /^([a-z0-9]+)?(?:\.([\w-]+))?(?:#([\w-]+))?(?:\[([\w-]+)="([^"]*)"\])?$/i,
    );
    if (!m) throw new Error(`fake-dom: unsupported selector ${simple}`);
    const [, tag, cls, id, attr, value] = m;
    if (tag && this.tagName !== tag.toLowerCase()) return false;
    if (cls && !this.classList.contains(cls)) return false;
    if (id && this.id !== id) return false;
    if (attr && this.getAttribute(attr) !== value) return false;
    return true;
  }
  closest(simple: string): FakeElement | null {
    return this.lineage().find((n) => n.tagName !== "#text" && n.matches(simple)) ?? null;
  }
  querySelectorAll(selector: string): FakeElement[] {
    const parts = selector.trim().split(/\s+/);
    const last = parts.pop()!;
    const out: FakeElement[] = [];
    const walk = (node: FakeElement): void => {
      for (const child of node.children) {
        if (child.tagName === "#text") continue;
        if (child.matches(last)) {
          let scope: FakeElement | null = child.parent;
          let ok = true;
          for (const part of [...parts].reverse()) {
            while (scope && !scope.matches(part)) scope = scope.parent;
            if (!scope) {
              ok = false;
              break;
            }
            scope = scope.parent;
          }
          if (ok) out.push(child);
        }
        walk(child);
      }
    };
    walk(this);
    return out;
  }
  querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }
}

export class FakeDocument {
  readonly listeners = new Map<string, Listener[]>();
  readonly documentElement: FakeElement;
  readonly head: FakeElement;
  readonly body: FakeElement;
  readyState = "complete";
  activeElement: FakeElement;
  /** What the last `select()` call selected; `execCommand("copy")` copies it. */
  selected = "";
  copied: string | null = null;
  execCommandResult = true;

  constructor() {
    this.documentElement = new FakeElement(this, "html");
    this.head = this.documentElement.appendChild(new FakeElement(this, "head"));
    this.body = this.documentElement.appendChild(new FakeElement(this, "body"));
    this.activeElement = this.body;
  }

  createElement(tag: string): FakeElement {
    return new FakeElement(this, tag.toLowerCase());
  }
  createTextNode(text: string): FakeElement {
    const node = new FakeElement(this, "#text");
    node.textContent = text;
    return node;
  }
  createDocumentFragment(): FakeElement {
    return new FakeElement(this, "#fragment");
  }
  addEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  getElementById(id: string): FakeElement | null {
    return this.documentElement.querySelector(`#${id}`);
  }
  querySelector(selector: string): FakeElement | null {
    return this.documentElement.querySelector(selector);
  }
  querySelectorAll(selector: string): FakeElement[] {
    return this.documentElement.querySelectorAll(selector);
  }
  execCommand(command: string): boolean {
    if (command === "copy" && this.execCommandResult) this.copied = this.selected;
    return this.execCommandResult;
  }

  /** Shorthand for building fixtures: `add(parent, "button", { class: "copy-btn" })`. */
  add(
    parent: FakeElement,
    tag: string,
    attrs: Record<string, string> = {},
    text = "",
  ): FakeElement {
    const node = this.createElement(tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
    if (text) node.textContent = text;
    return parent.appendChild(node);
  }
}

import { ObjectBase } from "./objects";

export class DefinitionTracker<T extends ObjectBase> {
  private definitions = new Map<URL, T[]>();
  set(url: URL, objects: T[]) {
    this.definitions.set(url, objects);
  }
  add(url: URL, ...objects: (T[] | T)[]) {
    const definitionsForUrl = this.definitions.get(url) ?? [];
    //objects.flat() does not work for some reason
    for (const object of objects) {
      if (Array.isArray(object)) {
        definitionsForUrl.push(...object);
      } else {
        definitionsForUrl.push(object);
      }
    }
    this.definitions.set(url, definitionsForUrl);
  }
  *it() {
    const def = this.definitions;
    for (const definition of def.values()) {
      yield* definition;
    }
  }
  get(): T[]
  get(index: number): T | undefined
  get(index?: number) {
    if (index !== undefined) {
      return Array.from(this.it()).at(index);
    }
    return Array.from(this.it());
  }
  clear() {
    this.definitions.clear();
  }
  some(predicate: (value: T, index: number, array: T[]) => boolean): boolean {
    return this.get().some(predicate);
  }
  includes(searchElement: T, fromIndex?: number): boolean {
    return this.get().includes(searchElement, fromIndex);
  }
  every(predicate: (value: T, index: number, array: T[]) => boolean): boolean {
    return this.get().every(predicate);
  }
  flatMap<U, This = undefined>(callback: (this: This, value: T, index: number, array: T[]) => U | readonly U[]) {
    return this.get().flatMap(callback);
  }
  map<U>(callbackfn: (value: T, index: number, array: T[]) => U) {
    return this.get().map(callbackfn);
  }
  filter<S extends T>(predicate: (value: T, index: number, array: T[]) => value is S): S[];
  filter(predicate: (value: T, index: number, array: T[]) => unknown): T[];
  filter(predicate: (value: T, index: number, array: T[]) => boolean) {
    return this.get().filter(predicate);
  }
  find(predicate: (value: T, index: number, array: T[]) => boolean) {
    return this.get().find(predicate);
  }
  get length() {
    return this.get().length;
  }
}
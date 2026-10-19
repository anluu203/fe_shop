import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import ts from "typescript";

export function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  };
}

// Load the actual TS modules, with isolated browser storage and a stable demo date.
// No duplicated implementation or generated files are used by these tests.
export function browserModules(storage = memoryStorage(), options = {}) {
  class DemoDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : ["2026-10-19T03:00:00Z"]));
    }
  }
  const window = new EventTarget();
  const context = vm.createContext({
    localStorage: storage,
    window,
    Event,
    crypto: { randomUUID },
    structuredClone,
    Date: DemoDate,
    Intl,
    URL,
    URLSearchParams,
    queueMicrotask,
    setTimeout,
    clearTimeout,
    process: {
      env: { NEXT_PUBLIC_USE_MOCK: options.mock === false ? "false" : "true" },
    },
    fetch:
      options.fetch ??
      (() => {
        throw new Error("Unexpected network request in mock mode");
      }),
  });
  const cache = new Map();
  function load(filename) {
    const absolute = path.resolve(filename);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const module = { exports: {} };
    cache.set(absolute, module);
    const nativeRequire = createRequire(absolute);
    function localRequire(specifier) {
      if (specifier.startsWith(".")) {
        const candidate = path.resolve(path.dirname(absolute), specifier);
        if (fs.existsSync(candidate + ".ts")) return load(candidate + ".ts");
        if (fs.existsSync(path.join(candidate, "index.ts")))
          return load(path.join(candidate, "index.ts"));
      }
      return nativeRequire(specifier);
    }
    const compiled = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText;
    vm.runInContext(
      `(function(exports, require, module) { ${compiled}\n})`,
      context,
      { filename: absolute },
    )(module.exports, localRequire, module);
    return module.exports;
  }
  return { load, storage, window };
}

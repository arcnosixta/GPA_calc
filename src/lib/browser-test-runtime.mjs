import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createContext, Script } from "node:vm";
import ts from "typescript";

const root = fileURLToPath(new URL("../../", import.meta.url));

// Изолированный браузер для каждого теста. Проверяется настоящий модуль хранилища.
export function browser(data = new Map()) {
  const storage = (values) => ({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  });
  const context = createContext({
    structuredClone, crypto: webcrypto,
    window: { localStorage: storage(data), sessionStorage: storage(new Map()), addEventListener() {}, removeEventListener() {} },
  });
  const modules = new Map();
  const react = {
    useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
    useMemo: (create) => create(),
    useEffect: (effect) => effect(),
  };
  function load(path) {
    if (modules.has(path)) return modules.get(path).exports;
    const loadedModule = { exports: {} };
    modules.set(path, loadedModule);
    const code = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    function require(specifier) {
      if (specifier === "react") return react;
      const base = specifier.startsWith("@/") ? resolve(root, "src", specifier.slice(2)) : resolve(dirname(path), specifier);
      const target = [base + ".ts", base + ".tsx"].find(existsSync);
      assert.ok(target, `Модуль не найден: ${specifier}`);
      return load(target);
    }
    new Script(`(function(require,module,exports){${code}\n})`, { filename: path })
      .runInContext(context)(require, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  return { data, loadProject: (path) => load(resolve(root, path)) };
}

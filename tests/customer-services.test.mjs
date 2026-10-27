import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import ts from "typescript";

const filename = fileURLToPath(new URL("../lib/services/customer-services.ts", import.meta.url));
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    key: (index) => [...values.keys()][index] ?? null,
    get length() { return values.size; },
  };
}

function load(storage = memoryStorage()) {
  // Run the consultation service with isolated browser storage.
  const context = { exports: {}, require: createRequire(filename), localStorage: storage, crypto: { randomUUID } };
  vm.runInNewContext(compiled, context, { filename });
  return context.exports;
}

test("consultation respects usage, category, budget boundary and price order", () => {
  const { customerServices: service } = load();
  const options = service.getConsultationOptions();
  for (const usage of options.usages) {
    for (const component of options.components) {
      const results = service.recommend({ usage: usage.id, component: component.id, budget: 20000000 });
      for (const [index, product] of results.entries()) {
        assert.ok(product.usages.includes(usage.id));
        assert.equal(product.component, component.id);
        assert.ok(product.reasons[usage.id]);
        if (index) assert.ok(results[index - 1].price <= product.price);
        const atPrice = service.recommend({ usage: usage.id, component: component.id, budget: product.price });
        const belowPrice = service.recommend({ usage: usage.id, component: component.id, budget: product.price - 1 });
        assert.ok(atPrice.some((item) => item.id === product.id));
        assert.ok(!belowPrice.some((item) => item.id === product.id));
        assert.ok(atPrice.every((item) => item.price <= product.price));
      }
    }
  }
  assert.equal(service.recommend({ usage: "office", component: "gpu", budget: 20000000 }).length, 0);
  for (const budget of [0, -1, 1.5, NaN, Infinity]) {
    assert.equal(service.recommend({ usage: "office", component: "cpu", budget }).length, 0);
  }
});

const catalogInput = {
  name: "  CPU thử nghiệm  ", component: "cpu", price: 1500000,
  usages: ["office"], specs: ["  4 nhân  "], reasons: { office: "  Phù hợp học tập.  " }, isActive: true,
};

test("admin creates and edits consultation products; hiding updates user recommendations immediately", () => {
  const storage = memoryStorage();
  const { customerServices: client, adminCustomerServices: admin } = load(storage);
  const query = { usage: "office", component: "cpu", budget: 2000000 };
  assert.equal(client.recommend(query).length, 0);
  const created = admin.saveConsultationProduct(catalogInput).products.find((item) => item.name === "CPU thử nghiệm");
  assert.ok(created);
  assert.equal(created.specs[0], "4 nhân");
  assert.equal(client.recommend(query)[0].id, created.id);
  admin.saveConsultationProduct({ ...catalogInput, name: "CPU đã chỉnh sửa", price: 1800000 }, created.id);
  assert.equal(load(storage).customerServices.recommend(query)[0].name, "CPU đã chỉnh sửa");
  admin.setConsultationProductActive(created.id, false);
  assert.equal(client.recommend(query).length, 0);
  assert.equal(load(storage).customerServices.recommend(query).length, 0);
  admin.setConsultationProductActive(created.id, true);
  assert.equal(client.recommend(query).length, 1);
});

test("invalid catalog edits do not change the persisted catalog", () => {
  const { adminCustomerServices: admin } = load();
  const before = JSON.stringify(admin.loadConsultationProducts().products);
  for (const patch of [{ name: " " }, { price: 0 }, { price: 1.5 }, { usages: [] }, { reasons: { office: " " } }, { specs: [] }, { component: "unknown" }]) {
    assert.throws(() => admin.saveConsultationProduct({ ...catalogInput, ...patch }));
  }
  assert.throws(() => admin.saveConsultationProduct(catalogInput, "missing"), /Không tìm thấy/);
  assert.equal(JSON.stringify(admin.loadConsultationProducts().products), before);
});

test("admin changes remain visible in the session with clear warnings when storage is blocked", () => {
  const storage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("quota"); }, get length() { throw new Error("blocked"); } };
  const { customerServices: client, adminCustomerServices: admin } = load(storage);
  assert.ok(admin.saveConsultationProduct(catalogInput).warning);
  assert.equal(client.recommend({ usage: "office", component: "cpu", budget: 2000000 }).length, 1);
});

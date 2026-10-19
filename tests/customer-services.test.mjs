import test from "node:test";
import assert from "node:assert/strict";
import { browserModules, memoryStorage } from "./helpers.mjs";
function load(storage = memoryStorage()) { return browserModules(storage).load("lib/services/customer-services.ts"); }

const input = { productId: "return-book-1", contactName: "  Nguyễn An  ", phone: "090 123 4567", description: "  Sách bị thiếu trang và lỗi in.  " };

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
  assert.equal(service.recommend({ usage: "learning", component: "manga", budget: 20000000 }).length, 0);
  for (const budget of [0, -1, 1.5, NaN, Infinity]) {
    assert.equal(service.recommend({ usage: "learning", component: "literature", budget }).length, 0);
  }
});

test("warranty includes its final day in Vietnam and expires the next day", () => {
  const { todayInVietnam, isWarrantyActive } = load();
  const product = { purchasedAt: "2026-01-01", expiresAt: "2026-10-18" };
  assert.equal(todayInVietnam(new Date("2026-10-18T16:59:59Z")), "2026-10-18");
  assert.equal(todayInVietnam(new Date("2026-10-18T17:00:00Z")), "2026-10-19");
  assert.equal(isWarrantyActive(product, "2026-10-18"), true);
  assert.equal(isWarrantyActive(product, "2026-10-19"), false);
  assert.equal(isWarrantyActive(product, "2025-12-31"), false);
});

test("required contact details and meaningful descriptions are validated", () => {
  const { validateWarrantyInput } = load();
  assert.equal(Object.keys(validateWarrantyInput(input)).length, 0);
  const errors = validateWarrantyInput({ ...input, contactName: "  ", phone: "123", description: "\n  " });
  assert.ok(errors.contactName && errors.phone && errors.description);
  assert.equal(Object.keys(validateWarrantyInput({ ...input, phone: "+84 901 234 567" })).length, 0);
});

test("submission persists, normalizes input, survives reload and rejects duplicates", () => {
  const storage = memoryStorage();
  const { customerServices: service } = load(storage);
  const result = service.createWarrantyRequest("user-a", input);
  assert.equal(result.request.status, "received");
  assert.equal(result.request.timeline.length, 1);
  assert.equal(result.request.contactName, "Nguyễn An");
  assert.equal(result.request.phone, "0901234567");
  assert.equal(result.warning, "");
  assert.ok(load(storage).customerServices.loadWarrantyRequests("user-a").requests.some((item) => item.id === result.request.id));
  assert.throws(() => service.createWarrantyRequest("user-a", input), /đang xử lý/);
});

test("accounts share demo seeds but never share newly created requests", () => {
  const { customerServices: service } = load();
  const result = service.createWarrantyRequest("user-a", input);
  assert.equal(service.loadWarrantyRequests("user-b").requests.length, 2);
  assert.ok(!service.loadWarrantyRequests("user-b").requests.some((item) => item.id === result.request.id));
  assert.doesNotThrow(() => service.createWarrantyRequest("user-b", input));
});

test("expired, missing and in-progress products cannot submit; completed products can", () => {
  const { customerServices: service } = load();
  assert.throws(() => service.createWarrantyRequest("user-a", { ...input, productId: "return-book-4" }), /thời hạn/);
  assert.throws(() => service.createWarrantyRequest("user-a", { ...input, productId: "missing" }), /thời hạn/);
  assert.throws(() => service.createWarrantyRequest("user-a", { ...input, productId: "return-book-2" }), /đang xử lý/);
  assert.doesNotThrow(() => service.createWarrantyRequest("user-a", { ...input, productId: "return-book-3" }));
  assert.throws(() => service.createWarrantyRequest("", input), /đăng nhập/);
  assert.throws(() => service.createWarrantyRequest("user-a", { ...input, description: " " }), /mô tả/);
});

test("blocked storage keeps requests for the session, warns and still blocks duplicates", () => {
  const { customerServices: service } = load({ getItem() { throw new Error("blocked"); }, setItem() { throw new Error("quota"); } });
  assert.ok(service.loadWarrantyRequests("user-a").warning);
  const result = service.createWarrantyRequest("user-a", input);
  assert.ok(result.warning);
  assert.ok(service.loadWarrantyRequests("user-a").requests.some((item) => item.id === result.request.id));
  assert.throws(() => service.createWarrantyRequest("user-a", input), /đang xử lý/);
});

test("malformed saved data falls back to seeds without breaking rendering", () => {
  for (const saved of ["bad-json", "{}", '[{"id":"bad"}]', '[{"status":"__proto__"}]']) {
    const { customerServices: service } = load({ getItem: () => saved, setItem() {} });
    const result = service.loadWarrantyRequests("user-a");
    assert.equal(result.requests.length, 2);
    assert.ok(result.warning);
  }
});

test("admin sees account requests, updates only their owner, and preserves timelines on reload", () => {
  const storage = memoryStorage();
  const { customerServices: client, adminCustomerServices: admin } = load(storage);
  const requestA = client.createWarrantyRequest("user-a", input).request;
  const requestB = client.createWarrantyRequest("user-b", input).request;
  assert.equal(admin.loadWarrantyRequests().requests.length, 4);
  assert.equal(admin.loadWarrantyRequests().requests.find((item) => item.id === requestA.id).ownerId, "user-a");
  admin.updateWarrantyRequest("user-a", requestA.id, "checking", "  Đang kiểm tra sách.  ");
  assert.equal(client.loadWarrantyRequests("user-a").requests.find((item) => item.id === requestA.id).status, "checking");
  assert.equal(client.loadWarrantyRequests("user-b").requests.find((item) => item.id === requestB.id).status, "received");
  assert.ok(!client.loadWarrantyRequests("user-b").requests.some((item) => item.id === requestA.id));
  const fresh = load(storage);
  const restored = fresh.customerServices.loadWarrantyRequests("user-a").requests.find((item) => item.id === requestA.id);
  assert.equal(restored.timeline.length, 2);
  assert.equal(restored.timeline[1].note, "Đang kiểm tra sách.");
  assert.equal(fresh.adminCustomerServices.loadWarrantyRequests().requests.length, 4);
});

test("admin enforces sequential processing and completion unlocks a new user request", () => {
  const { customerServices: client, adminCustomerServices: admin } = load();
  const request = client.createWarrantyRequest("user-a", input).request;
  assert.throws(() => admin.updateWarrantyRequest("user-a", request.id, "completed", "Done"), /bước xử lý/);
  assert.throws(() => admin.updateWarrantyRequest("user-a", request.id, "checking", "  "), /ghi chú/);
  assert.throws(() => admin.updateWarrantyRequest("other-user", request.id, "checking", "Test"), /Không tìm thấy/);
  admin.updateWarrantyRequest("user-a", request.id, "checking", "Đã kiểm tra.");
  assert.throws(() => admin.updateWarrantyRequest("user-a", request.id, "received", "Lùi bước"), /bước xử lý/);
  admin.updateWarrantyRequest("user-a", request.id, "checking", "Bổ sung kết quả kiểm tra.");
  admin.updateWarrantyRequest("user-a", request.id, "repairing", "Đang xử lý.");
  admin.updateWarrantyRequest("user-a", request.id, "completed", "Đã bàn giao.");
  assert.throws(() => admin.updateWarrantyRequest("user-a", request.id, "completed", "Again"), /hoàn tất/);
  assert.doesNotThrow(() => client.createWarrantyRequest("user-a", input));
});

test("sample progress updates apply to shared samples for every account and survive reload", () => {
  const storage = memoryStorage();
  const { customerServices: client, adminCustomerServices: admin } = load(storage);
  admin.updateWarrantyRequest(null, "DT-MAU-001", "completed", "Đã hoàn tất đổi trả mẫu.");
  for (const owner of ["user-a", "user-b"]) {
    assert.equal(client.loadWarrantyRequests(owner).requests.find((item) => item.id === "DT-MAU-001").status, "completed");
    assert.equal(load(storage).customerServices.loadWarrantyRequests(owner).requests.find((item) => item.id === "DT-MAU-001").timeline.length, 4);
  }
});

const catalogInput = {
  name: "  Sách thử nghiệm  ", component: "literature", price: 1500000,
  usages: ["learning"], specs: ["  240 trang  "], reasons: { learning: "  Phù hợp học tập.  " }, isActive: true,
};

test("admin creates and edits consultation products; hiding updates user recommendations immediately", () => {
  const storage = memoryStorage();
  const { customerServices: client, adminCustomerServices: admin } = load(storage);
  const query = { usage: "learning", component: "literature", budget: 2000000 };
  assert.equal(client.recommend(query).length, 0);
  const created = admin.saveConsultationProduct(catalogInput).products.find((item) => item.name === "Sách thử nghiệm");
  assert.ok(created);
  assert.equal(created.specs[0], "240 trang");
  assert.equal(client.recommend(query)[0].id, created.id);
  admin.saveConsultationProduct({ ...catalogInput, name: "Sách đã chỉnh sửa", price: 1800000 }, created.id);
  assert.equal(load(storage).customerServices.recommend(query)[0].name, "Sách đã chỉnh sửa");
  admin.setConsultationProductActive(created.id, false);
  assert.equal(client.recommend(query).length, 0);
  assert.equal(load(storage).customerServices.recommend(query).length, 0);
  admin.setConsultationProductActive(created.id, true);
  assert.equal(client.recommend(query).length, 1);
});

test("invalid catalog edits do not change the persisted catalog", () => {
  const { adminCustomerServices: admin } = load();
  const before = JSON.stringify(admin.loadConsultationProducts().products);
  for (const patch of [{ name: " " }, { price: 0 }, { price: 1.5 }, { usages: [] }, { reasons: { learning: " " } }, { specs: [] }, { component: "unknown" }]) {
    assert.throws(() => admin.saveConsultationProduct({ ...catalogInput, ...patch }));
  }
  assert.throws(() => admin.saveConsultationProduct(catalogInput, "missing"), /Không tìm thấy/);
  assert.equal(JSON.stringify(admin.loadConsultationProducts().products), before);
});

test("admin changes remain visible in the session with clear warnings when storage is blocked", () => {
  const storage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("quota"); }, get length() { throw new Error("blocked"); } };
  const { customerServices: client, adminCustomerServices: admin } = load(storage);
  const request = client.createWarrantyRequest("user-a", input).request;
  assert.ok(admin.updateWarrantyRequest("user-a", request.id, "checking", "Đã kiểm tra.").warning);
  assert.equal(client.loadWarrantyRequests("user-a").requests.find((item) => item.id === request.id).status, "checking");
  assert.ok(admin.saveConsultationProduct(catalogInput).warning);
  assert.equal(client.recommend({ usage: "learning", component: "literature", budget: 2000000 }).length, 1);
});

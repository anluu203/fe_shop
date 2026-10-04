import { categoryApi } from "../../lib/api/categories";
import { productApi } from "../../lib/api/products";
import HeroBanner from "../../components/client/HeroBanner";
import ProductCard from "../../components/client/ProductCard";
import { CategoryStrip, ViewAllLink, CtaSection } from "../../components/client/HomeInteractive";
import type { CategoryParent } from "../../lib/types";

export default async function ClientHomePage() {
  const [parents, productsPage] = await Promise.all([
    categoryApi.getParents().catch(() => [] as CategoryParent[]),
    productApi.getAll({ pageSize: 8 }).catch(() => ({
      items: [],
      totalCount: 0,
      pageNumber: 1,
      pageSize: 8,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    })),
  ]);

  return (
    <>
      {/* Hero Banner */}
      <HeroBanner />

      {/* Category strip */}
      <CategoryStrip parents={parents} />

      {/* Features bar */}
      <section
        style={{
          background: "var(--primary)",
          padding: "20px 0",
        }}
      >
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            {[
              { icon: "fa-truck", title: "Giao hàng toàn quốc", desc: "Nhanh trong 1-3 ngày" },
              { icon: "fa-check-circle", title: "Hàng chính hãng 100%", desc: "Bảo đảm nguồn gốc" },
              { icon: "fa-refresh", title: "Đổi trả dễ dàng", desc: "Trong vòng 7 ngày" },
              { icon: "fa-shield", title: "Bảo hành chính hãng", desc: "Hỗ trợ 24/7" },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  color: "#fff",
                }}
              >
                <i className={`fa ${item.icon}`} style={{ fontSize: 24, flexShrink: 0, width: 28, textAlign: "center" }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{item.title}</div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products section */}
      <section style={{ padding: "40px 0" }}>
        <div className="container">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 24,
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.3px",
                }}
              >
                Sản phẩm mới nhất
              </h2>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                Linh kiện chính hãng, giá tốt nhất thị trường
              </p>
            </div>
            <ViewAllLink href="/client/products" label="Xem tất cả" id="view-all-products" />
          </div>

          {productsPage.items.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 16,
              }}
            >
              {productsPage.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div
              style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}><i className="fa fa-cube" /></div>
              <p>Chưa có sản phẩm nào. Hãy quay lại sau!</p>
            </div>
          )}
        </div>
      </section>

      {/* Banner CTA */}
      <CtaSection />
    </>
  );
}

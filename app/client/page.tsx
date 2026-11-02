import { categoryApi } from "../../lib/api/categories";
import { productApi } from "../../lib/api/products";
import HomeCatalog from "../../components/client/HomeCatalog";
import { listBooks, listParents } from "../../lib/server/services/catalog";
import { USE_MOCK } from "../../lib/mock/config";
export const dynamic = "force-dynamic";
export default async function ClientHomePage() {
  if (!USE_MOCK) {
    const [parents, books] = await Promise.all([listParents(), listBooks(new URLSearchParams({ pageSize: "100" }))]);
    return <HomeCatalog initialProducts={books.items} initialParents={parents} />;
  }
  const [parents, products] = await Promise.all([
    categoryApi.getParents().catch(() => []),
    productApi
      .getAll({ pageSize: 100 })
      .then((page) => page.items)
      .catch(() => []),
  ]);
  return <HomeCatalog initialProducts={products} initialParents={parents} />;
}

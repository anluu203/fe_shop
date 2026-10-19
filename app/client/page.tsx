import { categoryApi } from "../../lib/api/categories";
import { productApi } from "../../lib/api/products";
import HomeCatalog from "../../components/client/HomeCatalog";
export default async function ClientHomePage() {
  const [parents, products] = await Promise.all([
    categoryApi.getParents().catch(() => []),
    productApi
      .getAll({ pageSize: 100 })
      .then((page) => page.items)
      .catch(() => []),
  ]);
  return <HomeCatalog initialProducts={products} initialParents={parents} />;
}

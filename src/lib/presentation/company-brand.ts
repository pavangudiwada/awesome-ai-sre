import type { CatalogCompany, CatalogProduct } from "@/types/catalog";

/** Product assets represent a company only when the product shares its identity. */
export function companyBrandProduct(
  company: CatalogCompany,
  products: readonly CatalogProduct[],
): CatalogProduct | undefined {
  return products.find(
    (product) =>
      product.slug === company.slug ||
      product.name.toLocaleLowerCase() === company.name.toLocaleLowerCase(),
  );
}

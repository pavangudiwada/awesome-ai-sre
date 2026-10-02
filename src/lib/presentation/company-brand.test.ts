import { describe, expect, it } from "vitest";

import { getCompanyBySlug, getProductsByCompanySlug } from "@/lib/catalog";
import { companyBrandProduct } from "./company-brand";

describe("company branding", () => {
  it("keeps the parent brand when an acquired product sorts first", () => {
    const company = getCompanyBySlug("elastic")!;
    const products = getProductsByCompanySlug(company.slug);
    expect(products[0].slug).toBe("deductive-ai");
    expect(companyBrandProduct(company, products)?.slug).toBe("elastic");
  });

  it("uses initials rather than labeling a subsidiary product logo as its parent", () => {
    const company = getCompanyBySlug("mirantis")!;
    expect(companyBrandProduct(company, getProductsByCompanySlug(company.slug))).toBeUndefined();
  });
});

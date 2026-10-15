import { describe, expect, it } from "vitest";

import { getCompanyBySlug, getProductsByCompanySlug } from "@/lib/catalog";
import { companyBrandProduct } from "./company-brand";

describe("company branding", () => {
  it("keeps the company brand when a differently branded product sorts first", () => {
    const company = getCompanyBySlug("robusta")!;
    const products = getProductsByCompanySlug(company.slug);
    expect(products[0].slug).toBe("holmesgpt");
    expect(companyBrandProduct(company, products)?.slug).toBe("robusta");
  });

  it("uses initials when only a differently branded product is available", () => {
    const company = getCompanyBySlug("robusta")!;
    expect(companyBrandProduct(company, getProductsByCompanySlug(company.slug).filter((product) => product.slug === "holmesgpt"))).toBeUndefined();
  });
});

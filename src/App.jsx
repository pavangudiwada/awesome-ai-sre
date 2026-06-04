import React, { useEffect, useMemo, useRef, useState } from "react";
import yaml from "js-yaml";
import { Link, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";

const TAG_ORDER = [
  "Incident Response",
  "Observability",
  "AIOps",
  "IDP",
  "IaC",
  "FinOps",
  "Security",
  "Deployment",
];

const TAG_DESCRIPTIONS = {
  "Incident Response": "AI teammates for triage, RCA, escalation, and remediation.",
  Observability: "Log, metric, trace, and telemetry products with AI workflows.",
  AIOps: "Automated operations, anomaly detection, and reliability intelligence.",
  IDP: "Internal developer platform and platform engineering automation.",
  IaC: "Infrastructure-as-code review, generation, and drift workflows.",
  FinOps: "Cloud cost analysis, optimization, and budget operations.",
  Security: "Security-aware reliability, posture, and incident workflows.",
  Deployment: "Release, rollout, and environment automation.",
};

const TAG_COLORS = {
  "Incident Response": "#ef4444",
  Observability: "#0ea5e9",
  AIOps: "#16a34a",
  IDP: "#8b5cf6",
  IaC: "#14b8a6",
  FinOps: "#f59e0b",
  Security: "#f97316",
  Deployment: "#2563eb",
};

const DEPLOYMENT_LABELS = {
  saas: "SaaS",
  "on-prem": "On-prem",
  hybrid: "Hybrid",
};

const DEPLOYMENT_FILTERS = ["All", "SaaS", "Hybrid", "On-prem"];

const SORT_OPTIONS = [
  { value: "az", label: "A-Z" },
  { value: "recent", label: "Recently added" },
  { value: "open-source", label: "Open source first" },
  { value: "complete", label: "Most complete profile" },
];

const YAML_FILES = import.meta.glob("../tools/operate/*.yaml", {
  eager: true,
  query: "?raw",
  import: "default",
});

function cleanDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return null;
}

function decodeText(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/&#039;/g, "’")
    .replace(/&apos;/g, "’")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function deploymentLabels(values) {
  const list = Array.isArray(values) ? values : values ? [values] : [];
  return list.map((value) => DEPLOYMENT_LABELS[String(value).toLowerCase()] || String(value));
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function favicon(url) {
  return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(url)}`;
}

function isNewCompany(company) {
  if (!company.dateAdded) return false;
  const added = new Date(`${company.dateAdded}T00:00:00Z`);
  if (Number.isNaN(added.getTime())) return false;
  const now = new Date();
  const diff = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(added.getUTCFullYear(), added.getUTCMonth(), added.getUTCDate());
  return diff >= 0 && diff / 86400000 <= 14;
}

function profileScore(company) {
  return [
    company.screenshot,
    company.logo,
    company.links.linkedin,
    company.links.github,
    company.links.x,
    company.links.producthunt,
    company.dateAdded,
    company.claimed,
    company.features.length >= 3,
  ].filter(Boolean).length;
}

function sortCompanies(companies, sortBy) {
  const list = [...companies];
  if (sortBy === "recent") {
    return list.sort((a, b) => (b.dateAdded || "").localeCompare(a.dateAdded || "") || a.name.localeCompare(b.name));
  }
  if (sortBy === "open-source") {
    return list.sort((a, b) => Number(b.openSource) - Number(a.openSource) || a.name.localeCompare(b.name));
  }
  if (sortBy === "complete") {
    return list.sort((a, b) => profileScore(b) - profileScore(a) || a.name.localeCompare(b.name));
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

function sharedTagCount(a, b) {
  return a.tags.filter((tag) => b.tags.includes(tag)).length;
}

function loadCompanies() {
  const companies = [];

  for (const [filePath, raw] of Object.entries(YAML_FILES)) {
    const slugFromFile = filePath.match(/\/([^/]+)\.yaml$/)?.[1];
    if (!slugFromFile || slugFromFile.startsWith("_")) continue;

    let parsed;
    try {
      parsed = yaml.load(raw);
    } catch {
      continue;
    }

    if (!parsed?.name || !parsed?.url || !parsed?.summary) continue;

    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.map((tag) => String(tag).trim()).filter((tag) => TAG_ORDER.includes(tag))
      : [];

    const company = {
      name: parsed.name,
      slug: parsed.slug || slugFromFile,
      website: parsed.url,
      domain: getDomain(parsed.url),
      summary: decodeText(parsed.summary),
      deployment: deploymentLabels(parsed.deployment),
      openSource: Boolean(parsed.opensource),
      tags,
      primaryTag: tags[0] || "AIOps",
      screenshot: typeof parsed.screenshot === "string" ? parsed.screenshot : "",
      logo: typeof parsed.logo === "string" ? parsed.logo : "",
      dateAdded: cleanDate(parsed.dateAdded),
      claimed: Boolean(parsed.claimed),
      features: Array.isArray(parsed.features) ? parsed.features.filter(Boolean).map(decodeText).slice(0, 5) : [],
      links: {
        linkedin: parsed.linkedin,
        github: parsed.github,
        x: parsed.x,
        producthunt: parsed.producthunt,
      },
    };

    companies.push(company);
  }

  return companies.sort((a, b) => a.name.localeCompare(b.name));
}

const COMPANIES = loadCompanies();
const COMPANY_BY_SLUG = new Map(COMPANIES.map((company) => [company.slug, company]));
const TAG_COUNTS = TAG_ORDER.reduce((acc, tag) => {
  acc[tag] = COMPANIES.filter((company) => company.tags.includes(tag)).length;
  return acc;
}, {});
const TOTAL = COMPANIES.length;

function CompanyLogo({ company, size = 48 }) {
  const [failed, setFailed] = useState(false);
  const color = TAG_COLORS[company.primaryTag] || "#2563eb";

  if (failed) {
    return (
      <span className="company-logo company-logo--fallback" style={{ width: size, height: size, background: color }}>
        {company.name.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      className="company-logo"
      src={favicon(company.website)}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}

function TagPill({ tag, active = false, onClick, count, asLink = false }) {
  const color = TAG_COLORS[tag] || "#2563eb";
  const className = `tag-pill${active ? " tag-pill--active" : ""}`;
  const style = active ? { "--tag-color": color } : { "--tag-color": color };
  const content = (
    <>
      <span>{tag}</span>
      {typeof count === "number" && <strong>{count}</strong>}
    </>
  );

  if (asLink) {
    return (
      <Link className={className} style={style} to={`/?tag=${encodeURIComponent(tag)}`}>
        {content}
      </Link>
    );
  }

  return (
    <button className={className} style={style} type="button" onClick={onClick}>
      {content}
    </button>
  );
}

function CompanyCard({ company }) {
  return (
    <article className="company-card">
      <Link className="company-card__main" to={`/company/${company.slug}`}>
        <div className="company-card__top">
          <CompanyLogo company={company} size={48} />
          <div className="company-card__identity">
            <h3>{company.name}</h3>
            <p>{company.domain}</p>
          </div>
          <span className="company-card__arrow">→</span>
        </div>

        <p className="company-card__summary">{company.summary}</p>

        <div className="company-card__meta">
          {company.deployment.slice(0, 2).map((deployment) => (
            <span key={deployment}>{deployment}</span>
          ))}
          {company.tags.slice(0, 2).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
          {company.openSource && <span>Open source</span>}
          {company.claimed && <span>Claimed</span>}
          {isNewCompany(company) && <span>New</span>}
        </div>
      </Link>
      <div className="company-card__actions">
        <a href={company.website} target="_blank" rel="noreferrer">
          Website ↗
        </a>
        <Link to={`/company/${company.slug}`}>View profile</Link>
      </div>
    </article>
  );
}

function FeaturedCompany({ company }) {
  if (!company) return null;
  return (
    <section className="featured-company">
      <div>
        <p className="eyebrow">Featured company</p>
        <div className="featured-company__title">
          <CompanyLogo company={company} size={56} />
          <div>
            <h2>{company.name}</h2>
            <p>{company.domain}</p>
          </div>
        </div>
        <p className="featured-company__copy">{company.summary}</p>
        <div className="featured-company__tags">
          {company.tags.slice(0, 4).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
      <div className="featured-company__links">
        <Link className="button button--primary" to={`/company/${company.slug}`}>
          View profile
        </Link>
        <a className="button button--ghost" href={company.website} target="_blank" rel="noreferrer">
          Visit website ↗
        </a>
      </div>
    </section>
  );
}

function ScreenshotFrame({ company }) {
  const [failed, setFailed] = useState(false);
  const hasScreenshot = Boolean(company.screenshot) && !failed;

  return (
    <figure className={`screenshot-frame${hasScreenshot ? "" : " screenshot-frame--placeholder"}`}>
      {hasScreenshot ? (
        <img src={company.screenshot} alt={`${company.name} website screenshot`} onError={() => setFailed(true)} />
      ) : (
        <div className="screenshot-placeholder">
          <CompanyLogo company={company} size={64} />
          <div>
            <span>Screenshot pending</span>
            <strong>{company.name}</strong>
            <p>Profile is listed from verified directory data. A product capture will appear here once available.</p>
          </div>
        </div>
      )}
    </figure>
  );
}

function DirectoryPage() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const tagFromUrl = params.get("tag");
  const searchInputRef = useRef(null);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState(TAG_ORDER.includes(tagFromUrl) ? tagFromUrl : "All");
  const [openSourceOnly, setOpenSourceOnly] = useState(false);
  const [deploymentFilter, setDeploymentFilter] = useState("All");
  const [sortBy, setSortBy] = useState("az");

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      const isTyping = target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (isTyping) return;
      event.preventDefault();
      searchInputRef.current?.focus();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matches = COMPANIES.filter((company) => {
      if (activeTag !== "All" && !company.tags.includes(activeTag)) return false;
      if (openSourceOnly && !company.openSource) return false;
      if (deploymentFilter !== "All" && !company.deployment.includes(deploymentFilter)) return false;
      if (!query) return true;
      return [company.name, company.summary, company.domain, ...company.tags, ...company.features]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
    return sortCompanies(matches, sortBy);
  }, [activeTag, deploymentFilter, openSourceOnly, search, sortBy]);

  const featured = COMPANIES.find((company) => company.slug === "holmesgpt") || COMPANIES[0];
  const showFeatured = !search.trim() && activeTag === "All" && !openSourceOnly && deploymentFilter === "All";

  return (
    <main>
      <SiteHeader />

      <section className="hero">
        <p className="eyebrow">AI SRE company directory</p>
        <h1>Find companies building AI for reliability engineering.</h1>
        <p>
          A clean directory of {TOTAL} AI SRE companies across incident response, observability, AIOps,
          platform engineering, infrastructure automation, and deployment workflows.
        </p>
        <div className="search-box">
          <span>⌕</span>
          <input
            ref={searchInputRef}
            autoComplete="off"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search companies, categories, products, or use cases..."
          />
          <kbd>/</kbd>
        </div>
      </section>

      <section className="category-strip" aria-label="Company categories">
        <TagPill tag="All" active={activeTag === "All"} count={TOTAL} onClick={() => setActiveTag("All")} />
        {TAG_ORDER.map((tag) => (
          <TagPill key={tag} tag={tag} active={activeTag === tag} count={TAG_COUNTS[tag]} onClick={() => setActiveTag(tag)} />
        ))}
      </section>

      <div className="directory-layout">
        <aside className="sidebar">
          <div className="sidebar-card">
            <div className="sidebar-card__heading">Browse by category</div>
            <button className={activeTag === "All" ? "sidebar-link is-active" : "sidebar-link"} type="button" onClick={() => setActiveTag("All")}>
              <span>All companies</span>
              <strong>{TOTAL}</strong>
            </button>
            {TAG_ORDER.map((tag) => (
              <button key={tag} className={activeTag === tag ? "sidebar-link is-active" : "sidebar-link"} type="button" onClick={() => setActiveTag(tag)}>
                <span>{tag}</span>
                <strong>{TAG_COUNTS[tag]}</strong>
              </button>
            ))}
          </div>

          <div className="sidebar-card">
            <div className="sidebar-card__heading">Quick filters</div>
            <label className="check-row">
              <input type="checkbox" checked={openSourceOnly} onChange={() => setOpenSourceOnly((value) => !value)} />
              <span>Open source only</span>
            </label>
            <label className="select-row">
              <span>Deployment</span>
              <select value={deploymentFilter} onChange={(event) => setDeploymentFilter(event.target.value)}>
                {DEPLOYMENT_FILTERS.map((deployment) => (
                  <option key={deployment} value={deployment}>{deployment}</option>
                ))}
              </select>
            </label>
            <label className="select-row">
              <span>Sort by</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
        </aside>

        <section className="results">
          {showFeatured && <FeaturedCompany company={featured} />}

          <div className="results-header">
            <div>
              <p className="eyebrow">Directory</p>
              <h2>{filtered.length} companies found</h2>
            </div>
            {(activeTag !== "All" || openSourceOnly || deploymentFilter !== "All" || sortBy !== "az" || search) && (
              <button
                className="clear-button"
                type="button"
                onClick={() => {
                  setActiveTag("All");
                  setOpenSourceOnly(false);
                  setDeploymentFilter("All");
                  setSortBy("az");
                  setSearch("");
                }}
              >
                Clear filters
              </button>
            )}
          </div>

          {activeTag !== "All" && <p className="category-note">{TAG_DESCRIPTIONS[activeTag]}</p>}

          {filtered.length > 0 ? (
            <div className="company-grid">
              {filtered.map((company) => (
                <CompanyCard key={company.slug} company={company} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No companies found.</h3>
              <p>Try a broader search term, clear filters, or submit a missing AI SRE company.</p>
              <div className="empty-state__actions">
                <button className="button button--ghost" type="button" onClick={() => {
                  setActiveTag("All");
                  setOpenSourceOnly(false);
                  setDeploymentFilter("All");
                  setSortBy("az");
                  setSearch("");
                }}>
                  Clear filters
                </button>
                <a className="button button--primary" href="https://github.com/pavangudiwada/awesome-ai-sre/issues/new?template=add-operate-tool.yml" target="_blank" rel="noreferrer">
                  Submit company ↗
                </a>
              </div>
            </div>
          )}
        </section>
      </div>

      <Footer />
    </main>
  );
}

function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" to="/">
        <span className="brand-mark">AI</span>
        <span>AI SRE Watchlist</span>
      </Link>
      <nav>
        <a href="https://github.com/pavangudiwada/awesome-ai-sre" target="_blank" rel="noreferrer">GitHub</a>
        <a href="https://www.linkedin.com/company/ai-sre-watchlist" target="_blank" rel="noreferrer">LinkedIn</a>
        <a className="submit-link" href="https://github.com/pavangudiwada/awesome-ai-sre/issues/new?template=add-operate-tool.yml" target="_blank" rel="noreferrer">Submit company</a>
      </nav>
    </header>
  );
}

function CompanyPage() {
  const { slug } = useParams();
  const company = COMPANY_BY_SLUG.get(slug);

  if (!company) return <Navigate to="/" replace />;

  const related = COMPANIES.filter((candidate) => candidate.slug !== company.slug && sharedTagCount(candidate, company) > 0)
    .sort((a, b) => sharedTagCount(b, company) - sharedTagCount(a, company) || a.name.localeCompare(b.name))
    .slice(0, 6);

  return (
    <main>
      <SiteHeader />
      <section className="detail-hero">
        <div className="breadcrumbs">
          <Link to="/">Companies</Link>
          <span>/</span>
          {company.primaryTag && <Link to={`/?tag=${encodeURIComponent(company.primaryTag)}`}>{company.primaryTag}</Link>}
          <span>/</span>
          <strong>{company.name}</strong>
        </div>

        <div className="detail-hero__card">
          <div className="detail-hero__identity">
            <CompanyLogo company={company} size={72} />
            <div>
              <h1>{company.name}</h1>
              <p>{company.summary}</p>
            </div>
          </div>
          <div className="detail-hero__actions">
            <a className="button button--primary" href={company.website} target="_blank" rel="noreferrer">Visit website ↗</a>
            <Link className="button button--ghost" to="/">Back to directory</Link>
          </div>
        </div>
      </section>

      <section className="facts-strip">
        <Fact label="Website" value={company.domain} />
        <Fact label="Category" value={company.primaryTag} />
        <Fact label="Deployment" value={company.deployment.join(", ") || "Unknown"} />
        <Fact label="Open source" value={company.openSource ? "Yes" : "No"} />
      </section>

      <section className="detail-layout">
        <article className="detail-content">
          <ScreenshotFrame company={company} />

          <section className="content-section">
            <p className="eyebrow">Overview</p>
            <h2>What {company.name} does</h2>
            <p>{company.summary}</p>
          </section>

          {company.features.length > 0 && (
            <section className="content-section">
              <p className="eyebrow">Capabilities</p>
              <h2>Product signals</h2>
              <div className="feature-list">
                {company.features.map((feature) => (
                  <div key={feature} className="feature-item">
                    <span>✓</span>
                    <p>{feature}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="content-section">
            <p className="eyebrow">Links</p>
            <h2>Company links</h2>
            <div className="link-grid">
              <a href={company.website} target="_blank" rel="noreferrer">Website ↗</a>
              {company.links.linkedin && <a href={company.links.linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a>}
              {company.links.github && <a href={company.links.github} target="_blank" rel="noreferrer">GitHub ↗</a>}
              {company.links.x && <a href={company.links.x} target="_blank" rel="noreferrer">X ↗</a>}
              {company.links.producthunt && <a href={company.links.producthunt} target="_blank" rel="noreferrer">Product Hunt ↗</a>}
            </div>
          </section>
        </article>

        <aside className="detail-sidebar">
          <div className="sidebar-card">
            <div className="sidebar-card__heading">Tags</div>
            <div className="tag-stack">
              {company.tags.map((tag) => (
                <TagPill key={tag} tag={tag} asLink />
              ))}
            </div>
          </div>

          <div className="sidebar-card">
            <div className="sidebar-card__heading">Similar companies</div>
            <div className="mini-list">
              {related.map((item) => (
                <Link key={item.slug} to={`/company/${item.slug}`}>
                  <CompanyLogo company={item} size={32} />
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <Footer />
    </main>
  );
}

function Fact({ label, value }) {
  return (
    <div className="fact">
      <span>{label}</span>
      <strong>{value || "Unknown"}</strong>
    </div>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div>
        <strong>AI SRE Watchlist</strong>
        <p>A curated directory of companies building AI-native reliability products.</p>
      </div>
      <div className="footer-links">
        <a href="https://github.com/pavangudiwada/awesome-ai-sre" target="_blank" rel="noreferrer">GitHub</a>
        <a href="https://www.linkedin.com/company/ai-sre-watchlist" target="_blank" rel="noreferrer">LinkedIn</a>
        <a href="https://pavangudiwada.dev" target="_blank" rel="noreferrer">Pavan</a>
      </div>
    </footer>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<DirectoryPage />} />
        <Route path="/company/:slug" element={<CompanyPage />} />
        <Route path="/tool/:slug" element={<CompanyPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

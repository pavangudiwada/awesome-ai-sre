import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import yaml from "js-yaml";
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  Eye,
  Flag,
  Link2,
  Menu,
  Minus,
  Phone,
  Radio,
  Search,
  Settings,
  Star,
  Bookmark,
  BookmarkCheck,
  Unlock,
  X as XIcon,
} from "lucide-react";
import { OBSERVABILITY_FILTERS, OBSERVABILITY_TOOLS } from "./data/observability.js";
import { RESOURCE_FILTERS, RESOURCES } from "./data/resources.js";

const SUBMIT_URL =
  "https://github.com/pavangudiwada/awesome-ai-sre/issues/new?template=add-operate-tool.yml";

const KNOWN_BAD_LOCAL_LOGOS = new Set([
  "phoebe",
  "resolve-ai",
  "sentry",
  "starsling",
  "tierzero-ai",
]);

const NAV_LINKS = [
  { id: "tools", to: "/tools", label: "AI SRE Tools" },
  { id: "observability", to: "/observability", label: "Observability" },
  { id: "resources", to: "/resources", label: "Resources" },
];

const GITHUB_URL = "https://github.com/pavangudiwada/awesome-ai-sre";

const PRICE_OPTIONS = ["All", "Free", "Open Source", "Freemium", "Paid", "Enterprise"];
const UPDATE_RANGES = ["All", "30 days", "90 days", "180 days"];
const SORT_OPTIONS = [
  { value: "az", label: "A-Z" },
  { value: "last", label: "Recently checked" },
  { value: "oss", label: "Open source first" },
  { value: "featured", label: "Featured" },
];

const PROFILE_PAGES = [
  { id: "overview", label: "Overview" },
  { id: "integrations", label: "Integrations" },
  { id: "evidence", label: "Evidence" },
  { id: "releases", label: "Releases" },
  { id: "pricing", label: "Pricing" },
  { id: "alternatives", label: "Alternatives" },
  { id: "similar", label: "Similar Tools" },
];

const CATEGORY_MAP = {
  "Incident Response": "Incident AI",
  AIOps: "AIOps",
  Observability: "Observability",
  IDP: "AI SRE",
  IaC: "AI SRE",
  FinOps: "AI SRE",
  Security: "Learning",
  Deployment: "Runbooks",
};

const CATEGORY_FILTERS = [
  "All",
  "AI SRE",
  "Observability",
  "Incident AI",
  "AIOps",
  "OpenTelemetry",
  "Runbooks",
  "On-call",
  "OSS",
  "Learning",
];

const OBSERVABILITY_CATEGORY_FILTERS = ["All", "Logging", "Tracing", "Metrics", "OpenTelemetry", "Dashboards", "Pipelines", "Alerts"];
const RESOURCE_CATEGORY_FILTERS = ["All", "Blogs", "Newsletters", "Reports", "Guides", "Communities"];

const INTEGRATION_HINTS = {
  "Observability": ["OpenTelemetry", "Prometheus", "Grafana", "Datadog", "Sentry", "Honeycomb", "Jaeger"],
  "Incident Response": ["PagerDuty", "Opsgenie", "Statuspage", "Slack", "Microsoft Teams", "Opsgenie", "VictorOps"],
  "AIOps": ["Datadog", "New Relic", "Azure Monitor", "Dynatrace", "Grafana", "Splunk", "Sumo Logic"],
  "AI SRE": ["Kubernetes", "Terraform", "GitHub", "GitLab", "Argo", "Prometheus"],
  "Runbooks": ["Confluence", "Notion", "GitHub", "Jira", "ServiceNow"],
};

const BEST_PAGES = {
  "incident-response-ai-tools": {
    title: "Best Incident Response AI Tools",
    intent: "Teams with high-alert environments need fast decision support and coordinated response workflows.",
    categories: ["Incident AI", "AI SRE"],
    sort: "featured",
  },
  "observability-tools-for-startups": {
    title: "Best Observability AI Tools for Startups",
    intent: "Keep stack complexity low while preserving meaningful signal.",
    categories: ["Observability", "AI SRE"],
    sort: "featured",
  },
  "opentelemetry-tools": {
    title: "Best OpenTelemetry + AI SRE Tools",
    intent: "Choose tools that keep open telemetry data and AI workflows coherent.",
    categories: ["Observability", "OpenTelemetry", "AI SRE"],
    sort: "featured",
  },
  "aiops-tools": {
    title: "Best AIOps Tools",
    intent: "Prioritize practical signal extraction, incident automation, and predictable operations fit.",
    categories: ["AIOps", "AI SRE"],
    sort: "featured",
  },
  "on-call-management-tools": {
    title: "Best On-call Management Tools",
    intent: "Reduce handoffs and improve escalation quality through reliable routing.",
    categories: ["On-call", "AI SRE"],
    sort: "featured",
  },
  "runbook-automation-tools": {
    title: "Best Runbook Automation Tools",
    intent: "Operational workflows with clear actionability and auditability.",
    categories: ["Runbooks", "AI SRE", "AIOps"],
    sort: "featured",
  },
};

const ALTERNATIVES = {
  pagerduty: { title: "PagerDuty" },
  datadog: { title: "Datadog" },
  rootly: { title: "Rootly" },
  opsgenie: { title: "Opsgenie" },
  robusta: { title: "Robusta" },
  firehydrant: { title: "FireHydrant" },
};

function cleanDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

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

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function normalizeDeployment(values) {
  const source = Array.isArray(values) ? values : values ? [values] : [];
  return source
    .filter(Boolean)
    .map((value) => String(value).toLowerCase())
    .map((value) => {
      if (["saas", "cloud", "hosted"].includes(value)) return "Cloud";
      if (["on-prem", "self-hosted", "selfhosted", "onprem"].includes(value)) return "Self-hosted";
      if (value === "hybrid") return "Hybrid";
      if (value === "opensource" || value === "open-source" || value === "oss") return "Open source";
      return value;
    })
    .map((value) => {
      const normalized = value.replace(/\b./g, (c) => c.toUpperCase());
      return normalized.replace(/_/g, " ");
    });
}

function inferPricingTool(entry) {
  if (entry.opensource) return "Open Source";
  const summary = String(entry.summary || "").toLowerCase();
  if (summary.includes("free")) return "Free";
  if (summary.includes("enterprise")) return "Enterprise";
  if (summary.includes("freemium") || summary.includes("free tier")) return "Freemium";
  return "Paid";
}

function normalizeLogoValue(slug, value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("/logos/") && KNOWN_BAD_LOCAL_LOGOS.has(slug)) {
    return "";
  }

  return trimmed;
}

function inferCategories(tags, openSource, summary) {
  const result = new Set();

  (tags || []).forEach((tag) => {
    const normalized = CATEGORY_MAP[tag] || tag;
    if (normalized) result.add(normalized);
  });

  const normalizedSummary = String(summary || "").toLowerCase();
  if (openSource) result.add("OSS");
  if (normalizedSummary.includes("on-call") || normalizedSummary.includes("oncall")) result.add("On-call");

  return Array.from(result);
}

function toEvidenceTags(entry) {
  const tags = new Set();
  if (entry.opensource) tags.add("OSS");
  if (entry.claimed) tags.add("Verified");
  if (cleanDate(entry.screenshot_last_fetched || entry.dateAdded) && isWithinDays(entry.screenshot_last_fetched || entry.dateAdded, 30)) {
    tags.add("Recent");
  }
  if (entry.features && entry.features.length > 0) tags.add("Product Signals");
  return Array.from(tags);
}

function isWithinDays(value, days) {
  if (!value) return false;
  const parsed = new Date(`${cleanDate(value)}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  const now = new Date();
  return (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24) <= days;
}

function inferIntegrations(entry, categories) {
  const set = new Set();
  (categories || []).forEach((category) => {
    const options = INTEGRATION_HINTS[category] || [];
    options.forEach((value) => set.add(value));
  });

  const summary = String(entry.summary || "").toLowerCase();
  if (summary.includes("github")) set.add("GitHub");
  if (summary.includes("kubernetes")) set.add("Kubernetes");
  if (summary.includes("slack")) set.add("Slack");
  if (summary.includes("jira")) set.add("Jira");

  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function normalizeLinks(entry) {
  const rawLinks = entry.links || {};
  const direct = {
    github: entry.github,
    linkedin: entry.linkedin,
    x: entry.x,
    producthunt: entry.producthunt,
    docs: entry.docs,
  };

  return {
    website: entry.url,
    docs: rawLinks.docs || direct.docs,
    github: rawLinks.github || direct.github,
    linkedin: rawLinks.linkedin || direct.linkedin,
    x: rawLinks.x || direct.x,
    producthunt: rawLinks.producthunt || direct.producthunt,
  };
}

function loadCompanies() {
  const companies = [];

  for (const [filePath, raw] of Object.entries(
    import.meta.glob("../tools/operate/*.yaml", {
      eager: true,
      query: "?raw",
      import: "default",
    }),
  )) {
    const slug = filePath.match(/\/([^/]+)\.yaml$/)?.[1];
    if (!slug || slug.startsWith("_")) continue;

    let parsed;
    try {
      parsed = yaml.load(raw);
    } catch {
      continue;
    }

    if (!parsed?.name || !parsed?.url || !parsed?.summary) continue;

    const tags = Array.isArray(parsed.tags)
      ? parsed.tags
          .map((tag) => String(tag).trim())
          .filter(Boolean)
      : [];

    const deployment = normalizeDeployment(parsed.deployment);
    const openSource = Boolean(parsed.opensource);
    const categories = inferCategories(tags, openSource, parsed.summary);
    const links = normalizeLinks(parsed);
    const evidenceBadges = toEvidenceTags(parsed);
    const integrations = inferIntegrations(parsed, tags);

    companies.push({
      id: slug,
      slug,
      name: parsed.name,
      domain: getDomain(parsed.url),
      website: parsed.url,
      summary: decodeText(parsed.summary),
      description: decodeText(parsed.summary),
      longDescription: decodeText(parsed.description || parsed.summary),
      tags,
      categories,
      primaryCategory: categories[0] || "AI SRE",
      deployment,
      pricingModel: inferPricingTool({
        summary: parsed.summary,
        opensource: openSource,
      }),
      openSource,
      claimed: Boolean(parsed.claimed),
      screenshot: typeof parsed.screenshot === "string" ? parsed.screenshot : "",
      logo: normalizeLogoValue(slug, parsed.logo),
      dateAdded: cleanDate(parsed.dateAdded),
      screenshot_last_fetched: cleanDate(parsed.screenshot_last_fetched),
      features: Array.isArray(parsed.features) ? parsed.features.filter(Boolean).map(decodeText) : [],
      integrations,
      links,
      evidenceBadges,
      claimedAt: cleanDate(parsed.claimedAt),
      evidence: buildEvidenceFromCompany(parsed),
      updates: buildUpdatesFromCompany(parsed),
      alternatives: [],
    });
  }

  return companies.sort((a, b) => a.name.localeCompare(b.name));
}

function buildEvidenceFromCompany(parsed) {
  const links = normalizeLinks(parsed);
  const evidence = [
    {
      type: "Documentation",
      title: `${parsed.name} website`,
      url: parsed.url,
      summary: "Primary entry point with official feature and release context.",
      date: cleanDate(parsed.dateAdded),
    },
  ];

  if (links.github) {
    evidence.push({
      type: "Case study",
      title: `${parsed.name} repository`,
      url: links.github,
      summary: "Public source and implementation context where available.",
      date: cleanDate(parsed.screenshot_last_fetched) || cleanDate(parsed.dateAdded),
    });
  }

  if (parsed.screenshot) {
    evidence.push({
      type: "Benchmark",
      title: `${parsed.name} product view`,
      url: parsed.screenshot,
      summary: "Captured product screenshot for decision context.",
      date: cleanDate(parsed.screenshot_last_fetched) || cleanDate(parsed.dateAdded),
    });
  }

  return evidence;
}

function buildUpdatesFromCompany(parsed) {
  const updates = [];

  if (parsed.dateAdded) {
    updates.push({
      type: "news",
      title: `Profile added for ${parsed.name}`,
      summary: `Listed as part of AI SRE Watchlist directory with latest metadata refresh on ${cleanDate(parsed.dateAdded)}.`,
      date: cleanDate(parsed.dateAdded),
      url: parsed.url,
    });
  }

  if (parsed.screenshot_last_fetched) {
    updates.push({
      type: "release",
      title: `${parsed.name} snapshot refreshed`,
      summary: `Visual capture timestamped ${cleanDate(parsed.screenshot_last_fetched)} for ongoing review workflows.`,
      date: cleanDate(parsed.screenshot_last_fetched),
      url: parsed.screenshot || parsed.url,
    });
  }

  return updates;
}

function profileScore(tool) {
  return [
    tool.screenshot,
    tool.logo,
    tool.claimed,
    tool.dateAdded,
    tool.openSource,
    tool.features.length >= 3,
  ].filter(Boolean).length;
}

const COMPANIES = loadCompanies();
const COMPANY_BY_SLUG = new Map(COMPANIES.map((company) => [company.slug, company]));

const CATEGORY_COUNTS = CATEGORY_FILTERS.reduce((acc, category) => {
  if (category === "All") {
    acc[category] = COMPANIES.length;
    return acc;
  }

  acc[category] = COMPANIES.filter((company) => company.categories.includes(category)).length;
  return acc;
}, {});

const DEPLOYMENT_COUNTS = {
  All: COMPANIES.length,
  Cloud: COMPANIES.filter((tool) => tool.deployment.includes("Cloud")).length,
  "Self-hosted": COMPANIES.filter((tool) => tool.deployment.includes("Self-hosted")).length,
  Hybrid: COMPANIES.filter((tool) => tool.deployment.includes("Hybrid")).length,
  "Open source": COMPANIES.filter((tool) => tool.deployment.includes("Open source")).length,
};

const BEST_TOOL_IDS = new Set(
  COMPANIES
    .filter((tool) => tool.claimed || tool.evidenceBadges.includes("Verified") || (tool.pricingModel === "Open Source" && tool.openSource))
    .sort((a, b) => profileScore(b) - profileScore(a) || a.name.localeCompare(b.name))
    .slice(0, 10)
    .map((tool) => tool.slug),
);

const SiteStateContext = createContext(null);

function usePersistentSet(storageKey) {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return new Set();

    const existing = window.localStorage.getItem(storageKey);
    if (!existing) return new Set();
    try {
      const parsed = JSON.parse(existing);
      if (!Array.isArray(parsed)) return new Set();
      return new Set(parsed.filter(Boolean));
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(Array.from(value)));
  }, [value, storageKey]);

  function toggle(item) {
    setValue((previous) => {
      const next = new Set(previous);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  function clear() {
    setValue(new Set());
  }

  return {
    values: value,
    setValues: setValue,
    toggle,
    clear,
    isActive: (id) => value.has(id),
  };
}

function useSiteState() {
  return useContext(SiteStateContext);
}

function SiteProvider({ children }) {
  const saved = usePersistentSet("watchlist-saved-tools-v1");

  return (
    <SiteStateContext.Provider value={{ saved }}>
      {children}
    </SiteStateContext.Provider>
  );
}

function favicon(url) {
  const domain = getDomain(url);
  const encoded = encodeURIComponent(domain);
  return [
    `https://www.google.com/s2/favicons?sz=128&domain=${encoded}`,
    `https://icons.duckduckgo.com/ip3/${encoded}.ico`,
    `https://www.google.com/s2/favicons?sz=64&domain_url=${encoded}`,
    `https://logo.clearbit.com/${domain}`,
    `https://${domain}/favicon.ico`,
  ];
}

function resolvePublicAsset(relativePath) {
  if (!relativePath) return "";
  if (!relativePath.startsWith("/")) return relativePath;

  const base = import.meta.env.BASE_URL || "/";
  if (!base || base === "/") return relativePath;

  return `${base.replace(/\/$/, "")}/${relativePath.replace(/^\//, "")}`;
}

function fallbackColor(value) {
  const normalized = String(value || "").toLowerCase().trim();
  if (!normalized) return "#1f2937";

  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) % 360;
  }
  return `hsl(${hash}, 34%, 32%)`;
}

function toLocaleDate(value) {
  if (!value) return "Unknown";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function titleFromSlug(value, fallback = "All") {
  if (!value || value === "all") return fallback;
  const raw = String(value);
  const normalised = decodeURIComponent(raw).toLowerCase();

  if (normalised === "on-call" || normalised === "oncall") return "On-call";

  if (normalised === "incident-response" || normalised === "incident-response-ai") {
    return "Incident AI";
  }
  if (normalised === "open-telemetry") return "OpenTelemetry";

  const words = String(value)
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === "ai") return "AI";
      if (lower === "sre") return "SRE";
      if (lower === "otel") return "OpenTelemetry";
      if (lower === "idp") return "AI SRE";
      return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
    });

  if (!words.length) return fallback;
  return words.join(" ");
}

function mapValue(value, max = 4) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, max);
}

function buildBreadcrumb(label, to) {
  return [
    { label: "AI SRE Watchlist", to: "/" },
    { label, to },
  ];
}

function SearchShortcut() {
  useEffect(() => {
    const handler = (event) => {
      if (event.key === "/" || event.code === "Slash") {
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        const target = event.target;
        const active = target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
        if (active) return;

        const element = document.querySelector("[data-search-input]");
        if (element) {
          event.preventDefault();
          element.focus({ preventScroll: true });
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return null;
}

function SiteHeader() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [stars, setStars] = useState(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    fetch("https://api.github.com/repos/pavangudiwada/awesome-ai-sre")
      .then((r) => r.json())
      .then((data) => {
        if (data.stargazers_count != null) {
          const n = data.stargazers_count;
          setStars(n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header className="site-header">
      <div className="site-header__top">
        <Link className="brand" to="/" aria-label="AI SRE Watchlist homepage">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span>AI SRE Watchlist</span>
        </Link>

        <div className="header-toolbar">
          <a href={GITHUB_URL} className="github-stars-btn" target="_blank" rel="noreferrer">
            <Star size={14} aria-hidden="true" /> {stars != null ? stars : "GitHub"}
          </a>
          <button
            type="button"
            className="main-nav__mobile-toggle"
            aria-controls="primary-nav"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close primary navigation" : "Open primary navigation"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Menu size={18} aria-hidden="true" />
            <span>Menu</span>
          </button>
        </div>
      </div>

      <nav id="primary-nav" className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="Primary">
        <ul className="main-nav__list">
          {NAV_LINKS.map((entry) => (
            <li key={entry.id} className="main-nav__item">
              <NavLink
                to={entry.to}
                className={({ isActive }) => `main-nav__link ${isActive || ((location.pathname === "/" || location.pathname === "/tools") && entry.id === "tools") ? "is-active" : ""}`}
              >
                {entry.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

function ToolLogo({ tool, size = 42 }) {
  const [failed, setFailed] = useState(false);
  const [logoSourceIndex, setLogoSourceIndex] = useState(0);

  const logoSources = useMemo(() => {
    const candidates = [];
    const slug = tool.slug || "";
    const logo = typeof tool.logo === "string" ? tool.logo.trim() : "";

    if (logo && !KNOWN_BAD_LOCAL_LOGOS.has(slug)) {
      const logoUrl = logo.startsWith("/logos/") ? resolvePublicAsset(logo) : logo;
      candidates.push(logoUrl);
    }

    if (logo && logo.startsWith("/logos/") && !KNOWN_BAD_LOCAL_LOGOS.has(slug)) {
      const match = logo.match(/^(.+)\.(png|svg)$/i);
      if (match) {
        const base = match[1];
        const ext = match[2].toLowerCase();
        candidates.push(ext === "svg" ? resolvePublicAsset(`${base}.png`) : resolvePublicAsset(`${base}.svg`));
      }
    }

    if (typeof tool.website === "string" && tool.website.trim()) {
      const fallback = favicon(tool.website.trim());
      candidates.push(...fallback);
    }

    return [...new Set(candidates.filter(Boolean))];
  }, [tool.logo, tool.website]);

  const source = logoSources[logoSourceIndex];

  useEffect(() => {
    setFailed(false);
    setLogoSourceIndex(0);
  }, [tool.logo, tool.website]);

  if (failed) {
    const fallback = tool.name.slice(0, 2).toUpperCase() || "AI";
    return (
      <span
        className="tool-logo tool-logo--fallback"
        style={{
          width: size,
          height: size,
          fontSize: Math.max(10, Math.floor(size * 0.42)),
          backgroundImage: `linear-gradient(130deg, ${fallbackColor(tool.name || "")}, ${fallbackColor(tool.domain || tool.name || "")})`,
        }}
      >
        {fallback}
      </span>
    );
  }

  if (source) {
    return (
      <img
        className="tool-logo"
        src={source}
        alt={`${tool.name} logo`}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        style={{ width: size, height: size }}
        onError={() => {
          if (logoSourceIndex + 1 < logoSources.length) {
            setLogoSourceIndex((index) => index + 1);
            return;
          }
          setFailed(true);
        }}
      />
    );
  }

  return (
      <span
        className="tool-logo tool-logo--fallback"
        style={{
          width: size,
          height: size,
          fontSize: Math.max(10, Math.floor(size * 0.42)),
          backgroundImage: `linear-gradient(130deg, ${fallbackColor(tool.name || "")}, ${fallbackColor(tool.domain || tool.name || "")})`,
        }}
      >
      {tool.name.slice(0, 2).toUpperCase() || "AI"}
    </span>
  );
}

function ToolScreenshot({ tool }) {
  const [failed, setFailed] = useState(false);

  if (tool.screenshot && !failed) {
    return (
      <img
        className="tool-screenshot"
        src={tool.screenshot}
        alt={`${tool.name} product screenshot`}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="tool-screenshot tool-screenshot--placeholder">
      <ToolLogo tool={tool} size={44} />
      <div>
        <span>Preview unavailable</span>
        <p>{tool.name}</p>
      </div>
    </div>
  );
}

function SaveToolButton({ slug, compact = false }) {
  const { saved } = useSiteState();
  const active = saved.isActive(slug);

  return (
    <button
      type="button"
      className={`save-button ${compact ? "save-button--icon" : ""} ${active ? "save-button--active" : ""}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        saved.toggle(slug);
      }}
      aria-pressed={active}
      aria-label={active ? "Saved" : "Save this tool"}
    >
      {compact ? <BookmarkCheck size={15} aria-hidden="true" /> : active ? <><BookmarkCheck size={14} aria-hidden="true" /> Saved</> : <><Bookmark size={14} aria-hidden="true" /> Save</>}
    </button>
  );
}

function ChipRow({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="chip-row">
      {items.map((item) => (
        <span key={item} className="chip-row__item">
          {item}
        </span>
      ))}
    </div>
  );
}

function obsToTool(item) {
  return {
    slug: item.slug,
    name: item.name,
    domain: getDomain(item.url),
    website: item.url,
    summary: item.summary,
    longDescription: item.summary,
    screenshot: item.screenshot ? resolvePublicAsset(item.screenshot) : "",
    screenshot_last_fetched: item.lastReviewed,
    dateAdded: item.lastReviewed,
    evidenceBadges: item.ossStatus === "Open source" ? ["OSS"] : [],
    primaryCategory: item.type,
    categories: [item.type],
    openSource: item.ossStatus === "Open source",
    pricingModel: item.ossStatus === "Open source" ? "Open Source" : item.ossStatus === "Commercial" ? "Paid" : item.ossStatus,
    logo: item.logo ? resolvePublicAsset(item.logo) : "",
    features: item.useCases || [],
    integrations: item.ecosystem || [],
    links: {
      website: item.url,
      github: item.links?.github || null,
      docs: item.links?.docs || null,
      linkedin: null,
      x: null,
      producthunt: null,
    },
    claimed: false,
    deployment: item.deployment || [],
  };
}

const CATEGORY_ICONS = {
  "AI SRE": Settings,
  "Incident AI": AlertTriangle,
  "AIOps": Brain,
  "OpenTelemetry": Radio,
  "Runbooks": ClipboardList,
  "On-call": Phone,
  "OSS": Unlock,
  "Learning": BookOpen,
  "Observability": Eye,
};

function CategoryIcon({ category, size = 12 }) {
  const Icon = CATEGORY_ICONS[category];
  if (!Icon) return null;
  return <Icon size={size} aria-hidden="true" />;
}

function ToolCard({ tool, profileTo }) {
  const to = profileTo !== undefined ? profileTo : `/tools/${tool.slug}`;

  return (
    <article className="tool-card">
      <div className="tool-card__media">
        <Link className="tool-card__image-link" to={to} aria-label={`View ${tool.name} profile`}>
          <ToolScreenshot tool={tool} />
        </Link>
        <SaveToolButton slug={tool.slug} compact />
      </div>
      <Link className="tool-card__main" to={to}>
        <div className="tool-card__meta">
          <ToolLogo tool={tool} size={28} />
          <div>
            <h3 className="tool-card__name">{tool.name}</h3>
            <p className="tool-card__vendor">{tool.domain}</p>
          </div>
        </div>
        <p className="tool-card__summary">{tool.summary}</p>
        <div className="tool-card__chips">
          <span className="chip chip--icon">
            <CategoryIcon category={tool.primaryCategory} />{tool.primaryCategory}
          </span>
          {tool.openSource && <span className="chip chip--success chip--icon"><Unlock size={11} aria-hidden="true" /> OSS</span>}
        </div>
      </Link>
    </article>
  );
}

function SearchInput({ value, onChange, placeholder = "Search tools, vendors, integrations...", className = "" }) {
  return (
    <label className={`search-input ${className}`}>
      <Search size={15} aria-hidden="true" />
      <input
        data-search-input
        autoComplete="off"
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <kbd>⌘ K</kbd>
    </label>
  );
}

function hasCategoryMatch(tool, category) {
  if (category === "All") return true;
  return tool.categories.includes(category);
}

function matchesUpdateWindow(tool, value) {
  if (value === "All") return true;
  const checked = cleanDate(tool.screenshot_last_fetched || tool.dateAdded);
  if (!checked) return false;

  const window = Number.parseInt(value.split(" ")[0], 10) || 0;
  return isWithinDays(checked, window);
}

function filterToolsByState(tools, filters) {
  return tools.filter((tool) => {
    const query = filters.search.toLowerCase();
    const hasQuery =
      !query ||
      [tool.name, tool.summary, tool.domain, tool.primaryCategory, ...tool.tags, ...tool.features]
        .join(" ")
        .toLowerCase()
        .includes(query);

    if (!hasQuery) return false;
    if (!hasCategoryMatch(tool, filters.category)) return false;
    if (filters.deployment !== "All" && !tool.deployment.includes(filters.deployment)) return false;
    if (filters.pricing !== "All" && tool.pricingModel !== filters.pricing) return false;
    if (filters.openSourceOnly && !tool.openSource) return false;
    if (!matchesUpdateWindow(tool, filters.updated)) return false;

    if (filters.integration !== "All") {
      const hasIntegration = tool.integrations.some((integration) =>
        integration.toLowerCase().includes(filters.integration.toLowerCase()),
      );
      if (!hasIntegration) return false;
    }

    return true;
  });
}

function sortTools(tools, sortBy) {
  const list = [...tools];

  if (sortBy === "last") {
    return list.sort(
      (a, b) =>
        (new Date(`${cleanDate(b.screenshot_last_fetched || b.dateAdded) || 0}`).getTime() || 0) -
        (new Date(`${cleanDate(a.screenshot_last_fetched || a.dateAdded) || 0}`).getTime() || 0),
    );
  }
  if (sortBy === "oss") {
    return list.sort((a, b) => Number(b.openSource) - Number(a.openSource) || a.name.localeCompare(b.name));
  }
  if (sortBy === "featured") {
    return list.sort((a, b) => Number(BEST_TOOL_IDS.has(b.slug)) - Number(BEST_TOOL_IDS.has(a.slug)) || a.name.localeCompare(b.name));
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

function AccordionSection({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="accordion-section">
      <button type="button" className="accordion-header" onClick={() => setOpen((o) => !o)}>
        <span>{title}</span>
        <span className="accordion-arrow">{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
      </button>
      {open && <div className="accordion-body">{children}</div>}
    </div>
  );
}

function ToolsAccordionSidebar({ values, onChange, categoryCounts }) {
  const deploymentOptions = ["Cloud", "Self-hosted", "Hybrid", "Open source"];
  const pricingOptions = ["Free", "Freemium", "Paid", "Enterprise", "Open Source"];

  return (
    <aside className="accordion-sidebar">
      <AccordionSection title="Category" defaultOpen>
        {CATEGORY_FILTERS.filter((c) => c !== "All").map((cat) => {
          const count = categoryCounts[cat] || 0;
          return (
            <button
              key={cat}
              type="button"
              className={`accordion-option ${values.category === cat ? "is-active" : ""}`}
              onClick={() => onChange("category", values.category === cat ? "All" : cat)}
            >
              <span>{cat}</span>
              <span className="accordion-count">{count}</span>
            </button>
          );
        })}
      </AccordionSection>

      <AccordionSection title="Deployment">
        {deploymentOptions.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`accordion-option ${values.deployment === opt ? "is-active" : ""}`}
            onClick={() => onChange("deployment", values.deployment === opt ? "All" : opt)}
          >
            <span>{opt}</span>
          </button>
        ))}
      </AccordionSection>

      <AccordionSection title="Pricing">
        {pricingOptions.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`accordion-option ${values.pricing === opt ? "is-active" : ""}`}
            onClick={() => onChange("pricing", values.pricing === opt ? "All" : opt)}
          >
            <span>{opt}</span>
          </button>
        ))}
      </AccordionSection>

      <div className="accordion-toggle-row">
        <label>
          <input
            type="checkbox"
            checked={values.openSourceOnly}
            onChange={(e) => onChange("openSourceOnly", e.target.checked)}
          />
          <span>Open source only</span>
        </label>
      </div>
    </aside>
  );
}

function ObsAccordionSidebar({ signal, setSignal, layer, setLayer, deployment, setDeployment }) {
  const signalOptions = OBSERVABILITY_FILTERS.signals;
  const layerOptions = OBSERVABILITY_FILTERS.layers;
  const deploymentOptions = OBSERVABILITY_FILTERS.deployment;

  return (
    <aside className="accordion-sidebar">
      <AccordionSection title="Signal" defaultOpen>
        {signalOptions.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`accordion-option ${signal === opt ? "is-active" : ""}`}
            onClick={() => setSignal(signal === opt ? "All" : opt)}
          >
            <span>{opt}</span>
          </button>
        ))}
      </AccordionSection>

      <AccordionSection title="Layer">
        {layerOptions.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`accordion-option ${layer === opt ? "is-active" : ""}`}
            onClick={() => setLayer(layer === opt ? "All" : opt)}
          >
            <span>{opt}</span>
          </button>
        ))}
      </AccordionSection>

      <AccordionSection title="Deployment">
        {deploymentOptions.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`accordion-option ${deployment === opt ? "is-active" : ""}`}
            onClick={() => setDeployment(deployment === opt ? "All" : opt)}
          >
            <span>{opt}</span>
          </button>
        ))}
      </AccordionSection>
    </aside>
  );
}

function ResourceAccordionSidebar({ type, setType, topic, setTopic, sourceType, setSourceType, topicOptions }) {
  const typeOptions = collectOptions(RESOURCES, "type").filter((o) => o !== "All");
  const sourceTypeOptions = RESOURCE_FILTERS.sourceTypes;

  return (
    <aside className="accordion-sidebar">
      <AccordionSection title="Type" defaultOpen>
        {typeOptions.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`accordion-option ${type === opt ? "is-active" : ""}`}
            onClick={() => setType(type === opt ? "All" : opt)}
          >
            <span>{opt}</span>
          </button>
        ))}
      </AccordionSection>

      <AccordionSection title="Topic">
        {topicOptions.filter((o) => o !== "All").map((opt) => (
          <button
            key={opt}
            type="button"
            className={`accordion-option ${topic === opt ? "is-active" : ""}`}
            onClick={() => setTopic(topic === opt ? "All" : opt)}
          >
            <span>{opt}</span>
          </button>
        ))}
      </AccordionSection>

      <AccordionSection title="Source">
        {sourceTypeOptions.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`accordion-option ${sourceType === opt ? "is-active" : ""}`}
            onClick={() => setSourceType(sourceType === opt ? "All" : opt)}
          >
            <span>{opt}</span>
          </button>
        ))}
      </AccordionSection>
    </aside>
  );
}

function ToolDirectoryPage({ initialCategory = "All" }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const routeCategory = useParams().category;
  const categoryFromUrl = (routeCategory ? titleFromSlug(routeCategory, "All") : searchParams.get("category")) || initialCategory || "All";
  const initialSearch = searchParams.get("q") || "";
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(categoryFromUrl);
  const [deployment, setDeployment] = useState("All");
  const [pricing, setPricing] = useState("All");
  const [openSourceOnly, setOpenSourceOnly] = useState(false);
  const [updated] = useState("All");
  const [integration] = useState("All");
  const [sortBy, setSortBy] = useState("az");

  useEffect(() => {
    setCategory(categoryFromUrl);
  }, [categoryFromUrl]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    if (search) nextParams.set("q", search);
    else nextParams.delete("q");
    if (category !== "All") nextParams.set("category", category);
    else nextParams.delete("category");
    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [search, category, searchParams, setSearchParams]);

  const filters = useMemo(
    () => ({ search, category, deployment, pricing, openSourceOnly, integration, updated }),
    [search, category, deployment, pricing, openSourceOnly, integration, updated],
  );

  const tools = useMemo(() => sortTools(filterToolsByState(COMPANIES, filters), sortBy), [filters, sortBy]);

  const categoryCounts = useMemo(() => {
    const base = filterToolsByState(COMPANIES, { ...filters, category: "All" });
    return CATEGORY_FILTERS.reduce((acc, cat) => {
      acc[cat] = cat === "All" ? base.length : base.filter((t) => t.categories.includes(cat)).length;
      return acc;
    }, {});
  }, [filters]);

  function setFilterState(key, value) {
    const map = { deployment: setDeployment, pricing: setPricing, openSourceOnly: setOpenSourceOnly, category: setCategory };
    if (map[key]) map[key](value);
  }

  const visiblePills = CATEGORY_FILTERS.filter((cat) => cat === "All" || (categoryCounts[cat] || 0) > 0);

  return (
    <main>
      <section className="tools-hero">
        <h1>Find the AI tools that improve reliability.</h1>
        <p className="tools-hero__copy">A curated directory for AI SRE, observability, incident response, and reliability engineering.</p>
      </section>

      <section className="tool-page-layout">
        <ToolsAccordionSidebar
          values={{ category, deployment, pricing, openSourceOnly }}
          onChange={setFilterState}
          categoryCounts={categoryCounts}
        />

        <div className="tool-page-layout__content">
          <SearchInput value={search} onChange={setSearch} placeholder="Search tools, vendors, capabilities..." />

          <div className="category-pills-row">
            {visiblePills.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`category-pill ${category === cat ? "category-pill--active" : ""}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
                {cat !== "All" && (
                  <span className="category-pill-count">{categoryCounts[cat] || 0}</span>
                )}
              </button>
            ))}
          </div>

          <div className="results-header">
            <h2 style={{ fontSize: 14, color: "var(--text-soft)", fontWeight: 400 }}>{tools.length} tools</h2>
            <label className="inline-select">
              <span>Sort</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </div>

          <div className="tool-grid">
            {tools.length === 0 ? (
              <p className="empty-copy">No tools match those filters.</p>
            ) : (
              tools.map((tool) => <ToolCard key={tool.slug} tool={tool} />)
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function ToolHeroSection({ title, description, tools }) {
  return (
    <section className="market-hero">
      <p className="eyebrow">Featured</p>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="tool-grid">
        {tools.map((tool) => (
          <ToolCard key={tool.slug} tool={tool} />
        ))}
      </div>
    </section>
  );
}

function FactStrip({ children, className = "" }) {
  return <section className={`fact-strip ${className}`}>{children}</section>;
}

function Fact({ label, value }) {
  return (
    <div className="fact">
      <span>{label}</span>
      <strong>{value || "Unknown"}</strong>
    </div>
  );
}

function ProfileHeader({ tool, backPath = "/tools", backLabel = "Tools" }) {
  return (
    <section className="detail-hero">
      <div className="breadcrumbs">
        <Link to={backPath}>{backLabel}</Link>
        <span>/</span>
        <Link to={`${backPath}?category=${encodeURIComponent(tool.primaryCategory)}`}>{tool.primaryCategory}</Link>
        <span>/</span>
        <strong>{tool.name}</strong>
      </div>

      <div className="detail-hero__card">
        <div className="detail-hero__identity">
          <ToolLogo tool={tool} size={56} />
          <div>
            <p className="detail-title">
              {tool.name}
              {tool.claimed && <span className="detail-title__badge">Verified</span>}
            </p>
            <p className="hero__copy">{tool.summary}</p>
          </div>
        </div>

        <div className="detail-hero__actions">
          <a className="button" href={tool.website} target="_blank" rel="noreferrer">
            Visit website <ExternalLink size={12} aria-hidden="true" />
          </a>
          <SaveToolButton slug={tool.slug} />
          <a className="button button--ghost" href={SUBMIT_URL} target="_blank" rel="noreferrer">
            Submit correction
          </a>
        </div>
      </div>

      <FactStrip>
        <Fact label="Category" value={tool.primaryCategory} />
        <Fact label="Deployment" value={tool.deployment.join(", ") || "Unknown"} />
        <Fact label="Pricing" value={tool.pricingModel} />
        <Fact label="Open source" value={tool.openSource ? "Yes" : "No"} />
        <Fact label="Last checked" value={toLocaleDate(tool.screenshot_last_fetched || tool.dateAdded)} />
        <Fact label="Vendor website" value={tool.domain} />
      </FactStrip>
    </section>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button type="button" className={`tab-button ${active ? "is-active" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

function EvidenceList({ items }) {
  if (!items || items.length === 0) {
    return <p className="empty-copy">No evidence entries yet. Please propose improvements via submit correction.</p>;
  }

  return (
    <div className="evidence-grid">
      {items.map((entry) => (
        <article className="content-card" key={entry.title + entry.type}>
          <p className="eyebrow eyebrow--tiny">{entry.type}</p>
          <h3>{entry.title}</h3>
          <p>{entry.summary}</p>
          <div className="content-card__meta">
            {toLocaleDate(entry.date)} • <a href={entry.url} target="_blank" rel="noreferrer">View source</a>
          </div>
        </article>
      ))}
    </div>
  );
}

function ReleasesList({ tool }) {
  const updates = (tool.updates || []).slice(0, 6);
  if (!updates.length) {
    return <p className="empty-copy">This profile does not have release notes yet.</p>;
  }

  return (
    <div className="evidence-grid">
      {updates.map((entry) => (
        <article className="content-card" key={entry.title}>
          <p className="eyebrow eyebrow--tiny">{entry.type}</p>
          <h3>{entry.title}</h3>
          <p>{entry.summary}</p>
          <div className="content-card__meta">{toLocaleDate(entry.date)}</div>
          <a href={entry.url} target="_blank" rel="noreferrer">
            Open update
          </a>
        </article>
      ))}
    </div>
  );
}

const INTEGRATION_DOMAINS = {
  "Slack": "slack.com",
  "PagerDuty": "pagerduty.com",
  "Datadog": "datadoghq.com",
  "GitHub": "github.com",
  "GitLab": "gitlab.com",
  "Grafana": "grafana.com",
  "Prometheus": "prometheus.io",
  "Kubernetes": "kubernetes.io",
  "OpenTelemetry": "opentelemetry.io",
  "Jira": "atlassian.com",
  "Opsgenie": "atlassian.com",
  "ServiceNow": "servicenow.com",
  "Confluence": "atlassian.com",
  "New Relic": "newrelic.com",
  "Honeycomb": "honeycomb.io",
  "Sentry": "sentry.io",
  "Jaeger": "jaegertracing.io",
  "Argo": "argoproj.io",
  "Terraform": "terraform.io",
  "CircleCI": "circleci.com",
  "Jenkins": "jenkins.io",
  "Microsoft Teams": "microsoft.com",
  "Splunk": "splunk.com",
  "Dynatrace": "dynatrace.com",
  "Sumo Logic": "sumologic.com",
  "Azure Monitor": "azure.microsoft.com",
  "VictorOps": "splunk.com",
  "Notion": "notion.so",
};

function IntegrationChip({ name }) {
  const domain = INTEGRATION_DOMAINS[name];
  return (
    <span className="integration-chip">
      {domain && (
        <img
          className="integration-chip__logo"
          src={`https://www.google.com/s2/favicons?sz=32&domain=${domain}`}
          alt=""
          width={14}
          height={14}
          loading="lazy"
        />
      )}
      {name}
    </span>
  );
}

function IntegrationsSection({ tool }) {
  const integrationsByCategory = {
    Observability: tool.integrations.filter((i) =>
      ["OpenTelemetry", "Prometheus", "Grafana", "Datadog", "Sentry", "Jaeger", "Honeycomb", "New Relic", "Dynatrace", "Sumo Logic", "Splunk"].includes(i),
    ),
    Incident: tool.integrations.filter((i) =>
      ["PagerDuty", "ServiceNow", "Jira", "Slack", "Microsoft Teams", "Opsgenie", "Zendesk", "VictorOps"].includes(i),
    ),
    DevTools: tool.integrations.filter((i) =>
      ["Kubernetes", "GitHub", "GitLab", "Terraform", "CircleCI", "Argo", "Jenkins", "Confluence", "Notion"].includes(i),
    ),
  };

  const groups = Object.entries(integrationsByCategory).filter(([, items]) => items.length > 0);

  if (groups.length === 0) return null;

  return (
    <div className="integration-groups">
      {groups.map(([group, items]) => (
        <div key={group}>
          <p className="profile-section-title" style={{ marginBottom: 8 }}>{group}</p>
          <div className="integration-chips-row">
            {items.map((integration) => (
              <IntegrationChip key={integration} name={integration} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PricingSection({ tool }) {
  return (
    <section className="content-card">
      <p className="eyebrow eyebrow--tiny">Pricing</p>
      <h3>{tool.pricingModel}</h3>
      <p>
        This page uses inferred pricing signals from available listing fields. For exact pricing and contract terms, open the
        vendor website.
      </p>
      <a href={tool.website} target="_blank" rel="noreferrer">
        Vendor pricing page <ExternalLink size={12} aria-hidden="true" />
      </a>
    </section>
  );
}

function SimilarTools({ tool }) {
  const similar = useMemo(() => {
    return COMPANIES.filter((candidate) => candidate.slug !== tool.slug && sharedTags(candidate, tool) > 0)
      .sort((a, b) => sharedTags(b, tool) - sharedTags(a, tool) || a.name.localeCompare(b.name))
      .slice(0, 6);
  }, [tool]);

  return (
    <div className="tool-grid">
      {similar.map((item) => (
        <ToolCard key={item.slug} tool={item} />
      ))}
    </div>
  );
}

function sharedTags(left, right) {
  const set = new Set(left.categories);
  return right.categories.filter((tag) => set.has(tag)).length;
}

function ProfileHeroImage({ tool }) {
  const [failed, setFailed] = useState(false);
  if (tool.screenshot && !failed) {
    return (
      <img
        className="profile-hero-image"
        src={tool.screenshot}
        alt={`${tool.name} product screenshot`}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className="profile-hero-placeholder">
      <ToolLogo tool={tool} size={48} />
      <span>{tool.name}</span>
    </div>
  );
}

function IconBluesky() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.335 5.144c-1.654-1.199-4.335-2.127-4.335.826 0 .59.35 4.953.556 5.661.713 2.463 3.13 2.75 5.444 2.369-4.045.665-4.889 3.208-2.667 5.41 1.03 1.018 1.913 1.59 2.667 1.59 2 0 3.134-2.769 3.5-3.5.333-.667.5-1.167.5-1.5 0 .333.167.833.5 1.5.366.731 1.5 3.5 3.5 3.5.754 0 1.637-.571 2.667-1.59 2.222-2.203 1.378-4.746-2.667-5.41 2.314.38 4.73.094 5.444-2.369.206-.708.556-5.072.556-5.661 0-2.953-2.68-2.025-4.335-.826-2.293 1.662-4.76 5.048-5.665 6.856-.905-1.808-3.372-5.194-5.665-6.856z" />
    </svg>
  );
}

function IconHN() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4m0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2z" />
      <path d="M8 7l4 6 4-6" />
      <path d="M12 17l0-4" />
    </svg>
  );
}

function IconReddit() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8c2.648 0 5.028.826 6.675 2.14a2.5 2.5 0 0 1 2.326 4.36c0 3.59-4.03 6.5-9 6.5-4.875 0-8.845-2.8-9-6.294l-1-.206a2.5 2.5 0 0 1 2.326-4.36c1.646-1.313 4.026-2.14 6.674-2.14z" />
      <path d="M12 8l1-5 6 1" />
      <path d="M19 4m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0" />
      <circle cx="9" cy="13" r=".5" fill="currentColor" />
      <circle cx="15" cy="13" r=".5" fill="currentColor" />
      <path d="M10 17c.667.333 1.333.5 2 .5s1.333-.167 2-.5" />
    </svg>
  );
}

function ProfileShareBar({ tool }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";
  const title = encodeURIComponent(`${tool.name} - AI SRE Watchlist`);
  const enc = encodeURIComponent(url);

  function copyLink() {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  const reportUrl = `${GITHUB_URL}/issues/new?title=${encodeURIComponent(`Report: ${tool.name}`)}&labels=report`;

  return (
    <div className="share-bar-wrapper">
      <div className="share-bar">
        <button
          type="button"
          className={`share-bar__btn${copied ? " share-bar__btn--copied" : ""}`}
          onClick={copyLink}
          title={copied ? "Copied!" : "Copy link"}
        >
          {copied ? <Check size={15} aria-hidden="true" /> : <Link2 size={15} aria-hidden="true" />}
        </button>
        <div className="share-bar__divider" />
        <a className="share-bar__btn" href={`https://x.com/intent/post?text=${title}&url=${enc}`} target="_blank" rel="noreferrer nofollow" title="Share on X">
          <XIcon size={15} aria-hidden="true" />
        </a>
        <a className="share-bar__btn" href={`https://bsky.app/intent/compose?text=${title}+${enc}`} target="_blank" rel="noreferrer nofollow" title="Share on Bluesky">
          <IconBluesky />
        </a>
        <a className="share-bar__btn" href={`https://linkedin.com/sharing/share-offsite?url=${enc}`} target="_blank" rel="noreferrer nofollow" title="Share on LinkedIn">
          <IconLinkedIn />
        </a>
        <a className="share-bar__btn" href={`https://news.ycombinator.com/submitlink?u=${enc}&t=${title}`} target="_blank" rel="noreferrer nofollow" title="Share on Hacker News">
          <IconHN />
        </a>
        <a className="share-bar__btn" href={`https://reddit.com/submit?url=${enc}&title=${title}`} target="_blank" rel="noreferrer nofollow" title="Share on Reddit">
          <IconReddit />
        </a>
        <div className="share-bar__divider" />
        <a className="share-bar__action-btn share-bar__action-btn--claim" href={SUBMIT_URL} target="_blank" rel="noreferrer">
          <BadgeCheck size={14} aria-hidden="true" /><span>Claim</span>
        </a>
        <a className="share-bar__action-btn" href={reportUrl} target="_blank" rel="noreferrer">
          <Flag size={14} aria-hidden="true" /><span>Report</span>
        </a>
      </div>
    </div>
  );
}

function ToolProfilePage() {
  const { slug } = useParams();
  const tool = COMPANY_BY_SLUG.get(slug);

  const related = useMemo(() => {
    if (!tool) return [];
    return COMPANIES.filter((c) => c.slug !== tool.slug && sharedTags(c, tool) > 0)
      .sort((a, b) => sharedTags(b, tool) - sharedTags(a, tool) || a.name.localeCompare(b.name))
      .slice(0, 4);
  }, [tool]);

  if (!tool) return <Navigate to="/tools" replace />;

  return (
    <main>
      <div className="profile-back-bar">
        <Link to="/tools" className="profile-back-link"><ArrowLeft size={14} aria-hidden="true" /> AI SRE Tools</Link>
        <span className="profile-back-bar__crumb">{tool.name}</span>
      </div>

      <section className="profile-layout">
        <article className="profile-content">
          <ProfileHeroImage tool={tool} />

          <div className="profile-title-block">
            <div className="profile-title-row">
              <ToolLogo tool={tool} size={40} />
              <div>
                <h1 className="profile-name">{tool.name}</h1>
                <p className="profile-company">{tool.domain}</p>
              </div>
            </div>
          </div>

          <div className="content-card profile-section">
            <p>{tool.longDescription}</p>
          </div>

          {tool.features.length > 0 && (
            <div className="content-card profile-section">
              <p className="profile-section-title">Core capabilities</p>
              <div className="feature-list">
                {tool.features.map((f) => <p key={f} className="feature-item"><Check size={13} aria-hidden="true" /> {f}</p>)}
              </div>
            </div>
          )}

          {tool.integrations.length > 0 && (
            <div className="content-card profile-section">
              <p className="profile-section-title">Integrations</p>
              <IntegrationsSection tool={tool} />
            </div>
          )}

          <div className="content-card profile-section">
            <p className="profile-section-title">Case Studies & Proof</p>
            {tool.evidence.length === 0 ? (
              <p className="empty-copy">No case studies yet.</p>
            ) : (
              <EvidenceList items={tool.evidence} />
            )}
          </div>

          {related.length > 0 && (
            <div className="profile-section">
              <p className="profile-section-title" style={{ marginBottom: 12 }}>Similar tools</p>
              <div className="tool-grid">
                {related.map((c) => <ToolCard key={c.slug} tool={c} />)}
              </div>
            </div>
          )}
        </article>

        <aside className="profile-sidebar">
          <div className="content-card profile-sidebar-card">
            <div className="profile-sidebar-identity">
              <ToolLogo tool={tool} size={48} />
              <div>
                <p className="profile-sidebar-name">{tool.name}</p>
                <p className="profile-sidebar-company">{tool.domain}</p>
              </div>
            </div>

            <a href={tool.website} target="_blank" rel="noreferrer" className="button button--primary">
              Visit website <ExternalLink size={12} aria-hidden="true" />
            </a>

            <dl className="profile-facts">
              <dt>Category</dt>
              <dd><span className="chip">{tool.primaryCategory}</span></dd>
              <dt>Deployment</dt>
              <dd>{tool.deployment.join(", ") || "—"}</dd>
              <dt>Pricing</dt>
              <dd>{tool.pricingModel}</dd>
              <dt>Open Source</dt>
              <dd>
                <span className={`chip ${tool.openSource ? "chip--success" : ""}`}>
                  {tool.openSource ? "Yes" : "No"}
                </span>
              </dd>
            </dl>

            {(tool.links.github || tool.links.docs || tool.links.linkedin || tool.links.x) && (
              <div className="profile-links">
                {tool.links.github && <a href={tool.links.github} target="_blank" rel="noreferrer">GitHub <ExternalLink size={11} aria-hidden="true" /></a>}
                {tool.links.docs && <a href={tool.links.docs} target="_blank" rel="noreferrer">Docs <ExternalLink size={11} aria-hidden="true" /></a>}
                {tool.links.linkedin && <a href={tool.links.linkedin} target="_blank" rel="noreferrer">LinkedIn <ExternalLink size={11} aria-hidden="true" /></a>}
                {tool.links.x && <a href={tool.links.x} target="_blank" rel="noreferrer">X <ExternalLink size={11} aria-hidden="true" /></a>}
              </div>
            )}

            {tool.dateAdded && (
              <p className="profile-added">Added {toLocaleDate(tool.dateAdded)}</p>
            )}
          </div>

          {related.length > 0 && (
            <div className="content-card" style={{ marginTop: 12 }}>
              <p className="eyebrow" style={{ marginBottom: 10 }}>Related tools</p>
              <div className="sidebar-tools-list">
                {related.map((c) => (
                  <Link key={c.slug} to={`/tools/${c.slug}`} className="sidebar-tool-link">
                    <ToolLogo tool={c} size={20} />
                    <span>{c.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </section>
      <ProfileShareBar tool={tool} />
    </main>
  );
}

function BestToolsPage() {
  const { slug } = useParams();
  const config = BEST_PAGES[slug] || { title: slug.split("-").join(" "), intent: "Curated directory selection", categories: ["AI SRE"], sort: "featured" };

  const tools = useMemo(() => {
    const filtered = COMPANIES.filter((tool) => {
      if (!config.categories.length) return true;
      return tool.categories.some((category) => config.categories.includes(category));
    });

    return sortTools(filtered, config.sort || "featured").slice(0, 18);
  }, [slug, config.categories, config.sort]);

  return (
    <main>
      <section className="page-hero">
        <p className="eyebrow">Best Picks</p>
        <h1>{config.title}</h1>
        <p>{config.intent}</p>
      </section>

      <section className="content-layout">
        <article className="content-card">
          <p className="eyebrow">Methodology</p>
          <h2>Signal over hype, updated from directory metadata</h2>
          <p>
            Ranking uses a practical blend of evidence tags, source completeness, claimed/verified status, open source posture,
            and release freshness. This page highlights decision-support signals without replacing manual validation.
          </p>
        </article>

        <div className="tool-grid">
          {tools.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </section>
    </main>
  );
}

function AlternativesPage() {
  const { slug } = useParams();
  const canonical = slug.toLowerCase();
  const anchor = COMPANY_BY_SLUG.get(canonical);

  const alternatives = useMemo(() => {
    if (!anchor) {
      const candidate = Array.from(COMPANY_BY_SLUG.values()).find((tool) => tool.name.toLowerCase().includes(canonical));
      if (!candidate) return [];
      return COMPANIES.filter((tool) => tool.slug !== candidate.slug && sharedTags(tool, candidate) > 0).slice(0, 8);
    }

    return COMPANIES.filter((tool) => tool.slug !== anchor.slug && sharedTags(tool, anchor) > 0).slice(0, 8);
  }, [canonical, anchor]);

  const title = ALTERNATIVES[canonical]?.title || `${canonical.replace(/-/g, " ")} alternatives`;

  return (
    <main>
      <section className="page-hero">
        <p className="eyebrow">Alternatives</p>
        <h1>Best alternatives to {title}</h1>
        <p>
          Evaluate practical alternatives by category match, deployment model, and integration pattern instead of vendor marketing.
        </p>
      </section>

      <section className="content-layout">
        <div className="tool-grid">
          {alternatives.length === 0 ? (
            <p className="empty-copy">No alternatives found for this input.</p>
          ) : (
            alternatives.map((tool) => <ToolCard key={tool.slug} tool={tool} />)
          )}
        </div>
      </section>
    </main>
  );
}

function SavedToolsPage() {
  const { saved } = useSiteState();
  const tools = useMemo(() => {
    return Array.from(saved.values)
      .map((slug) => COMPANY_BY_SLUG.get(slug))
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [saved.values]);

  return (
    <main>
      <section className="page-hero">
        <p className="eyebrow">Saved tools</p>
        <h1>Your saved tools</h1>
        <p>Use localStorage-based bookmarks for your current research workflow.</p>
      </section>

      <section className="content-layout">
        <div className="content-header">
          <h2>{tools.length} tools</h2>
          <button
            type="button"
            className="clear-button"
            onClick={() => saved.clear()}
            disabled={tools.length === 0}
          >
            Clear all
          </button>
        </div>
        <div className="tool-grid">
          {tools.length > 0 ? (
            tools.map((tool) => <ToolCard key={tool.slug} tool={tool} />)
          ) : (
            <p className="empty-copy">No tools saved yet. Open a profile and use the Save button.</p>
          )}
        </div>
      </section>
    </main>
  );
}

function DetailMetric({ label, value }) {
  return <Fact label={label} value={value} />;
}

function arrayMatches(values, active) {
  if (active === "All") return true;
  return Array.isArray(values) && values.includes(active);
}

function observabilityCategoryMatches(item, category) {
  if (category === "All") return true;
  if (category === "Logging") return item.signals.includes("Logs") || item.type.toLowerCase().includes("log");
  if (category === "Tracing") return item.signals.includes("Traces") || item.type.toLowerCase().includes("trace");
  if (category === "Metrics") return item.signals.includes("Metrics") || item.type.toLowerCase().includes("metric");
  if (category === "OpenTelemetry") return item.ecosystem.includes("OpenTelemetry");
  if (category === "Dashboards") return item.layers.includes("Visualization") || item.type.toLowerCase().includes("visual");
  if (category === "Pipelines") return item.layers.includes("Pipeline") || item.layers.includes("Collector") || item.type.toLowerCase().includes("pipeline");
  if (category === "Alerts") return item.signals.includes("Alerts") || item.layers.includes("Alerting");
  return true;
}

function resourceCategoryMatches(item, category) {
  if (category === "All") return true;
  const needle = category.toLowerCase().replace(/s$/, "");
  return [item.type, item.sourceType, ...item.topics]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

function collectOptions(items, key) {
  return ["All", ...Array.from(new Set(items.flatMap((item) => item[key] || []))).sort((a, b) => a.localeCompare(b))];
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="filters__label">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function StackCard({ item }) {
  const toolLike = useMemo(() => ({
    slug: item.slug,
    name: item.name,
    logo: "",
    website: item.url,
    domain: getDomain(item.url),
  }), [item.slug, item.name, item.url]);

  return (
    <article className="content-card--small">
      <div className="content-card__head">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ToolLogo tool={toolLike} size={28} />
          <div>
            <p className="eyebrow">{item.type}</p>
            <h3>{item.name}</h3>
          </div>
        </div>
        <span>{item.ossStatus}</span>
      </div>
      <p>{item.summary}</p>
      <div className="chip-row">
        {[...item.signals.slice(0, 3), ...item.layers.slice(0, 1)].map((tag) => <span key={tag} className="chip-row__item">{tag}</span>)}
      </div>
      <div className="card-meta">
        <strong>{mapValue(item.ecosystem, 2).join(" / ")}</strong>
        <span>Reviewed {item.lastReviewed}</span>
      </div>
      <div className="content-card__actions">
        <Link to={`/observability/${item.slug}`}>Profile</Link>
        <a href={item.url} target="_blank" rel="noreferrer">Website <ExternalLink size={11} aria-hidden="true" /></a>
      </div>
    </article>
  );
}

function ResourceCard({ item }) {
  return (
    <a href={item.url} target="_blank" rel="noreferrer" className="resource-card">
      <div className="resource-card__head">
        <div>
          <p className="resource-card__type">{item.type}</p>
          <h3 className="resource-card__title">{item.title}</h3>
          <p className="resource-card__source">{item.source}</p>
        </div>
        {item.sourceType && <span className="chip">{item.sourceType}</span>}
      </div>
      <p className="resource-card__summary">{item.summary}</p>
      <div className="chip-row" style={{ marginTop: 8 }}>
        {item.topics.slice(0, 3).map((topic) => <span key={topic} className="chip-row__item">{topic}</span>)}
        {item.frequency && <span className="chip-row__item">{item.frequency}</span>}
      </div>
    </a>
  );
}

function ObservabilityPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [signal, setSignal] = useState("All");
  const [layer, setLayer] = useState("All");
  const [deployment, setDeployment] = useState("All");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return OBSERVABILITY_TOOLS.filter((item) => {
      if (!observabilityCategoryMatches(item, category)) return false;
      if (!arrayMatches(item.signals, signal)) return false;
      if (!arrayMatches(item.layers, layer)) return false;
      if (deployment !== "All" && item.ossStatus !== deployment && !arrayMatches(item.deployment, deployment)) return false;
      if (!query) return true;
      return [item.name, item.summary, item.type, item.ossStatus, ...item.signals, ...item.layers, ...item.ecosystem, ...item.useCases]
        .join(" ").toLowerCase().includes(query);
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [category, deployment, layer, search, signal]);

  const catCounts = useMemo(() => {
    return OBSERVABILITY_CATEGORY_FILTERS.reduce((acc, cat) => {
      acc[cat] = cat === "All" ? OBSERVABILITY_TOOLS.length : OBSERVABILITY_TOOLS.filter((t) => observabilityCategoryMatches(t, cat)).length;
      return acc;
    }, {});
  }, []);

  const visiblePills = OBSERVABILITY_CATEGORY_FILTERS.filter((cat) => cat === "All" || (catCounts[cat] || 0) > 0);

  return (
    <main>
      <section className="tool-page-layout">
        <ObsAccordionSidebar
          signal={signal} setSignal={setSignal}
          layer={layer} setLayer={setLayer}
          deployment={deployment} setDeployment={setDeployment}
        />
        <div className="tool-page-layout__content">
          <SearchInput value={search} onChange={setSearch} placeholder="Search logging, tracing, metrics, OpenTelemetry..." />

          <div className="category-pills-row">
            {visiblePills.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`category-pill ${category === cat ? "category-pill--active" : ""}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
                {cat !== "All" && <span className="category-pill-count">{catCounts[cat] || 0}</span>}
              </button>
            ))}
          </div>

          <div className="results-header">
            <h2 style={{ fontSize: 14, color: "var(--text-soft)", fontWeight: 400 }}>{filtered.length} tools</h2>
          </div>

          <div className="tool-grid">
            {filtered.map((item) => (
              <ToolCard key={item.slug} tool={obsToTool(item)} profileTo={`/observability/${item.slug}`} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function ObservabilityDetailPage() {
  const { slug } = useParams();
  const item = OBSERVABILITY_TOOLS.find((entry) => entry.slug === slug);

  const related = useMemo(() => {
    if (!item) return [];
    return OBSERVABILITY_TOOLS.filter((c) =>
      c.slug !== item.slug && c.signals.some((s) => item.signals.includes(s)),
    ).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 4);
  }, [item]);

  if (!item) return <Navigate to="/observability" replace />;

  const tool = obsToTool(item);
  const ALL_SIGNALS = ["Logs", "Traces", "Metrics", "Alerts"];
  const ALL_LAYERS = ["Collector", "Storage", "Alerting", "Visualization"];

  return (
    <main>
      <div className="profile-back-bar">
        <Link to="/observability" className="profile-back-link"><ArrowLeft size={14} aria-hidden="true" /> Observability</Link>
        <span className="profile-back-bar__crumb">{item.name}</span>
      </div>

      <section className="profile-layout">
        <article className="profile-content">
          <div className="profile-hero-placeholder">
            <ToolLogo tool={tool} size={56} />
            <div>
              <h1 className="profile-name">{item.name}</h1>
              <p className="profile-company">{getDomain(item.url)}</p>
            </div>
          </div>

          <div className="content-card profile-section">
            <p>{item.summary}</p>
          </div>

          <div className="content-card profile-section">
            <p className="profile-section-title">Telemetry signals</p>
            <div className="signal-chips">
              {ALL_SIGNALS.map((s) => (
                <span key={s} className={`signal-chip ${item.signals.includes(s) ? "signal-chip--active" : ""}`}>
                  {item.signals.includes(s) ? <Check size={12} aria-hidden="true" /> : <Minus size={12} aria-hidden="true" />} {s}
                </span>
              ))}
            </div>
          </div>

          <div className="content-card profile-section">
            <p className="profile-section-title">Architectural layers</p>
            <div className="signal-chips">
              {ALL_LAYERS.map((l) => (
                <span key={l} className={`signal-chip ${item.layers.includes(l) ? "signal-chip--active" : ""}`}>
                  {item.layers.includes(l) ? <Check size={12} aria-hidden="true" /> : <Minus size={12} aria-hidden="true" />} {l}
                </span>
              ))}
            </div>
          </div>

          {item.ecosystem.length > 0 && (
            <div className="content-card profile-section">
              <p className="profile-section-title">Ecosystem</p>
              <div className="chip-row" style={{ marginTop: 8 }}>
                {item.ecosystem.map((e) => <span key={e} className="chip-row__item">{e}</span>)}
              </div>
            </div>
          )}

          {item.useCases.length > 0 && (
            <div className="content-card profile-section">
              <p className="profile-section-title">Use cases</p>
              <div className="feature-list">
                {item.useCases.map((u) => <p key={u} className="feature-item"><Check size={13} aria-hidden="true" /> {u}</p>)}
              </div>
            </div>
          )}

          {related.length > 0 && (
            <div className="profile-section">
              <p className="profile-section-title" style={{ marginBottom: 12 }}>Similar tools</p>
              <div className="tool-grid">
                {related.map((entry) => (
                  <ToolCard key={entry.slug} tool={obsToTool(entry)} profileTo={`/observability/${entry.slug}`} />
                ))}
              </div>
            </div>
          )}
        </article>

        <aside className="profile-sidebar">
          <div className="content-card profile-sidebar-card">
            <div className="profile-sidebar-identity">
              <ToolLogo tool={tool} size={48} />
              <div>
                <p className="profile-sidebar-name">{item.name}</p>
                <p className="profile-sidebar-company">{item.type}</p>
              </div>
            </div>

            <a href={item.url} target="_blank" rel="noreferrer" className="button button--primary">
              Visit website <ExternalLink size={12} aria-hidden="true" />
            </a>

            <dl className="profile-facts">
              <dt>OSS Status</dt>
              <dd><span className={`chip ${item.ossStatus === "Open source" ? "chip--success" : ""}`}>{item.ossStatus}</span></dd>
              <dt>Type</dt>
              <dd>{item.type}</dd>
              {item.deployment && item.deployment.length > 0 && (
                <>
                  <dt>Deployment</dt>
                  <dd>{item.deployment.join(", ")}</dd>
                </>
              )}
            </dl>

            <div className="signal-chips">
              {item.signals.map((s) => (
                <span key={s} className="signal-chip signal-chip--active">{s}</span>
              ))}
            </div>

            {(item.links?.github || item.links?.docs) && (
              <div className="profile-links">
                {item.links?.github && <a href={item.links.github} target="_blank" rel="noreferrer">GitHub <ExternalLink size={11} aria-hidden="true" /></a>}
                {item.links?.docs && <a href={item.links.docs} target="_blank" rel="noreferrer">Docs <ExternalLink size={11} aria-hidden="true" /></a>}
              </div>
            )}
          </div>

          {related.length > 0 && (
            <div className="content-card" style={{ marginTop: 12 }}>
              <p className="eyebrow" style={{ marginBottom: 10 }}>Similar tools</p>
              <div className="sidebar-tools-list">
                {related.map((entry) => (
                  <Link key={entry.slug} to={`/observability/${entry.slug}`} className="sidebar-tool-link">
                    <ToolLogo tool={obsToTool(entry)} size={20} />
                    <span>{entry.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </section>
      <ProfileShareBar tool={tool} />
    </main>
  );
}

function FactMetric({ label, value }) {
  return <Fact label={label} value={value} />;
}

function ResourcesPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [type, setType] = useState("All");
  const [topic, setTopic] = useState("All");
  const [sourceType, setSourceType] = useState("All");

  const topicOptions = useMemo(() => {
    const topics = new Set(RESOURCE_FILTERS.topics);
    RESOURCES.forEach((entry) => entry.topics.forEach((t) => topics.add(t)));
    return ["All", ...Array.from(topics).sort((a, b) => a.localeCompare(b))];
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return RESOURCES.filter((item) => {
      if (!resourceCategoryMatches(item, category)) return false;
      if (type !== "All" && item.type !== type) return false;
      if (sourceType !== "All" && item.sourceType !== sourceType) return false;
      if (!arrayMatches(item.topics, topic)) return false;
      if (!query) return true;
      return [item.title, item.source, item.type, item.sourceType, item.summary, ...item.topics].join(" ").toLowerCase().includes(query);
    }).sort((a, b) => a.title.localeCompare(b.title));
  }, [category, search, sourceType, topic, type]);

  const catCounts = useMemo(() => {
    return RESOURCE_CATEGORY_FILTERS.reduce((acc, cat) => {
      acc[cat] = cat === "All" ? RESOURCES.length : RESOURCES.filter((r) => resourceCategoryMatches(r, cat)).length;
      return acc;
    }, {});
  }, []);

  const visiblePills = RESOURCE_CATEGORY_FILTERS.filter((cat) => cat === "All" || (catCounts[cat] || 0) > 0);

  return (
    <main>
      <section className="tool-page-layout">
        <ResourceAccordionSidebar
          type={type} setType={setType}
          topic={topic} setTopic={setTopic}
          sourceType={sourceType} setSourceType={setSourceType}
          topicOptions={topicOptions}
        />
        <div className="tool-page-layout__content">
          <SearchInput value={search} onChange={setSearch} placeholder="Search blogs, newsletters, reports, guides..." />

          <div className="category-pills-row">
            {visiblePills.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`category-pill ${category === cat ? "category-pill--active" : ""}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
                {cat !== "All" && <span className="category-pill-count">{catCounts[cat] || 0}</span>}
              </button>
            ))}
          </div>

          <div className="results-header">
            <h2 style={{ fontSize: 14, color: "var(--text-soft)", fontWeight: 400 }}>{filtered.length} resources</h2>
          </div>

          <div className="tool-grid tool-grid--resources">
            {filtered.map((item) => <ResourceCard key={item.slug} item={item} />)}
          </div>
        </div>
      </section>
    </main>
  );
}

function ResourceDetailPage() {
  const { slug } = useParams();
  const item = RESOURCES.find((entry) => entry.slug === slug);

  if (!item) return <Navigate to="/resources" replace />;

  const related = RESOURCES.filter((candidate) => candidate.slug !== item.slug && candidate.topics.some((topic) => item.topics.includes(topic))).slice(0, 6);

  return (
    <main>
      <section className="detail-hero">
        <div className="breadcrumbs">
          <Link to="/resources">Resources</Link>
          <span>/</span>
          <strong>{item.title}</strong>
        </div>
        <h1>{item.title}</h1>
        <p>{item.summary}</p>
      </section>

      <section className="fact-strip">
        <DetailMetric label="Source" value={item.source} />
        <DetailMetric label="Source type" value={item.sourceType} />
        <DetailMetric label="Frequency" value={item.frequency} />
      </section>

      <section className="profile-layout">
        <article className="content-card">
          <h2>Why this resource matters</h2>
          <p>{item.summary}</p>
          <div className="content-card__actions">
            <a href={item.url} target="_blank" rel="noreferrer">Open resource <ExternalLink size={12} aria-hidden="true" /></a>
            <Link to="/resources">Back to resources</Link>
          </div>
        </article>

        <aside className="profile-sidebar">
          <div className="content-card">
            <p className="eyebrow">Topics</p>
            <div className="chip-row">{item.topics.map((topic) => <span key={topic} className="chip-row__item">{topic}</span>)}</div>
          </div>
          <div className="content-card">
            <p className="eyebrow">Related resources</p>
            {related.map((candidate) => (
              <Link key={candidate.slug} to={`/resources/${candidate.slug}`} className="sidebar-tool-link">
                {candidate.title}
              </Link>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div>
        <strong>AI SRE Watchlist</strong>
        <p>A curated marketplace for AI-native reliability products.</p>
      </div>
      <div className="footer-links">
        <a href={GITHUB_URL} target="_blank" rel="noreferrer">Star on Github</a>
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

function AppLayout({ children }) {
  return (
    <div>
      <SiteHeader />
      {children}
      <Footer />
    </div>
  );
}

function LegacyCompanyAlias() {
  const { slug } = useParams();
  return <Navigate to={`/tools/${slug}`} replace />;
}

function LegacyRouteToolAlias() {
  const { slug } = useParams();
  return <Navigate to={`/tools/${slug}`} replace />;
}

export default function App() {
  return (
    <SiteProvider>
      <SearchShortcut />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<AppLayout><ToolDirectoryPage /></AppLayout>} />
        <Route path="/tools" element={<AppLayout><ToolDirectoryPage /></AppLayout>} />
        <Route path="/tools/:slug" element={<AppLayout><ToolProfilePage /></AppLayout>} />
        <Route path="/company/:slug" element={<LegacyCompanyAlias />} />
        <Route path="/tool/:slug" element={<LegacyRouteToolAlias />} />
        <Route path="/best/:slug" element={<AppLayout><BestToolsPage /></AppLayout>} />
        <Route path="/alternatives/:slug" element={<AppLayout><AlternativesPage /></AppLayout>} />
        <Route path="/account/saved" element={<AppLayout><SavedToolsPage /></AppLayout>} />
        <Route path="/observability" element={<AppLayout><ObservabilityPage /></AppLayout>} />
        <Route path="/observability/:slug" element={<AppLayout><ObservabilityDetailPage /></AppLayout>} />
        <Route path="/resources" element={<AppLayout><ResourcesPage /></AppLayout>} />
        <Route path="/resources/:slug" element={<Navigate to="/resources" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SiteProvider>
  );
}

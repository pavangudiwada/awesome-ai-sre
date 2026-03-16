import React, { useCallback, useEffect, useState } from "react";
import yaml from "js-yaml";
import { Navigate, Outlet, Route, Routes, useNavigate, useParams } from "react-router-dom";

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

const TAG_META = {
  "Incident Response": {
    color: "#ff4444",
    gradient: "linear-gradient(140deg, #180808 0%, #1e0d0d 60%, #120606 100%)",
  },
  Observability: {
    color: "#00d4ff",
    gradient: "linear-gradient(140deg, #060e1a 0%, #091525 60%, #050b14 100%)",
  },
  AIOps: {
    color: "#00ff88",
    gradient: "linear-gradient(140deg, #071508 0%, #0a1c0c 60%, #060f07 100%)",
  },
  IDP: {
    color: "#a78bfa",
    gradient: "linear-gradient(140deg, #12091d 0%, #1b1029 60%, #100718 100%)",
  },
  IaC: {
    color: "#34d399",
    gradient: "linear-gradient(140deg, #071511 0%, #0a1e18 60%, #06110d 100%)",
  },
  FinOps: {
    color: "#ffaa00",
    gradient: "linear-gradient(140deg, #161004 0%, #1d1508 60%, #100d03 100%)",
  },
  Security: {
    color: "#f97316",
    gradient: "linear-gradient(140deg, #1b0c05 0%, #251109 60%, #120904 100%)",
  },
  Deployment: {
    color: "#60a5fa",
    gradient: "linear-gradient(140deg, #07101c 0%, #0b1728 60%, #050b14 100%)",
  },
};

const DEPLOYMENT_LABELS = {
  saas: "SaaS",
  "on-prem": "On-Prem",
  hybrid: "Hybrid",
};

const YAML_FILES = import.meta.glob("../tools/operate/*.yaml", {
  eager: true,
  query: "?raw",
  import: "default",
});

const SOCIAL_ICON = {
  linkedin: new URL("../assets/icons/linkedin.svg", import.meta.url).href,
  github: new URL("../assets/icons/github.svg", import.meta.url).href,
  x: new URL("../assets/icons/x.svg", import.meta.url).href,
  producthunt: new URL("../assets/icons/producthunt.svg", import.meta.url).href,
};

function deploymentLabel(deployment) {
  const values = Array.isArray(deployment) ? deployment : deployment ? [deployment] : [];
  if (values.length === 0) return "Unknown";
  if (values.length > 1) return "Multi";
  return DEPLOYMENT_LABELS[String(values[0]).toLowerCase()] || String(values[0]);
}

function normalizeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return null;
}

function parseAddedDate(value) {
  const normalized = normalizeDate(value);
  if (!normalized) return null;

  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function daysSince(date, now = new Date()) {
  const utcNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const utcDate = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((utcNow - utcDate) / 86400000);
}

function isNewTool(tool, now = new Date()) {
  const parsed = parseAddedDate(tool.dateAdded);
  if (!parsed) return false;
  const age = daysSince(parsed, now);
  return age >= 0 && age <= 14;
}

function getRecentTools(tools) {
  const datedTools = [...tools]
    .filter((tool) => parseAddedDate(tool.dateAdded))
    .sort((a, b) => b.dateAdded.localeCompare(a.dateAdded) || a.name.localeCompare(b.name));

  const withinDays = (dayLimit) =>
    datedTools.filter((tool) => {
      const parsed = parseAddedDate(tool.dateAdded);
      if (!parsed) return false;
      const age = daysSince(parsed);
      return age >= 0 && age <= dayLimit;
    });

  const lastWeek = withinDays(7);
  const expanded = lastWeek.length >= 1 && lastWeek.length <= 2 ? withinDays(14) : lastWeek;

  return {
    tools: expanded.slice(0, 5),
    rangeDays: lastWeek.length >= 1 && lastWeek.length <= 2 ? 14 : 7,
  };
}

function buildToolsData() {
  const tools = [];

  for (const [filePath, raw] of Object.entries(YAML_FILES)) {
    const slugMatch = filePath.match(/\/([^/]+)\.yaml$/);
    const fallbackSlug = slugMatch ? slugMatch[1] : null;

    if (!fallbackSlug || fallbackSlug.startsWith("_")) {
      continue;
    }

    let parsed;
    try {
      parsed = yaml.load(raw);
    } catch {
      continue;
    }

    if (!parsed || typeof parsed !== "object" || !parsed.name || !parsed.url || !parsed.summary) {
      continue;
    }

    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.map((tag) => String(tag).trim()).filter((tag) => TAG_META[tag])
      : [];
    const primaryTag = tags[0] || "AIOps";

    tools.push({
      name: parsed.name,
      slug: parsed.slug || fallbackSlug,
      url: parsed.url,
      summary: parsed.summary,
      deployment: deploymentLabel(parsed.deployment),
      opensource: !!parsed.opensource,
      tags,
      primaryTag,
      screenshot: typeof parsed.screenshot === "string" ? parsed.screenshot : "",
      claimed: !!parsed.claimed,
      dateAdded: normalizeDate(parsed.dateAdded),
      features: Array.isArray(parsed.features) ? parsed.features.slice(0, 3) : [],
      linkedin: parsed.linkedin,
      github: parsed.github,
      x: parsed.x,
      producthunt: parsed.producthunt,
    });
  }

  tools.sort((a, b) => a.name.localeCompare(b.name));
  return tools;
}

const ALL_TOOLS = buildToolsData();
const TOOLS_BY_SLUG = new Map(ALL_TOOLS.map((tool) => [tool.slug, tool]));
const RECENT_TOOLS_META = getRecentTools(ALL_TOOLS);
const RECENT_TOOLS = RECENT_TOOLS_META.tools;
const NEW_TOOL_SLUGS = new Set(ALL_TOOLS.filter((tool) => isNewTool(tool)).map((tool) => tool.slug));
const TAG_COUNTS = TAG_ORDER.reduce((counts, tag) => {
  counts[tag] = ALL_TOOLS.filter((tool) => tool.tags.includes(tag)).length;
  return counts;
}, {});
const TOTAL = ALL_TOOLS.length;

function getDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function favicon(url) {
  return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(url)}`;
}

function ToolLogo({ tool, size = 28 }) {
  const color = TAG_META[tool.primaryTag]?.color || "#00ff88";
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [tool.url]);

  if (failed) {
    return (
      <span
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: "4px",
          background: color,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: `${Math.max(12, size / 2)}px`,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {tool.name.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={favicon(tool.url)}
      alt=""
      onError={() => setFailed(true)}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "4px",
        objectFit: "cover",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        flexShrink: 0,
      }}
    />
  );
}

function ScreenshotSurface({ tool, height = 180, compact = false }) {
  const [showScreenshot, setShowScreenshot] = useState(Boolean(tool.screenshot));
  const color = TAG_META[tool.primaryTag]?.color || "#00ff88";
  const gradient = TAG_META[tool.primaryTag]?.gradient || TAG_META.AIOps.gradient;

  useEffect(() => {
    setShowScreenshot(Boolean(tool.screenshot));
  }, [tool.screenshot]);

  if (showScreenshot) {
    return (
      <img
        src={tool.screenshot}
        alt={`${tool.name} screenshot`}
        onError={() => setShowScreenshot(false)}
        style={{
          width: "100%",
          height: `${height}px`,
          objectFit: "cover",
          objectPosition: "15% top",
          display: "block",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: `${height}px`,
        background: gradient,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(${color}12 1px, transparent 1px), linear-gradient(90deg, ${color}12 1px, transparent 1px)`,
          backgroundSize: "22px 22px",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: compact ? "8px" : "12px",
          textAlign: "center",
        }}
      >
        <span
          style={{
            color: "rgba(232,232,232,0.7)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: compact ? "9px" : "10px",
            letterSpacing: "1px",
          }}
        >
          {getDomain(tool.url)}
        </span>
      </div>
    </div>
  );
}

function TagFilterRow({ tag, count, checked, onToggle }) {
  const meta = TAG_META[tag];
  return (
    <button
      className="pressable pressable--chip"
      type="button"
      onClick={onToggle}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        padding: "10px 12px",
        background: checked ? `${meta.color}12` : "transparent",
        border: "1px solid rgba(255,255,255,0.06)",
        borderLeft: checked ? `2px solid ${meta.color}` : "2px solid transparent",
        color: checked ? meta.color : "var(--text-secondary)",
        cursor: "pointer",
        borderRadius: "8px",
        textAlign: "left",
      }}
    >
      <span style={{ fontSize: "12px", lineHeight: 1.4 }}>{tag}</span>
      <span style={{ color: checked ? meta.color : "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }}>
        ({count})
      </span>
    </button>
  );
}

function ToggleRow({ enabled, onToggle, label }) {
  return (
    <button
      className="pressable pressable--chip"
      type="button"
      onClick={onToggle}
      style={{
        width: "100%",
        padding: 0,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>{label}</span>
      <span
        style={{
          width: "42px",
          height: "24px",
          borderRadius: "999px",
          background: enabled ? "rgba(0,255,136,0.18)" : "rgba(255,255,255,0.08)",
          border: enabled ? "1px solid rgba(0,255,136,0.35)" : "1px solid rgba(255,255,255,0.1)",
          position: "relative",
          transition: "all 0.16s ease",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "2px",
            left: enabled ? "20px" : "2px",
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            background: enabled ? "#00ff88" : "rgba(255,255,255,0.55)",
            transition: "left 0.16s ease",
          }}
        />
      </span>
    </button>
  );
}

function FilterRail({ selectedTags, onToggleTag, onClearTags, tagCounts, ossOnly, onToggleOss, mobile, onClose }) {
  return (
    <aside
      data-filter-rail="true"
      style={{
        position: mobile ? "fixed" : "sticky",
        left: mobile ? 0 : "auto",
        top: mobile ? 0 : "16px",
        bottom: mobile ? 0 : "auto",
        width: mobile ? "220px" : "200px",
        padding: mobile ? "24px 18px" : "20px 16px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRight: mobile ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(18px)",
        zIndex: 80,
        overflowY: "auto",
        minHeight: mobile ? "100vh" : "calc(100vh - 32px)",
        borderRadius: mobile ? 0 : "10px",
        boxShadow: mobile ? "none" : "0 20px 50px rgba(0,0,0,0.35)",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
        <div style={{ color: "#00ff88", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", letterSpacing: "2px" }}>
          FILTER BY TAG
        </div>
        {mobile && (
          <button
            className="pressable"
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <button
          className="pressable pressable--chip"
          type="button"
          onClick={onClearTags}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            padding: "10px 12px",
            background: selectedTags.length === 0 ? "rgba(255,255,255,0.05)" : "transparent",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "8px",
            color: selectedTags.length === 0 ? "var(--text-primary)" : "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: "12px" }}>All</span>
          <span style={{ color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }}>
            ({TOTAL})
          </span>
        </button>

        <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "4px 0" }} />

        {TAG_ORDER.map((tag) => (
          <TagFilterRow
            key={tag}
            tag={tag}
            count={tagCounts[tag] || 0}
            checked={selectedTags.includes(tag)}
            onToggle={() => onToggleTag(tag)}
          />
        ))}
      </div>

      <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "18px 0 16px" }} />
      <ToggleRow enabled={ossOnly} onToggle={onToggleOss} label="OSS only" />
    </aside>
  );
}

function TopBannerCarousel({ items, activeIndex, onSelectIndex, onSelectTool }) {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(135deg, rgba(0,255,136,0.08) 0%, rgba(0,212,255,0.07) 100%)",
        border: "1px solid rgba(0,255,136,0.18)",
        boxShadow: "0 18px 40px rgba(0,0,0,0.24)",
        borderRadius: "12px",
        marginTop: "14px",
        marginBottom: "14px",
      }}
    >
      <div
        style={{
          display: "flex",
          width: `${items.length * 100}%`,
          transform: `translateX(-${activeIndex * (100 / items.length)}%)`,
          transition: "transform 0.45s ease",
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              width: `${100 / items.length}%`,
              flexShrink: 0,
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxWidth: "760px" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ color: "#00ff88", fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", letterSpacing: "2px" }}>
                  {item.eyebrow}
                </span>
                {item.meta && (
                  <span style={{ color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: "8px", letterSpacing: "1px" }}>
                    {item.meta}
                  </span>
                )}
              </div>
              <p style={{ margin: 0, color: "var(--text-primary)", fontSize: "13px", lineHeight: 1.45 }}>
                {item.message}
              </p>
              {item.type === "recent" && item.tools.length > 0 && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {item.tools.map((tool) => (
                    <div key={tool.slug} style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "999px",
                          background: "rgba(0,255,136,0.14)",
                          color: "#00ff88",
                          border: "1px solid rgba(0,255,136,0.25)",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "8px",
                          letterSpacing: "0.8px",
                        }}
                      >
                        NEW
                      </span>
                      <button
                        className="pressable pressable--chip"
                        type="button"
                        onClick={() => onSelectTool(tool)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--text-primary)",
                          padding: 0,
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        {tool.name}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <a
              className="pressable"
              href={item.cta.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "#00ff88",
                color: "#0a0a0a",
                padding: "8px 12px",
                borderRadius: "6px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "9px",
                fontWeight: 700,
                textDecoration: "none",
                letterSpacing: "1px",
                whiteSpace: "nowrap",
              }}
            >
              {item.cta.label}
            </a>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "0 14px 10px" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Show banner ${index + 1}`}
              onClick={() => onSelectIndex(index)}
              style={{
                width: index === activeIndex ? "20px" : "8px",
                height: "8px",
                borderRadius: "999px",
                border: "none",
                padding: 0,
                cursor: "pointer",
                background: index === activeIndex ? "#00ff88" : "rgba(255,255,255,0.2)",
                transition: "all 0.2s ease",
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="pressable pressable--chip"
            type="button"
            onClick={() => onSelectIndex((activeIndex - 1 + items.length) % items.length)}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.14)",
              color: "var(--text-primary)",
              width: "28px",
              height: "28px",
              borderRadius: "999px",
              cursor: "pointer",
            }}
          >
            ←
          </button>
          <button
            className="pressable pressable--chip"
            type="button"
            onClick={() => onSelectIndex((activeIndex + 1) % items.length)}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.14)",
              color: "var(--text-primary)",
              width: "28px",
              height: "28px",
              borderRadius: "999px",
              cursor: "pointer",
            }}
          >
            →
          </button>
        </div>
      </div>
    </section>
  );
}

function buildTopBannerItems(tools, rangeDays) {
  const items = [
    {
      id: "kubecon-eu",
      type: "cta",
      eyebrow: "KUBECON EU",
      meta: null,
      message: "Attending KubeCon EU? If you are an AI SRE practitioner or vendor, let’s connect.",
      cta: {
        href: "https://www.linkedin.com/in/pavangudiwada/",
        label: "CONNECT WITH PAVAN",
      },
    },
  ];

  if (tools.length > 0) {
    items.push({
      id: "recent-additions",
      type: "recent",
      eyebrow: "RECENT ADDITIONS",
      meta: `LAST ${rangeDays} DAYS`,
      message: "New tools added to the watchlist recently.",
      tools,
      cta: {
        href: "https://www.linkedin.com/company/ai-sre-watchlist",
        label: "FOLLOW THE WATCHLIST",
      },
    });
  }

  return items;
}

function ScreenshotCard({ tool, isSelected, onClick, isNew }) {
  const color = TAG_META[tool.primaryTag]?.color || "#00ff88";

  return (
    <div
      data-tool-card="true"
      onClick={() => onClick(tool)}
      style={{
        borderRadius: "10px",
        overflow: "hidden",
        cursor: "pointer",
        background: isSelected ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${isSelected ? `${color}66` : "rgba(255,255,255,0.07)"}`,
        transition: "all 0.18s ease",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(event) => {
        if (isSelected) return;
        event.currentTarget.style.background = "rgba(255,255,255,0.04)";
        event.currentTarget.style.borderColor = `${color}66`;
        event.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(event) => {
        if (isSelected) return;
        event.currentTarget.style.background = "rgba(255,255,255,0.02)";
        event.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
        event.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ position: "relative" }}>
        <ScreenshotSurface tool={tool} height={180} />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "48px",
            background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.42) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            padding: "8px 10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
            <ToolLogo tool={tool} size={28} />
            <span
              style={{
                padding: "2px 8px",
                borderRadius: "999px",
                background: `${color}16`,
                border: `1px solid ${color}40`,
                color,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "8px",
                letterSpacing: "0.8px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {tool.primaryTag}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            {tool.claimed && (
              <span
                style={{
                  background: "rgba(0,180,255,0.15)",
                  color: "#00b4ff",
                  border: "1px solid rgba(0,180,255,0.3)",
                  borderRadius: "999px",
                  padding: "2px 6px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "8px",
                }}
              >
                Verified
              </span>
            )}
            {isNew && (
              <span
                style={{
                  background: "rgba(0,255,136,0.14)",
                  color: "#00ff88",
                  border: "1px solid rgba(0,255,136,0.25)",
                  borderRadius: "999px",
                  padding: "2px 6px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "8px",
                }}
              >
                NEW
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
          <span
            style={{
              color: "var(--text-primary)",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "13px",
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {tool.name}
          </span>
          {tool.opensource && (
            <span
              style={{
                padding: "2px 6px",
                borderRadius: "999px",
                background: "rgba(0,255,136,0.12)",
                border: "1px solid rgba(0,255,136,0.25)",
                color: "#00ff88",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "8px",
                flexShrink: 0,
              }}
            >
              OSS
            </span>
          )}
        </div>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "12px",
            lineHeight: 1.5,
            margin: 0,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {tool.summary}
        </p>
      </div>
    </div>
  );
}

function Panel({ tool, onClose, mobile }) {
  const color = TAG_META[tool.primaryTag]?.color || "#00ff88";
  const gradient = TAG_META[tool.primaryTag]?.gradient || TAG_META.AIOps.gradient;

  return (
    <div
      data-side-panel="true"
      style={{
        position: "fixed",
        right: 0,
        top: 0,
        bottom: 0,
        width: mobile ? "min(100vw, 360px)" : "360px",
        background: "#0d0d0d",
        borderLeft: "1px solid rgba(255,255,255,0.07)",
        zIndex: 90,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        boxShadow: "-20px 0 60px rgba(0,0,0,0.45)",
      }}
    >
      <style>{`@keyframes panelIn{from{transform:translateX(30px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      <div style={{ animation: "panelIn 0.18s ease" }}>
        <div
          style={{
            position: "relative",
            width: "100%",
            background: gradient,
            overflow: "hidden",
          }}
        >
          <ScreenshotSurface tool={tool} height={220} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 100%)",
              pointerEvents: "none",
            }}
          />
          <button
            className="pressable pressable--chip"
            type="button"
            onClick={onClose}
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.4)",
              color: "var(--text-primary)",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: "20px 18px 28px", display: "flex", flexDirection: "column", gap: "18px" }}>
          <div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginBottom: "10px" }}>
              {tool.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: "3px 7px",
                    borderRadius: "999px",
                    background: `${TAG_META[tag]?.color || color}14`,
                    border: `1px solid ${(TAG_META[tag]?.color || color)}33`,
                    color: TAG_META[tag]?.color || color,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "0.8px",
                  }}
                >
                  {tag}
                </span>
              ))}
              <span
                style={{
                  padding: "3px 7px",
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--text-secondary)",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "9px",
                }}
              >
                {tool.deployment}
              </span>
              {tool.opensource && (
                <span
                  style={{
                    padding: "3px 7px",
                    borderRadius: "999px",
                    background: "rgba(0,255,136,0.12)",
                    border: "1px solid rgba(0,255,136,0.25)",
                    color: "#00ff88",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "9px",
                  }}
                >
                  OPEN SOURCE
                </span>
              )}
              {tool.claimed && (
                <span
                  style={{
                    padding: "3px 7px",
                    borderRadius: "999px",
                    background: "rgba(0,180,255,0.15)",
                    border: "1px solid rgba(0,180,255,0.3)",
                    color: "#00b4ff",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "9px",
                  }}
                >
                  VERIFIED
                </span>
              )}
            </div>
            <h2 style={{ margin: "0 0 10px", fontFamily: "'JetBrains Mono', monospace", fontSize: "24px", lineHeight: 1.15 }}>
              {tool.name}
            </h2>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "13px", lineHeight: 1.7 }}>{tool.summary}</p>
          </div>

          {tool.features.length > 0 && (
            <div>
              <div style={{ color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", letterSpacing: "2px", marginBottom: "10px" }}>
                CAPABILITIES
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {tool.features.map((feature) => (
                  <div
                    key={feature}
                    style={{
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      color: "var(--text-secondary)",
                      fontSize: "12px",
                      lineHeight: 1.6,
                    }}
                  >
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{ color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", letterSpacing: "2px", marginBottom: "10px" }}>
              LINKS
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <a
                className="pressable pressable--strong"
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: "1 1 100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  background: `${color}12`,
                  border: `1px solid ${color}30`,
                  color,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  textAlign: "center",
                }}
              >
                VISIT WEBSITE
              </a>
              {["linkedin", "github", "x", "producthunt"].map((key) =>
                tool[key] ? (
                  <a
                    key={key}
                    className="pressable pressable--chip"
                    href={tool[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: "6px",
                      textDecoration: "none",
                      background: "rgba(255,255,255,0.09)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      color: "var(--text-secondary)",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "9px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <img src={SOCIAL_ICON[key]} alt="" style={{ width: "12px", height: "12px", opacity: 0.95 }} />
                    {key === "producthunt" ? "Product Hunt" : key === "x" ? "X" : key.charAt(0).toUpperCase() + key.slice(1)}
                  </a>
                ) : null
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShareBar() {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "https://aisrewatchlist.vercel.app";

  const copy = async () => {
    let success = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        success = true;
      }
    } catch {}

    if (!success) {
      try {
        const area = document.createElement("textarea");
        area.value = url;
        area.setAttribute("readonly", "");
        area.style.position = "absolute";
        area.style.left = "-9999px";
        document.body.appendChild(area);
        area.select();
        success = document.execCommand("copy");
        document.body.removeChild(area);
      } catch {}
    }

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const buttons = [
    { icon: "in", label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
    { icon: "𝕏", label: "X", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent("The AI SRE Watchlist: tracking what's shipping across AI SRE vendors")}` },
    { icon: copied ? "✓" : "⎘", label: "Copy", onClick: copy, active: copied },
  ];

  return (
    <div style={{ position: "fixed", right: "16px", top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: "6px", zIndex: 40 }}>
      {buttons.map((button) =>
        button.href ? (
          <a
            className="pressable pressable--chip"
            key={button.label}
            href={button.href}
            target="_blank"
            rel="noopener noreferrer"
            title={button.label}
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "6px",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.07)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              fontSize: "11px",
              fontWeight: 700,
              textDecoration: "none",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {button.icon}
          </a>
        ) : (
          <button
            className={`pressable pressable--chip${button.active ? " pressable--active" : ""}`}
            key={button.label}
            onClick={button.onClick}
            title={button.label}
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "6px",
              background: button.active ? "rgba(0,255,136,0.1)" : "rgba(255,255,255,0.08)",
              border: button.active ? "1px solid rgba(0,255,136,0.4)" : "1px solid rgba(255,255,255,0.07)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: button.active ? "#00ff88" : "var(--text-muted)",
              fontSize: "11px",
              cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {button.icon}
          </button>
        )
      )}
    </div>
  );
}

function AppFrame() {
  const navigate = useNavigate();
  const { slug: routeSlug } = useParams();
  const activeTool = routeSlug ? TOOLS_BY_SLUG.get(routeSlug) || null : null;
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [ossOnly, setOssOnly] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 768 : false));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const bannerItems = buildTopBannerItems(RECENT_TOOLS, RECENT_TOOLS_META.rangeDays);
  const selectedTool = activeTool || null;

  const closeSelectedTool = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handleSelectTool = useCallback(
    (tool) => {
      navigate(routeSlug === tool.slug ? "/" : `/tool/${tool.slug}`);
    },
    [navigate, routeSlug]
  );

  const toggleTag = useCallback((tag) => {
    if (routeSlug) navigate("/");
    setSelectedTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
  }, [navigate, routeSlug]);

  const clearTags = useCallback(() => {
    if (routeSlug) navigate("/");
    setSelectedTags([]);
  }, [navigate, routeSlug]);

  const toggleOss = useCallback(() => {
    if (routeSlug) navigate("/");
    setOssOnly((current) => !current);
  }, [navigate, routeSlug]);

  const clearAllFilters = useCallback(() => {
    if (routeSlug) navigate("/");
    setSelectedTags([]);
    setOssOnly(false);
  }, [navigate, routeSlug]);

  useEffect(() => {
    if (routeSlug && !activeTool) {
      navigate("/", { replace: true });
    }
  }, [activeTool, navigate, routeSlug]);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setFiltersOpen(false);
    };

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!selectedTool && !filtersOpen) return undefined;

    const onPointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (selectedTool && (target.closest('[data-side-panel="true"]') || target.closest('[data-tool-card="true"]'))) return;
      if (filtersOpen && target.closest('[data-filter-rail="true"]')) return;
      if (selectedTool) closeSelectedTool();
      if (filtersOpen) setFiltersOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [closeSelectedTool, selectedTool, filtersOpen]);

  useEffect(() => {
    if (activeBannerIndex < bannerItems.length) {
      return;
    }
    setActiveBannerIndex(0);
  }, [activeBannerIndex, bannerItems.length]);

  useEffect(() => {
    if (bannerItems.length <= 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveBannerIndex((current) => (current + 1) % bannerItems.length);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [bannerItems.length]);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredTools = ALL_TOOLS.filter((tool) => {
    if (selectedTags.length > 0 && !tool.tags.some((tag) => selectedTags.includes(tag))) {
      return false;
    }
    if (ossOnly && !tool.opensource) {
      return false;
    }
    if (!normalizedSearch) {
      return true;
    }
    return tool.name.toLowerCase().includes(normalizedSearch) || tool.summary.toLowerCase().includes(normalizedSearch);
  });

  const activeFilterChips = [
    ...selectedTags.map((tag) => ({
      key: tag,
      label: tag,
      color: TAG_META[tag]?.color || "#00ff88",
      onRemove: () => toggleTag(tag),
    })),
    ...(ossOnly
      ? [{
        key: "oss-only",
        label: "OSS only",
        color: "#00ff88",
        onRemove: toggleOss,
      }]
      : []),
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "var(--text-primary)", fontFamily: "'Inter', sans-serif" }}>
      <Outlet />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');
        :root{--text-primary:#E6EDF3;--text-secondary:#9DA7B3;--text-muted:#6B7280}
        *{box-sizing:border-box}
        body{margin:0;color:var(--text-primary);background:#0a0a0a}
        button,input{font:inherit}
        a,button{outline:none}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-track{background:#0a0a0a}
        ::-webkit-scrollbar-thumb{background:#222;border-radius:2px}
        .blink{animation:blink 1.2s step-end infinite}
        @keyframes blink{0%,100%{color:var(--text-primary)}50%{color:transparent}}
        input:focus{outline:none}
        input::placeholder{color:var(--text-muted)}
        .pressable{transition:transform .16s ease,box-shadow .16s ease,filter .16s ease,border-color .16s ease,background-color .16s ease,color .16s ease;will-change:transform}
        .pressable:hover{transform:translateY(-1px);filter:brightness(1.05)}
        .pressable:active,.pressable--active{transform:translateY(1px) scale(.985);filter:brightness(.98)}
        .pressable:focus-visible{box-shadow:0 0 0 2px rgba(10,10,10,.9),0 0 0 4px rgba(0,255,136,.32)}
      `}</style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage: "linear-gradient(rgba(0,255,136,0.028) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,136,0.028) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {isMobile && filtersOpen && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(0,0,0,0.58)" }} />
          <FilterRail
            selectedTags={selectedTags}
            onToggleTag={toggleTag}
            onClearTags={clearTags}
            tagCounts={TAG_COUNTS}
            ossOnly={ossOnly}
            onToggleOss={toggleOss}
            mobile
            onClose={() => setFiltersOpen(false)}
          />
        </>
      )}

      <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: isMobile ? "0 16px" : "0 28px" }}>
          <TopBannerCarousel
            items={bannerItems}
            activeIndex={activeBannerIndex}
            onSelectIndex={setActiveBannerIndex}
            onSelectTool={handleSelectTool}
          />

          <header style={{ paddingTop: "22px", paddingBottom: "24px" }}>
            <div style={{ marginBottom: "8px" }}>
              <span style={{ color: "#00ff88", fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", letterSpacing: "4px" }}>
                AI SRE /// WATCHLIST
              </span>
            </div>
            <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "clamp(24px, 4vw, 42px)", fontWeight: 700, margin: "0 0 12px", lineHeight: 1.1, letterSpacing: "-0.5px" }}>
              Tracking what&apos;s <span style={{ color: "#00ff88" }}>shipping</span><br />in AI SRE<span className="blink" style={{ color: "#00ff88" }}>_</span>
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", maxWidth: "520px", lineHeight: 1.6, margin: "0 0 18px" }}>
              {TOTAL}+ vendors building the future of autonomous reliability engineering, from incident response to observability, platform engineering, and deployment workflows.
            </p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <a className="pressable" href="https://www.linkedin.com/company/ai-sre-watchlist" target="_blank" rel="noopener noreferrer" style={{ background: "#00ff88", color: "#0a0a0a", padding: "8px 16px", borderRadius: "4px", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", fontWeight: 700, textDecoration: "none", letterSpacing: "1px" }}>→ FOLLOW ON LINKEDIN</a>
              <a className="pressable" href="https://github.com/pavangudiwada/awesome-ai-sre" target="_blank" rel="noopener noreferrer" style={{ background: "transparent", color: "#00ff88", padding: "8px 16px", borderRadius: "4px", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", fontWeight: 700, textDecoration: "none", letterSpacing: "1px", border: "1px solid rgba(0,255,136,0.3)" }}>★ STAR ON GITHUB</a>
            </div>
          </header>

          <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
            {!isMobile && (
              <FilterRail
                selectedTags={selectedTags}
                onToggleTag={toggleTag}
                onClearTags={clearTags}
                tagCounts={TAG_COUNTS}
                ossOnly={ossOnly}
                onToggleOss={toggleOss}
                mobile={false}
              />
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap", alignItems: "stretch" }}>
                <div style={{ position: "relative", flex: 1, minWidth: isMobile ? "100%" : "320px" }}>
                  <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }}>{">"}</span>
                  <input
                    type="text"
                    placeholder="search tools..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    style={{
                      width: "100%",
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: "4px",
                      padding: "10px 10px 10px 24px",
                      color: "var(--text-primary)",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "11px",
                    }}
                  />
                </div>
                {isMobile && (
                  <button
                    className="pressable"
                    type="button"
                    onClick={() => setFiltersOpen(true)}
                    style={{
                      padding: "0 12px",
                      minHeight: "38px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "10px",
                      color: "#00ff88",
                      border: "1px solid rgba(0,255,136,0.25)",
                      background: "rgba(0,255,136,0.07)",
                    }}
                  >
                    FILTERS
                  </button>
                )}
              </div>

              <div style={{ marginBottom: "18px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px" }}>
                  {filteredTools.length} tools{search && ` matching "${search}"`}
                </span>
                {selectedTags.length > 0 && (
                  <span style={{ color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px" }}>
                    {selectedTags.length} tag filter{selectedTags.length > 1 ? "s" : ""} active
                  </span>
                )}
                {ossOnly && (
                  <span style={{ color: "#00ff88", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px" }}>
                    OSS only
                  </span>
                )}
              </div>

              {filteredTools.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))",
                    gap: "14px",
                    marginBottom: "40px",
                  }}
                >
                  {filteredTools.map((tool) => (
                    <ScreenshotCard
                      key={tool.slug}
                      tool={tool}
                      isSelected={selectedTool?.slug === tool.slug}
                      onClick={handleSelectTool}
                      isNew={NEW_TOOL_SLUGS.has(tool.slug)}
                    />
                  ))}
                </div>
              ) : (
                <div style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", borderRadius: "10px", padding: "18px 16px", marginBottom: "40px" }}>
                  <div style={{ color: "var(--text-primary)", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", marginBottom: "6px" }}>
                    NO MATCHES
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "12px", lineHeight: 1.6 }}>
                    Try clearing search terms or removing one of the active filters.
                  </div>
                  {activeFilterChips.length > 0 && (
                    <div style={{ marginTop: "14px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                      {activeFilterChips.map((filter) => (
                        <button
                          key={filter.key}
                          className="pressable"
                          type="button"
                          onClick={filter.onRemove}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            borderRadius: "999px",
                            border: `1px solid ${filter.color}40`,
                            background: `${filter.color}14`,
                            color: filter.color,
                            padding: "6px 10px",
                            cursor: "pointer",
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "10px",
                          }}
                        >
                          {filter.label}
                          <span style={{ color: "var(--text-primary)" }}>×</span>
                        </button>
                      ))}
                      <button
                        className="pressable"
                        type="button"
                        onClick={clearAllFilters}
                        style={{
                          borderRadius: "999px",
                          border: "1px solid rgba(255,255,255,0.16)",
                          background: "transparent",
                          color: "var(--text-primary)",
                          padding: "6px 10px",
                          cursor: "pointer",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "10px",
                        }}
                      >
                        Clear all filters
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <section style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "52px 0" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "14px" }}>
                <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#00ff88", boxShadow: "0 0 5px #00ff88" }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", letterSpacing: "3px", color: "#00ff88" }}>ABOUT THE WATCHLIST</span>
              </div>
              <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 10px" }}>
                The AI SRE Watchlist
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "12px", lineHeight: 1.7, margin: "0 0 10px" }}>
                The AI SRE space is moving fast. New tools launch weekly. Existing vendors ship agentic features quietly. It&apos;s hard to keep up unless someone is watching.
              </p>
              <p style={{ color: "var(--text-secondary)", fontSize: "12px", lineHeight: 1.7, margin: "0 0 18px" }}>
                {TOTAL} vendors tracked across incident response, observability, platform engineering, infrastructure automation, security, and deployment.
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <a className="pressable" href="https://www.linkedin.com/company/ai-sre-watchlist" target="_blank" rel="noopener noreferrer" style={{ background: "#00ff88", color: "#0a0a0a", padding: "8px 16px", borderRadius: "4px", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", fontWeight: 700, textDecoration: "none", letterSpacing: "1px" }}>→ FOLLOW ON LINKEDIN</a>
                <a className="pressable" href="https://github.com/pavangudiwada/awesome-ai-sre" target="_blank" rel="noopener noreferrer" style={{ background: "transparent", color: "#00ff88", padding: "8px 16px", borderRadius: "4px", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", fontWeight: 700, textDecoration: "none", letterSpacing: "1px", border: "1px solid rgba(0,255,136,0.3)" }}>★ STAR ON GITHUB</a>
              </div>
            </div>
          </section>

          <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "24px 0 44px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "var(--text-primary)", marginBottom: "2px", fontWeight: 600 }}>The AI SRE Watchlist</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: "var(--text-muted)" }}>
                by <a href="https://www.linkedin.com/in/pavangudiwada/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Pavan Gudiwada</a>
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {[{ label: "GitHub", href: "https://github.com/pavangudiwada/awesome-ai-sre" }, { label: "LinkedIn", href: "https://www.linkedin.com/company/ai-sre-watchlist" }, { label: "pavangudiwada.dev", href: "https://pavangudiwada.dev" }].map((item) => (
                <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", textDecoration: "none" }}>
                  {item.label}
                </a>
              ))}
            </div>
          </footer>
        </div>
      </div>

      {selectedTool && <Panel tool={selectedTool} onClose={closeSelectedTool} mobile={isMobile} />}
      {!selectedTool && !isMobile && <ShareBar />}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppFrame />}>
        <Route index element={null} />
        <Route path="tool/:slug" element={null} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

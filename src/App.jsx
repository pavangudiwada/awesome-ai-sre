import React, { useCallback, useEffect, useState } from "react";
import yaml from "js-yaml";
import { Navigate, Outlet, Route, Routes, useNavigate, useParams } from "react-router-dom";

const TAG_TO_CATEGORY = {
  "incident-response": "Incident Response",
  observability: "Observability",
  infrastructure: "Infrastructure",
  "cost-optimization": "Cost Optimization",
  automation: "Infrastructure",
  security: "Incident Response",
};

const CATEGORY_ORDER = [
  "Incident Response",
  "Observability",
  "Infrastructure",
  "Cost Optimization",
];

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

const CAT = {
  "Incident Response": { color: "#ff4444", label: "IR" },
  Observability: { color: "#00d4ff", label: "OBS" },
  Infrastructure: { color: "#00ff88", label: "INFRA" },
  "Cost Optimization": { color: "#ffaa00", label: "COST" },
};

const CARD_BG = {
  "Incident Response": "linear-gradient(140deg, #180808 0%, #1e0d0d 60%, #120606 100%)",
  Observability: "linear-gradient(140deg, #060e1a 0%, #091525 60%, #050b14 100%)",
  Infrastructure: "linear-gradient(140deg, #071508 0%, #0a1c0c 60%, #060f07 100%)",
  "Cost Optimization": "linear-gradient(140deg, #161004 0%, #1d1508 60%, #100d03 100%)",
};

const SOCIAL_ICON = {
  linkedin: new URL("../assets/icons/linkedin.svg", import.meta.url).href,
  github: new URL("../assets/icons/github.svg", import.meta.url).href,
  x: new URL("../assets/icons/x.svg", import.meta.url).href,
};

function deploymentLabel(deployment) {
  if (!Array.isArray(deployment) || deployment.length === 0) {
    return "Unknown";
  }
  if (deployment.length > 1) {
    return "Multi";
  }
  return DEPLOYMENT_LABELS[String(deployment[0]).toLowerCase()] || String(deployment[0]);
}

function slugifyToolName(name) {
  return String(name).trim().toLowerCase().replace(/\s+/g, "-");
}

function categoryFromTags(tags) {
  const primary = Array.isArray(tags) && tags.length ? String(tags[0]).toLowerCase() : "";
  return TAG_TO_CATEGORY[primary] || "Infrastructure";
}

function normalizeAddedAt(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return null;
}

function parseAddedDate(value) {
  const normalized = normalizeAddedAt(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function daysSince(date, now = new Date()) {
  const utcNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const utcDate = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((utcNow - utcDate) / 86400000);
}

function getRecentTools(tools, now = new Date()) {
  const datedTools = tools
    .filter((tool) => parseAddedDate(tool.dateAdded))
    .sort((a, b) => b.dateAdded.localeCompare(a.dateAdded) || a.name.localeCompare(b.name));

  const withinDays = (dayLimit) =>
    datedTools.filter((tool) => {
      const parsed = parseAddedDate(tool.dateAdded);
      if (!parsed) return false;
      const age = daysSince(parsed, now);
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
  const grouped = {
    "Incident Response": [],
    Observability: [],
    Infrastructure: [],
    "Cost Optimization": [],
  };

  for (const [filePath, raw] of Object.entries(YAML_FILES)) {
    const slugMatch = filePath.match(/\/([^/]+)\.yaml$/);
    const assetSlug = slugMatch ? slugMatch[1] : null;

    if (!assetSlug || assetSlug.startsWith("_")) {
      continue;
    }

    let parsed;
    try {
      parsed = yaml.load(raw);
    } catch {
      continue;
    }

    if (!parsed || typeof parsed !== "object" || !parsed.name || !parsed.website || !parsed.summary) {
      continue;
    }

    const category = categoryFromTags(parsed.tags);
    const links = parsed.links && typeof parsed.links === "object" ? parsed.links : {};

    grouped[category].push({
      name: parsed.name,
      url: parsed.website,
      summary: parsed.summary,
      features: Array.isArray(parsed.features) ? parsed.features.slice(0, 3) : [],
      deployment: deploymentLabel(parsed.deployment),
      opensource: !!parsed.open_source,
      linkedin: links.linkedin,
      github: links.github,
      x: links.x,
      icon: "/favicons/" + assetSlug + ".png",
      slug: slugifyToolName(parsed.name),
      dateAdded: normalizeAddedAt(parsed.added_at),
    });
  }

  for (const category of CATEGORY_ORDER) {
    grouped[category].sort((a, b) => a.name.localeCompare(b.name));
  }

  return grouped;
}

const TOOLS_DATA = buildToolsData();
const ALL_TOOLS = CATEGORY_ORDER.flatMap((category) =>
  TOOLS_DATA[category].map((tool) => ({ ...tool, category }))
);
const TOOLS_BY_SLUG = new Map(ALL_TOOLS.map((tool) => [tool.slug, tool]));
const WHATS_NEW_META = getRecentTools(ALL_TOOLS);
const WHATS_NEW = WHATS_NEW_META.tools;
const WHATS_NEW_SLUGS = new Set(WHATS_NEW.map((tool) => tool.slug));
const TOTAL = ALL_TOOLS.length;

function getDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function favicon(url) {
  return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(url)}`;
}

function CheckboxBadge({ category, checked, onToggle }) {
  const meta = CAT[category];
  return (
    <button
      className="pressable pressable--chip"
      type="button"
      onClick={onToggle}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 0",
        background: "transparent",
        border: "none",
        color: "var(--text-primary)",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span
        style={{
          width: "16px",
          height: "16px",
          borderRadius: "4px",
          border: `1px solid ${checked ? meta.color : "rgba(255,255,255,0.18)"}`,
          background: checked ? meta.color : "transparent",
          boxShadow: checked ? `0 0 14px ${meta.color}33` : "none",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "all 0.16s ease",
        }}
      >
        {checked && (
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#0a0a0a",
            }}
          />
        )}
      </span>
      <span
        style={{
          padding: "2px 6px",
          borderRadius: "999px",
          background: `${meta.color}14`,
          color: meta.color,
          border: `1px solid ${meta.color}33`,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "8px",
          letterSpacing: "0.8px",
          flexShrink: 0,
        }}
      >
        {meta.label}
      </span>
      <span style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4 }}>{category}</span>
    </button>
  );
}

function OssToggle({ enabled, onToggle }) {
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
      <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>Only open source tools</span>
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

function FilterRail({ selectedCategories, onToggleCategory, ossOnly, onToggleOss, mobile, onClose }) {
  return (
    <aside
      data-filter-rail="true"
      style={{
        position: mobile ? "fixed" : "sticky",
        left: mobile ? 0 : "auto",
        right: "auto",
        top: mobile ? 0 : "16px",
        bottom: mobile ? 0 : "auto",
        width: mobile ? "220px" : "240px",
        padding: mobile ? "24px 18px" : "20px 16px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.07)",
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
        <div
          style={{
            color: "#00ff88",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            letterSpacing: "2px",
          }}
        >
          FILTERS
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

      <div
        style={{
          color: "var(--text-muted)",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "9px",
          letterSpacing: "2px",
          marginBottom: "10px",
        }}
      >
        CATEGORY
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {CATEGORY_ORDER.map((category) => (
          <CheckboxBadge
            key={category}
            category={category}
            checked={selectedCategories.includes(category)}
            onToggle={() => onToggleCategory(category)}
          />
        ))}
      </div>

      <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "18px 0 16px" }} />

      <div
        style={{
          color: "var(--text-muted)",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "9px",
          letterSpacing: "2px",
          marginBottom: "10px",
        }}
      >
        OPEN SOURCE
      </div>
      <OssToggle enabled={ossOnly} onToggle={onToggleOss} />
    </aside>
  );
}

function WhatsNewBanner({ tools, rangeDays, onSelectTool }) {
  return (
    <section
      style={{
        background: "rgba(0,255,136,0.04)",
        borderBottom: "1px solid rgba(0,255,136,0.15)",
        padding: "14px 20px",
        marginBottom: "26px",
      }}
    >
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" }}>
        <span
          style={{
            color: "#00ff88",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            letterSpacing: "2px",
            paddingTop: "6px",
          }}
        >
          RECENT ADDITIONS
        </span>
        <span
          style={{
            color: "var(--text-muted)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "9px",
            letterSpacing: "1px",
            paddingTop: "7px",
          }}
        >
          LAST {rangeDays} DAYS
        </span>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", flex: 1 }}>
          {tools.map((tool) => (
            <div
              key={tool.slug}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "4px 0",
              }}
            >
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
      </div>
    </section>
  );
}

function ScreenshotCard({ tool, isSelected, onClick, category, isNew }) {
  const color = CAT[category].color;

  return (
    <div
      data-tool-card="true"
      onClick={() => onClick(tool, category)}
      style={{
        borderRadius: "8px",
        overflow: "hidden",
        cursor: "pointer",
        background: isSelected ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${isSelected ? color + "60" : "rgba(255,255,255,0.07)"}`,
        transition: "all 0.18s",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(event) => {
        if (isSelected) {
          return;
        }

        event.currentTarget.style.background = "rgba(255,255,255,0.05)";
        event.currentTarget.style.borderColor = color + "40";
        event.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(event) => {
        if (isSelected) {
          return;
        }

        event.currentTarget.style.background = "rgba(255,255,255,0.02)";
        event.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
        event.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          paddingTop: "52%",
          background: CARD_BG[category] || "#111",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          <img
            src={favicon(tool.url)}
            style={{ width: "40px", height: "40px", borderRadius: "10px", boxShadow: `0 4px 20px ${color}22` }}
            alt=""
          />
          <span style={{ color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", letterSpacing: "1px" }}>
            {getDomain(tool.url)}
          </span>
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `linear-gradient(${color}08 1px, transparent 1px), linear-gradient(90deg, ${color}08 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
            pointerEvents: "none",
          }}
        />
        <span
          style={{
            position: "absolute",
            top: 7,
            left: 7,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            padding: "2px 6px",
            borderRadius: "3px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "8px",
            color,
            border: `1px solid ${color}30`,
            letterSpacing: "1px",
          }}
        >
          {CAT[category].label}
        </span>
        {isNew && (
          <span
            style={{
              position: "absolute",
              top: 7,
              left: `${CAT[category].label.length > 3 ? 52 : 42}px`,
              background: "rgba(0,255,136,0.14)",
              backdropFilter: "blur(4px)",
              padding: "2px 6px",
              borderRadius: "3px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "8px",
              color: "#00ff88",
              border: "1px solid rgba(0,255,136,0.25)",
              letterSpacing: "0.8px",
            }}
          >
            NEW
          </span>
        )}
        {tool.opensource && (
          <span
            style={{
              position: "absolute",
              top: 7,
              right: 7,
              background: "rgba(0,255,136,0.12)",
              backdropFilter: "blur(4px)",
              padding: "2px 6px",
              borderRadius: "3px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "8px",
              color: "#00ff88",
              border: "1px solid rgba(0,255,136,0.25)",
            }}
          >
            OSS
          </span>
        )}
      </div>

      <div style={{ padding: "11px 12px", flex: 1, display: "flex", flexDirection: "column", gap: "5px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <img src={favicon(tool.url)} style={{ width: "14px", height: "14px", borderRadius: "3px", flexShrink: 0 }} alt="" />
          <span
            style={{
              color: "var(--text-primary)",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {tool.name}
          </span>
        </div>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "10px",
            lineHeight: "1.5",
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

function Panel({ tool, category, onClose, mobile }) {
  const color = CAT[category].color;

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
            paddingTop: "52%",
            background: CARD_BG[category] || "#111",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
            }}
          >
            <img
              src={favicon(tool.url)}
              alt=""
              style={{ width: "64px", height: "64px", borderRadius: "16px", boxShadow: `0 10px 32px ${color}22` }}
            />
            <span style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", letterSpacing: "1px" }}>
              {getDomain(tool.url)}
            </span>
          </div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `linear-gradient(${color}08 1px, transparent 1px), linear-gradient(90deg, ${color}08 1px, transparent 1px)`,
              backgroundSize: "20px 20px",
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
              <span
                style={{
                  padding: "3px 7px",
                  borderRadius: "999px",
                  background: `${color}14`,
                  border: `1px solid ${color}33`,
                  color,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "9px",
                  letterSpacing: "0.8px",
                }}
              >
                {CAT[category].label}
              </span>
              <span
                style={{
                  padding: "3px 7px",
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--text-secondary)",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "9px",
                  letterSpacing: "0.6px",
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
                    letterSpacing: "0.6px",
                  }}
                >
                  OPEN SOURCE
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
              <div
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "9px",
                  letterSpacing: "2px",
                  marginBottom: "10px",
                }}
              >
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
            <div
              style={{
                color: "var(--text-muted)",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "9px",
                letterSpacing: "2px",
                marginBottom: "10px",
              }}
            >
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
              {tool.linkedin && (
                <a
                  className="pressable pressable--chip"
                  href={tool.linkedin}
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
                  <img src={SOCIAL_ICON.linkedin} alt="" style={{ width: "12px", height: "12px", opacity: 0.95 }} />
                  LinkedIn
                </a>
              )}
              {tool.github && (
                <a
                  className="pressable pressable--chip"
                  href={tool.github}
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
                  <img src={SOCIAL_ICON.github} alt="" style={{ width: "12px", height: "12px", opacity: 0.95 }} />
                  GitHub
                </a>
              )}
              {tool.x && (
                <a
                  className="pressable pressable--chip"
                  href={tool.x}
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
                  <img src={SOCIAL_ICON.x} alt="" style={{ width: "12px", height: "12px", opacity: 0.95 }} />
                  X
                </a>
              )}
            </div>
          </div>

          <div style={{ position: "relative" }}>
            <style>{`
              .update-btn-tooltip::after {
                content: "Create an issue on GitHub";
                position: absolute;
                bottom: calc(100% + 6px);
                left: 50%;
                transform: translateX(-50%);
                background: #1a1a1a;
                border: 1px solid rgba(255,255,255,0.15);
                color: var(--text-secondary);
                font-family: 'JetBrains Mono', monospace;
                font-size: 10px;
                white-space: nowrap;
                padding: 4px 8px;
                border-radius: 4px;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0s;
              }
              .update-btn-tooltip:hover::after {
                opacity: 1;
              }
            `}</style>
            <button
              type="button"
              className="update-btn-tooltip"
              onClick={() => {
                const name = encodeURIComponent(tool.name);
                const url = encodeURIComponent(tool.url);
                window.open(
                  `https://github.com/pavangudiwada/awesome-ai-sre/issues/new?title=Update:%20${name}&body=Tool:%20${name}%0AWebsite:%20${url}%0A%0AWhat%20I%27d%20like%20to%20update:%0A`,
                  "_blank",
                  "noopener,noreferrer"
                );
              }}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent",
                color: "#00ff88",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "12px",
                letterSpacing: "0.5px",
                cursor: "pointer",
                borderRadius: "8px",
                transition: "border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(0,255,136,0.3)";
                e.currentTarget.style.background = "rgba(0,255,136,0.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              UPDATE THIS PAGE
            </button>
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
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        success = true;
      }
    } catch { }

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
      } catch { }
    }

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const buttons = [
    { icon: "in", label: "LinkedIn", color: "#0077b5", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
    { icon: "𝕏", label: "X", color: "var(--text-primary)", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent("The AI SRE Watchlist: tracking what's shipping across 60+ AI SRE vendors")}` },
    { icon: copied ? "✓" : "⎘", label: "Copy", color: "#00ff88", onClick: copy, active: copied },
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
              transition: "all 0.15s",
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
              transition: "all 0.15s",
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
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [ossOnly, setOssOnly] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const selectedTool = activeTool ? { tool: activeTool, category: activeTool.category } : null;
  const closeSelectedTool = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handleSelectTool = useCallback(
    (tool) => {
      navigate(routeSlug === tool.slug ? "/" : `/tool/${tool.slug}`);
    },
    [navigate, routeSlug]
  );

  const openToolFromBanner = useCallback(
    (tool) => {
      navigate(`/tool/${tool.slug}`);
    },
    [navigate]
  );

  const toggleCategory = useCallback((category) => {
    if (routeSlug) {
      navigate("/");
    }
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category]
    );
  }, [navigate, routeSlug]);

  const toggleOss = useCallback(() => {
    if (routeSlug) {
      navigate("/");
    }
    setOssOnly((current) => !current);
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
      if (!mobile) {
        setFiltersOpen(false);
      }
    };

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!selectedTool && !filtersOpen) {
      return undefined;
    }

    const onPointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (selectedTool) {
        if (target.closest('[data-side-panel="true"]')) {
          return;
        }
        if (target.closest('[data-tool-card="true"]')) {
          return;
        }
      }

      if (filtersOpen && target.closest('[data-filter-rail="true"]')) {
        return;
      }

      if (selectedTool) {
        closeSelectedTool();
      }
      if (filtersOpen) {
        setFiltersOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [closeSelectedTool, selectedTool, filtersOpen]);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredGroups = CATEGORY_ORDER.reduce((groups, category) => {
    if (selectedCategories.length > 0 && !selectedCategories.includes(category)) {
      return groups;
    }

    const matches = TOOLS_DATA[category].filter((tool) => {
      if (ossOnly && !tool.opensource) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        tool.name.toLowerCase().includes(normalizedSearch) ||
        tool.summary.toLowerCase().includes(normalizedSearch)
      );
    });

    if (matches.length > 0) {
      groups.push({ category, tools: matches });
    }

    return groups;
  }, []);

  const count = filteredGroups.reduce((total, group) => total + group.tools.length, 0);
  const panelOpen = !!selectedTool;

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
        ::-webkit-scrollbar{width:3px}
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
        .pressable--strong:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(0,0,0,.28)}
        .pressable--chip:hover{box-shadow:0 8px 18px rgba(0,0,0,.2)}
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
            selectedCategories={selectedCategories}
            onToggleCategory={toggleCategory}
            ossOnly={ossOnly}
            onToggleOss={toggleOss}
            mobile
            onClose={() => setFiltersOpen(false)}
          />
        </>
      )}

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: isMobile ? "0 16px 0" : "0 28px 0" }}>
          {WHATS_NEW.length > 0 && (
            <WhatsNewBanner tools={WHATS_NEW} rangeDays={WHATS_NEW_META.rangeDays} onSelectTool={openToolFromBanner} />
          )}
          <header style={{ paddingTop: "26px", paddingBottom: "28px" }}>
            <div style={{ marginBottom: "8px" }}>
              <span style={{ color: "#00ff88", fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", letterSpacing: "4px" }}>AI SRE /// WATCHLIST</span>
            </div>
            <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "clamp(24px, 4vw, 42px)", fontWeight: 700, margin: "0 0 12px", lineHeight: 1.1, letterSpacing: "-0.5px" }}>
              Tracking what&apos;s <span style={{ color: "#00ff88" }}>shipping</span><br />in AI SRE<span className="blink" style={{ color: "#00ff88" }}>_</span>
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", maxWidth: "500px", lineHeight: "1.6", margin: "0 0 24px" }}>
              {TOTAL}+ vendors building the future of autonomous reliability engineering. Brought to you by <span style={{ color: "#00ff88" }}>The AI SRE Watchlist</span>.
            </p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <a className="pressable pressable--strong" href="https://www.linkedin.com/company/ai-sre-watchlist" target="_blank" rel="noopener noreferrer" style={{ background: "#00ff88", color: "#0a0a0a", padding: "8px 16px", borderRadius: "4px", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", fontWeight: 700, textDecoration: "none", letterSpacing: "1px" }}>→ FOLLOW ON LINKEDIN</a>
              <a className="pressable pressable--strong" href="https://github.com/pavangudiwada/awesome-ai-sre" target="_blank" rel="noopener noreferrer" style={{ background: "transparent", color: "#00ff88", padding: "8px 16px", borderRadius: "4px", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", fontWeight: 700, textDecoration: "none", letterSpacing: "1px", border: "1px solid rgba(0,255,136,0.3)" }}>★ STAR ON GITHUB</a>
            </div>
          </header>

          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", padding: "14px 0", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", marginBottom: "28px" }}>
            {CATEGORY_ORDER.map((category) => (
              <div key={category} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: CAT[category].color, boxShadow: `0 0 4px ${CAT[category].color}` }} />
                <span style={{ color: "var(--text-muted)", fontSize: "10px", fontFamily: "'JetBrains Mono', monospace" }}>{CAT[category].label}</span>
                <span style={{ color: "var(--text-primary)", fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{TOOLS_DATA[category].length}</span>
              </div>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ color: "#00ff88", fontSize: "9px", fontFamily: "'JetBrains Mono', monospace" }}>LIVE</span>
              <div className="blink" style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#00ff88" }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
            {!isMobile && (
              <FilterRail
                selectedCategories={selectedCategories}
                onToggleCategory={toggleCategory}
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
                    className="pressable pressable--strong"
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

              <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px" }}>
                  {count} tools{search && ` matching "${search}"`}
                </span>
                {selectedCategories.length > 0 && (
                  <span style={{ color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px" }}>
                    category filter active
                  </span>
                )}
                {ossOnly && (
                  <span style={{ color: "#00ff88", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px" }}>
                    OSS only
                  </span>
                )}
              </div>

              {filteredGroups.map(({ category, tools }) => (
                <div key={category} style={{ marginBottom: "40px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: CAT[category].color, boxShadow: `0 0 6px ${CAT[category].color}` }} />
                    <h2 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", fontWeight: 600, margin: 0, color: "var(--text-primary)", letterSpacing: "2px", textTransform: "uppercase" }}>{category}</h2>
                    <span style={{ color: CAT[category].color, fontFamily: "'JetBrains Mono', monospace", fontSize: "9px" }}>({tools.length})</span>
                    <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))",
                      gap: "10px",
                    }}
                  >
                    {tools.map((tool) => (
                      <ScreenshotCard
                        key={tool.name}
                        tool={tool}
                        category={category}
                        isSelected={selectedTool?.tool.name === tool.name}
                        onClick={handleSelectTool}
                        isNew={WHATS_NEW_SLUGS.has(tool.slug)}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {count === 0 && (
                <div style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", borderRadius: "10px", padding: "18px 16px", marginBottom: "40px" }}>
                  <div style={{ color: "var(--text-primary)", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", marginBottom: "6px" }}>NO MATCHES</div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "12px", lineHeight: 1.6 }}>Try clearing search terms or relaxing the category and open source filters.</div>
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
              <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 10px" }}>The AI SRE Watchlist</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "12px", lineHeight: "1.7", margin: "0 0 10px" }}>The AI SRE space is moving fast. New tools launch weekly. Existing vendors ship agentic features quietly. It&apos;s hard to keep up unless someone is watching.</p>
              <p style={{ color: "var(--text-secondary)", fontSize: "12px", lineHeight: "1.7", margin: "0 0 18px" }}>{TOTAL} vendors tracked across incident response, observability, infrastructure, and cost optimization.</p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <a className="pressable pressable--strong" href="https://www.linkedin.com/company/ai-sre-watchlist" target="_blank" rel="noopener noreferrer" style={{ background: "#00ff88", color: "#0a0a0a", padding: "8px 16px", borderRadius: "4px", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", fontWeight: 700, textDecoration: "none", letterSpacing: "1px" }}>→ FOLLOW ON LINKEDIN</a>
                <a className="pressable pressable--strong" href="https://github.com/pavangudiwada/awesome-ai-sre" target="_blank" rel="noopener noreferrer" style={{ background: "transparent", color: "#00ff88", padding: "8px 16px", borderRadius: "4px", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", fontWeight: 700, textDecoration: "none", letterSpacing: "1px", border: "1px solid rgba(0,255,136,0.3)" }}>★ STAR ON GITHUB</a>
              </div>
            </div>
          </section>

          <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "24px 0 44px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "var(--text-primary)", marginBottom: "2px", fontWeight: 600 }}>The AI SRE Watchlist</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: "var(--text-muted)" }}>by <a href="https://www.linkedin.com/in/pavangudiwada/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Pavan Gudiwada</a></div>
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

      {selectedTool && <Panel tool={selectedTool.tool} category={selectedTool.category} onClose={closeSelectedTool} mobile={isMobile} />}
      {!panelOpen && !isMobile && <ShareBar />}
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

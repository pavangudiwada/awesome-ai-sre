import React, { useState, useCallback, useEffect } from "react";
import yaml from "js-yaml";

const TAG_TO_CATEGORY = {
  "incident-response": "Incident Response",
  "observability": "Observability",
  "infrastructure": "Infrastructure",
  "cost-optimization": "Cost Optimization",
  "automation": "Infrastructure",
  "security": "Incident Response",
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

function deploymentLabel(deployment) {
  if (!Array.isArray(deployment) || deployment.length === 0) {
    return "Unknown";
  }
  if (deployment.length > 1) {
    return "Multi";
  }
  return DEPLOYMENT_LABELS[String(deployment[0]).toLowerCase()] || String(deployment[0]);
}

function categoryFromTags(tags) {
  const primary = Array.isArray(tags) && tags.length ? String(tags[0]).toLowerCase() : "";
  return TAG_TO_CATEGORY[primary] || "Infrastructure";
}

function buildToolsData() {
  const grouped = {
    "Incident Response": [],
    "Observability": [],
    "Infrastructure": [],
    "Cost Optimization": [],
  };

  for (const [filePath, raw] of Object.entries(YAML_FILES)) {
    const slugMatch = filePath.match(/\/([^/]+)\.yaml$/);
    const slug = slugMatch ? slugMatch[1] : null;

    if (!slug || slug.startsWith("_")) {
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
      icon: "/favicons/" + slug + ".png",
      slug,
    });
  }

  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.name.localeCompare(b.name));
  }

  return grouped;
}

const TOOLS_DATA = buildToolsData();
const CAT = {
  "Incident Response": { color: "#ff4444", label: "IR" },
  "Observability": { color: "#00d4ff", label: "OBS" },
  "Infrastructure": { color: "#00ff88", label: "INFRA" },
  "Cost Optimization": { color: "#ffaa00", label: "COST" },
};

const TOTAL = Object.values(TOOLS_DATA).reduce((a, b) => a + b.length, 0);
function getDomain(url) {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
}
function favicon(url) { return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(url)}`; }
function fallbackToRemoteFavicon(event, url) {
  if (event.currentTarget.dataset.fallback === "1") return;
  event.currentTarget.dataset.fallback = "1";
  event.currentTarget.src = favicon(url);
}
const SOCIAL_ICON = {
  linkedin: new URL("../assets/icons/linkedin.svg", import.meta.url).href,
  github: new URL("../assets/icons/github.svg", import.meta.url).href,
  x: new URL("../assets/icons/x.svg", import.meta.url).href,
};

const CARD_BG = {
  "Incident Response": "linear-gradient(140deg, #180808 0%, #1e0d0d 60%, #120606 100%)",
  "Observability": "linear-gradient(140deg, #060e1a 0%, #091525 60%, #050b14 100%)",
  "Infrastructure": "linear-gradient(140deg, #071508 0%, #0a1c0c 60%, #060f07 100%)",
  "Cost Optimization": "linear-gradient(140deg, #161004 0%, #1d1508 60%, #100d03 100%)",
};

function ScreenshotCard({ tool, isSelected, onClick, category }) {
  const c = CAT[category].color;
  return (
    <div data-tool-card="true" onClick={() => onClick(tool, category)} style={{
      borderRadius: "8px", overflow: "hidden", cursor: "pointer",
      background: isSelected ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${isSelected ? c + "60" : "rgba(255,255,255,0.07)"}`,
      transition: "all 0.18s", display: "flex", flexDirection: "column",
    }}
      onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = c + "40"; e.currentTarget.style.transform = "translateY(-2px)"; } }}
      onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateY(0)"; } }}
    >
      {/* Visual header */}
      <div style={{ position: "relative", width: "100%", paddingTop: "52%", background: CARD_BG[category] || "#111", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
          <img src={favicon(tool.url)} style={{ width: "40px", height: "40px", borderRadius: "10px", boxShadow: `0 4px 20px ${c}22` }} alt="" />
          <span style={{ color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", letterSpacing: "1px" }}>{getDomain(tool.url)}</span>
        </div>
        {/* Grid pattern overlay */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${c}08 1px, transparent 1px), linear-gradient(90deg, ${c}08 1px, transparent 1px)`, backgroundSize: "20px 20px", pointerEvents: "none" }} />
        <span style={{ position: "absolute", top: 7, left: 7, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", padding: "2px 6px", borderRadius: "3px", fontFamily: "'JetBrains Mono', monospace", fontSize: "8px", color: c, border: `1px solid ${c}30`, letterSpacing: "1px" }}>{CAT[category].label}</span>
        {tool.opensource && <span style={{ position: "absolute", top: 7, right: 7, background: "rgba(0,255,136,0.12)", backdropFilter: "blur(4px)", padding: "2px 6px", borderRadius: "3px", fontFamily: "'JetBrains Mono', monospace", fontSize: "8px", color: "#00ff88", border: "1px solid rgba(0,255,136,0.25)" }}>OSS</span>}
      </div>
      {/* Info */}
      <div style={{ padding: "11px 12px", flex: 1, display: "flex", flexDirection: "column", gap: "5px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <img src={favicon(tool.url)} style={{ width: "14px", height: "14px", borderRadius: "3px", flexShrink: 0 }} alt="" />
          <span style={{ color: "var(--text-primary)", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tool.name}</span>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "10px", lineHeight: "1.5", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{tool.summary}</p>
      </div>
    </div>
  );
}

function Panel({ tool, category, onClose }) {
  const c = CAT[category].color;
  return (
    <div data-side-panel="true" style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: "360px", background: "#0d0d0d", borderLeft: "1px solid rgba(255,255,255,0.07)", zIndex: 60, overflowY: "auto", display: "flex", flexDirection: "column" }}>
      <style>{`@keyframes panelIn{from{transform:translateX(30px)}to{transform:translateX(0)}}`}</style>
      <div style={{ animation: "panelIn 0.18s ease" }}>
        <div style={{ position: "relative", width: "100%", paddingTop: "52%", background: CARD_BG[category] || "#111", flexShrink: 0, overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
            <img src={favicon(tool.url)} style={{ width: "52px", height: "52px", borderRadius: "12px", boxShadow: `0 6px 24px ${c}33` }} alt="" />
            <span style={{ color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px" }}>{getDomain(tool.url)}</span>
          </div>
          <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${c}10 1px, transparent 1px), linear-gradient(90deg, ${c}10 1px, transparent 1px)`, backgroundSize: "24px 24px", pointerEvents: "none" }} />
          <button onClick={onClose} style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--text-primary)", width: "26px", height: "26px", borderRadius: "4px", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        <div style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "10px" }}>
            <img src={favicon(tool.url)} style={{ width: "22px", height: "22px", borderRadius: "5px" }} alt="" />
            <div>
              <div style={{ color: "var(--text-primary)", fontFamily: "'JetBrains Mono', monospace", fontSize: "15px", fontWeight: 700 }}>{tool.name}</div>
              <div style={{ color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: "9px" }}>{getDomain(tool.url)}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "14px" }}>
            {[{ label: CAT[category].label, bg: c + "18", col: c, bdr: c + "33" }, { label: tool.deployment, bg: "rgba(255,255,255,0.05)", col: "#555", bdr: "rgba(255,255,255,0.08)" }, ...(tool.opensource ? [{ label: "OSS", bg: "rgba(0,255,136,0.1)", col: "#00ff88", bdr: "rgba(0,255,136,0.25)" }] : [])].map((b, i) => (
              <span key={i} style={{ padding: "3px 7px", borderRadius: "3px", fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", background: b.bg, color: b.col, border: `1px solid ${b.bdr}` }}>{b.label}</span>
            ))}
          </div>

          <p style={{ color: "var(--text-secondary)", fontSize: "12px", lineHeight: "1.7", margin: "0 0 12px" }}>{tool.summary}</p>

          {Array.isArray(tool.features) && tool.features.length > 0 && (
            <div style={{ margin: "0 0 16px" }}>
              <div style={{ color: c, fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", letterSpacing: "1px", marginBottom: "8px" }}>FEATURES</div>
              <ul style={{ margin: 0, paddingLeft: "16px", color: "var(--text-secondary)", fontSize: "11px", lineHeight: "1.6" }}>
                {tool.features.map((f, idx) => (
                  <li key={idx} style={{ marginBottom: idx === tool.features.length - 1 ? 0 : "6px" }}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          <a href={tool.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: c, borderRadius: "5px", textDecoration: "none", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#0a0a0a", fontWeight: 700, letterSpacing: "1px", marginBottom: "8px" }}>VISIT WEBSITE <span>→</span></a>

          {(tool.linkedin || tool.github || tool.x) && (
            <div style={{ display: "flex", gap: "6px" }}>
              {tool.linkedin && <a href={tool.linkedin} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: "7px", borderRadius: "4px", textDecoration: "none", background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.26)", color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", textAlign: "center", transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }} onMouseEnter={e => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.55)"; e.currentTarget.style.background = "rgba(255,255,255,0.14)"; }} onMouseLeave={e => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.26)"; e.currentTarget.style.background = "rgba(255,255,255,0.09)"; }}><img src={SOCIAL_ICON.linkedin} alt="" style={{ width: "12px", height: "12px", opacity: 0.95 }} />LinkedIn</a>}
              {tool.github && <a href={tool.github} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: "7px", borderRadius: "4px", textDecoration: "none", background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.26)", color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", textAlign: "center", transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }} onMouseEnter={e => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.55)"; e.currentTarget.style.background = "rgba(255,255,255,0.14)"; }} onMouseLeave={e => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.26)"; e.currentTarget.style.background = "rgba(255,255,255,0.09)"; }}><img src={SOCIAL_ICON.github} alt="" style={{ width: "12px", height: "12px", opacity: 0.95 }} />GitHub</a>}
              {tool.x && <a href={tool.x} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: "7px", borderRadius: "4px", textDecoration: "none", background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.26)", color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", textAlign: "center", transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }} onMouseEnter={e => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.55)"; e.currentTarget.style.background = "rgba(255,255,255,0.14)"; }} onMouseLeave={e => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.26)"; e.currentTarget.style.background = "rgba(255,255,255,0.09)"; }}><img src={SOCIAL_ICON.x} alt="" style={{ width: "12px", height: "12px", opacity: 0.95 }} />X</a>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ShareBar() {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.origin : "https://aisrewatchlist.vercel.app";
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
  const btns = [
    { icon: "in", label: "LinkedIn", color: "#0077b5", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
    { icon: "𝕏", label: "X", color: "var(--text-primary)", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent("The AI SRE Watchlist — tracking what's shipping across 60+ AI SRE vendors")}` },
    { icon: copied ? "✓" : "⎘", label: "Copy", color: "#00ff88", onClick: copy, active: copied },
  ];
  return (
    <div style={{ position: "fixed", right: "16px", top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: "6px", zIndex: 40 }}>
      {btns.map(b => b.href ? (
        <a key={b.label} href={b.href} target="_blank" rel="noopener noreferrer" title={b.label} style={{ width: "34px", height: "34px", borderRadius: "6px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700, textDecoration: "none", transition: "all 0.15s", fontFamily: "'JetBrains Mono', monospace" }} onMouseEnter={e => { e.currentTarget.style.color = b.color; e.currentTarget.style.borderColor = b.color + "55"; e.currentTarget.style.background = b.color + "12"; }} onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}>{b.icon}</a>
      ) : (
        <button key={b.label} onClick={b.onClick} title={b.label} style={{ width: "34px", height: "34px", borderRadius: "6px", background: b.active ? "rgba(0,255,136,0.1)" : "rgba(255,255,255,0.08)", border: b.active ? "1px solid rgba(0,255,136,0.4)" : "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", color: b.active ? "#00ff88" : "var(--text-muted)", fontSize: "11px", cursor: "pointer", transition: "all 0.15s", fontFamily: "'JetBrains Mono', monospace" }} onMouseEnter={e => { if (!b.active) { e.currentTarget.style.color = b.color; e.currentTarget.style.borderColor = b.color + "55"; e.currentTarget.style.background = b.color + "12"; } }} onMouseLeave={e => { if (!b.active) { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; } }}>{b.icon}</button>
      ))}
    </div>
  );
}

export default function App() {
  const [cat, setCat] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const handleClick = useCallback((tool, category) => {
    setSelected(prev => prev?.tool.name === tool.name ? null : { tool, category });
  }, []);

  const categories = ["All", ...Object.keys(TOOLS_DATA)];
  const filtered = Object.entries(TOOLS_DATA).reduce((acc, [c, tools]) => {
    if (cat !== "All" && cat !== c) return acc;
    const m = tools.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.summary.toLowerCase().includes(search.toLowerCase()));
    if (m.length) acc.push({ category: c, tools: m });
    return acc;
  }, []);
  const count = filtered.reduce((a, g) => a + g.tools.length, 0);
  const panelOpen = !!selected;

  useEffect(() => {
    if (!selected) return;

    const onPointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (target.closest('[data-side-panel="true"]')) return;
      if (target.closest('[data-tool-card="true"]')) return;

      setSelected(null);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [selected]);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "var(--text-primary)", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');
        :root{--text-primary:#E6EDF3;--text-secondary:#9DA7B3;--text-muted:#6B7280}
        *{box-sizing:border-box} body{margin:0;color:var(--text-primary)}
        ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-track{background:#0a0a0a} ::-webkit-scrollbar-thumb{background:#222;border-radius:2px}
        .blink{animation:blink 1.2s step-end infinite} @keyframes blink{0%,100%{color:var(--text-primary)}50%{color:transparent}}
        input:focus{outline:none} input::placeholder{color:var(--text-muted)}
      `}</style>

      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(0,255,136,0.028) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,136,0.028) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>

        {/* HEADER */}
        <header style={{ paddingTop: "52px", paddingBottom: "36px" }}>
          <div style={{ marginBottom: "8px" }}>
            <span style={{ color: "#00ff88", fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", letterSpacing: "4px" }}>AI SRE /// WATCHLIST</span>
          </div>
          <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "clamp(24px, 4vw, 42px)", fontWeight: 700, margin: "0 0 12px", lineHeight: 1.1, letterSpacing: "-0.5px" }}>
            Tracking what's <span style={{ color: "#00ff88" }}>shipping</span><br />in AI SRE<span className="blink" style={{ color: "#00ff88" }}>_</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", maxWidth: "460px", lineHeight: "1.6", margin: "0 0 24px" }}>
            60+ vendors building the future of autonomous reliability engineering. Brought to you by <span style={{ color: "#00ff88" }}>The AI SRE Watchlist</span>.
          </p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <a href="https://www.linkedin.com/company/ai-sre-watchlist" target="_blank" rel="noopener noreferrer" style={{ background: "#00ff88", color: "#0a0a0a", padding: "8px 16px", borderRadius: "4px", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", fontWeight: 700, textDecoration: "none", letterSpacing: "1px" }}>→ FOLLOW ON LINKEDIN</a>
            <a href="https://github.com/pavangudiwada/awesome-ai-sre" target="_blank" rel="noopener noreferrer" style={{ background: "transparent", color: "#00ff88", padding: "8px 16px", borderRadius: "4px", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", fontWeight: 700, textDecoration: "none", letterSpacing: "1px", border: "1px solid rgba(0,255,136,0.3)", transition: "all 0.15s" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,255,136,0.08)"; e.currentTarget.style.borderColor = "#00ff88"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(0,255,136,0.3)"; }}>★ GITHUB</a>
          </div>
        </header>

        {/* STATS */}
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", padding: "14px 0", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", marginBottom: "28px" }}>
          {Object.entries(TOOLS_DATA).map(([c, tools]) => (
            <div key={c} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: CAT[c].color, boxShadow: `0 0 4px ${CAT[c].color}` }} />
              <span style={{ color: "var(--text-muted)", fontSize: "10px", fontFamily: "'JetBrains Mono', monospace" }}>{CAT[c].label}</span>
              <span style={{ color: "var(--text-primary)", fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{tools.length}</span>
            </div>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ color: "#00ff88", fontSize: "9px", fontFamily: "'JetBrains Mono', monospace" }}>LIVE</span>
            <div className="blink" style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#00ff88" }} />
          </div>
        </div>

        {/* SEARCH + FILTER */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "180px" }}>
            <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }}>{">"}</span>
            <input type="text" placeholder="search tools..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "4px", padding: "8px 10px 8px 24px", color: "var(--text-primary)", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }} />
          </div>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {categories.map(c => (
              <button key={c} onClick={() => setCat(c)} style={{ padding: "6px 10px", borderRadius: "4px", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", fontWeight: 600, letterSpacing: "0.5px", transition: "all 0.15s", background: cat === c ? "#00ff88" : "rgba(255,255,255,0.08)", color: cat === c ? "#0a0a0a" : "var(--text-secondary)", border: cat === c ? "1px solid #00ff88" : "1px solid rgba(255,255,255,0.10)" }}>
                {c === "All" ? "ALL" : CAT[c]?.label || c}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <span style={{ color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px" }}>{count} tools{search && ` matching "${search}"`}</span>
        </div>

        {/* GRID */}
        {filtered.map(({ category, tools }) => (
          <div key={category} style={{ marginBottom: "40px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: CAT[category].color, boxShadow: `0 0 6px ${CAT[category].color}` }} />
              <h2 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", fontWeight: 600, margin: 0, color: "var(--text-primary)", letterSpacing: "2px", textTransform: "uppercase" }}>{category}</h2>
              <span style={{ color: CAT[category].color, fontFamily: "'JetBrains Mono', monospace", fontSize: "9px" }}>({tools.length})</span>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
              {tools.map(tool => (
                <ScreenshotCard key={tool.name} tool={tool} category={category} isSelected={selected?.tool.name === tool.name} onClick={handleClick} />
              ))}
            </div>
          </div>
        ))}

        {/* ABOUT */}
        <section style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "52px 0", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "48px" }}>
          {[
            { dot: "#00ff88", label: "ABOUT THE WATCHLIST", title: "The AI SRE Watchlist", sub: null, p1: "The AI SRE space is moving fast. New tools launch weekly. Existing vendors ship agentic features quietly. It's hard to keep up, unless someone's watching.", p2: "60+ vendors tracked across incident response, observability, infrastructure, and cost optimization.", links: [{ label: "→ FOLLOW", href: "https://www.linkedin.com/company/ai-sre-watchlist", col: "#00ff88", bdr: "rgba(0,255,136,0.3)" }, { label: "★ GITHUB", href: "https://github.com/pavangudiwada/awesome-ai-sre", col: "var(--text-muted)", bdr: "rgba(255,255,255,0.07)" }] },
          ].map(s => (
            <div key={s.label}>
              <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "14px" }}>
                <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: s.dot, boxShadow: `0 0 5px ${s.dot}` }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", letterSpacing: "3px", color: s.dot }}>{s.label}</span>
              </div>
              <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>{s.title}</h3>
              {s.sub && <p style={{ color: s.dot, fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", margin: "0 0 12px", letterSpacing: "1px" }}>{s.sub}</p>}
              <p style={{ color: "var(--text-secondary)", fontSize: "12px", lineHeight: "1.7", margin: s.sub ? "0 0 10px" : "12px 0 10px" }}>{s.p1}</p>
              <p style={{ color: "var(--text-secondary)", fontSize: "12px", lineHeight: "1.7", margin: "0 0 18px" }}>{s.p2}</p>
              <div style={{ display: "flex", gap: "7px" }}>
                {s.links.map(l => (
                  <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: l.col, textDecoration: "none", border: `1px solid ${l.bdr}`, padding: "6px 10px", borderRadius: "4px", letterSpacing: "1px", transition: "all 0.15s" }}>{l.label}</a>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* QUICK FILTER LINKS */}
        <section style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "34px 0 28px" }}>
          <h2 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "14px", color: "var(--text-primary)", margin: "0 0 12px", letterSpacing: "0.5px" }}>
            Browse Best Tools By Category
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {Object.keys(CAT).map((category) => (
              <button
                key={category}
                onClick={() => { setCat(category); setSearch(""); setSelected(null); }}
                style={{
                  padding: "7px 10px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.4px",
                  border: `1px solid ${CAT[category].color}55`,
                  background: "rgba(255,255,255,0.08)",
                  color: CAT[category].color,
                }}
              >
                {`Best tools for ${category}`}
              </button>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "24px 0 44px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "var(--text-primary)", marginBottom: "2px", fontWeight: 600 }}>The AI SRE Watchlist</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: "var(--text-muted)" }}>by <a href="https://www.linkedin.com/in/pavangudiwada/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", textDecoration: "none" }} onMouseEnter={e => e.currentTarget.style.color = "var(--text-secondary)"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}>Pavan Gudiwada</a></div>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            {[{ l: "GitHub", h: "https://github.com/pavangudiwada/awesome-ai-sre" }, { l: "LinkedIn", h: "https://www.linkedin.com/company/ai-sre-watchlist" }, { l: "pavangudiwada.dev", h: "https://pavangudiwada.dev" }].map(x => (
              <a key={x.l} href={x.h} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", textDecoration: "none", transition: "color 0.15s" }} onMouseEnter={e => e.currentTarget.style.color = "#00ff88"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}>{x.l}</a>
            ))}
          </div>
        </footer>
      </div>

      {selected && <Panel tool={selected.tool} category={selected.category} onClose={() => setSelected(null)} />}
      {!panelOpen && <ShareBar />}
    </div>
  );
}

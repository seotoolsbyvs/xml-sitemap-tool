import { useState, useRef, useCallback } from "react";

const FREQUENCIES = ["daily", "weekly", "monthly", "quarterly"];

function parseURLs(raw) {
  return raw
    .split(/[\n,]+/)
    .map(u => u.trim())
    .filter(u => u.length > 0);
}

function isValidURL(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function buildSitemap(urls, defaultFreq) {
  const today = new Date().toISOString().split("T")[0];

  // Detect homepage: URL with no path beyond "/"
  function isHomepage(url) {
    try {
      const u = new URL(url);
      return u.pathname === "/" || u.pathname === "";
    } catch { return false; }
  }

  const entries = urls.map(url => {
    const priority = isHomepage(url) ? "1.0" : "0.9";
    return `  <url>
    <loc>${url.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${defaultFreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${entries}
</urlset>`;
}

function Stat({ label, value, accent }) {
  return (
    <div style={{
      background: accent ? "rgba(0,102,204,0.06)" : "rgba(0,0,0,0.02)",
      border: `1px solid ${accent ? "#0066cc" : "rgba(0,102,204,0.15)"}`,
      borderRadius: 10,
      padding: "14px 20px",
      minWidth: 110,
      textAlign: "center"
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#0066cc", fontFamily: "'Space Mono', monospace", letterSpacing: -1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#555", marginTop: 2, letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

export default function App() {
  const [rawInput, setRawInput] = useState("");
  const [freq, setFreq] = useState("weekly");
  const [generated, setGenerated] = useState("");
  const [errors, setErrors] = useState([]);
  const [step, setStep] = useState("input"); // input | preview
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const urls = parseURLs(rawInput);
  const validURLs = urls.filter(isValidURL);
  const invalidURLs = urls.filter(u => !isValidURL(u));

  const handleGenerate = () => {
    if (validURLs.length === 0) return;
    const xml = buildSitemap(validURLs, freq);
    setGenerated(xml);
    setErrors(invalidURLs);
    setStep("preview");
  };

  const handleDownload = () => {
    const blob = new Blob([generated], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sitemap.xml";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generated).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => setRawInput(prev => prev ? prev + "\n" + e.target.result : e.target.result);
    reader.readAsText(file);
  };

  const handleDrop = useCallback(e => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleFileInput = e => handleFile(e.target.files[0]);

  // Split sitemap if > 50k URLs (standard limit)
  const chunks = [];
  if (validURLs.length > 50000) {
    for (let i = 0; i < validURLs.length; i += 50000) {
      chunks.push(validURLs.slice(i, i + 50000));
    }
  }

  const handleDownloadAll = () => {
    chunks.forEach((chunk, i) => {
      const xml = buildSitemap(chunk, freq);
      const blob = new Blob([xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sitemap-${i + 1}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const selectStyle = {
    background: "#fff",
    border: "1px solid #0066cc",
    borderRadius: 8,
    color: "#0066cc",
    padding: "9px 14px",
    fontSize: 14,
    outline: "none",
    cursor: "pointer",
    fontFamily: "'Space Mono', monospace"
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#ffffff",
      color: "#0066cc",
      fontFamily: "'DM Sans', sans-serif",
      padding: "0",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {/* Background grid */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: "linear-gradient(rgba(0,102,204,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,102,204,0.04) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        pointerEvents: "none"
      }} />

      {/* Glow blob */}
      <div style={{
        position: "fixed", top: -200, right: -100, width: 600, height: 600,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,102,204,0.05) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 820, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(0,102,204,0.08)", border: "1px solid rgba(0,102,204,0.2)",
            borderRadius: 20, padding: "5px 14px", marginBottom: 20, fontSize: 12,
            color: "#0066cc", letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Space Mono', monospace"
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0066cc", display: "inline-block" }} />
            XML Sitemap Generator
          </div>
          <h1 style={{
            fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, margin: 0, lineHeight: 1.1,
            letterSpacing: -2, color: "#0066cc"
          }}>
            Build your<br />
            <span style={{ color: "#004499" }}>sitemap.xml</span>
          </h1>
          <p style={{ color: "#555", marginTop: 12, fontSize: 15, maxWidth: 460, lineHeight: 1.6 }}>
            Paste URLs, upload a file, or mix both. Handles 2,000+ URLs. Auto-splits at 50k per sitemap standard.
          </p>
        </div>

        {step === "input" && (
          <>
            {/* Stats bar */}
            {urls.length > 0 && (
              <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
                <Stat label="Total" value={urls.length} />
                <Stat label="Valid" value={validURLs.length} accent />
                {invalidURLs.length > 0 && <Stat label="Invalid" value={invalidURLs.length} />}
                {validURLs.length > 50000 && <Stat label="Sitemaps" value={chunks.length} />}
              </div>
            )}

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current.click()}
              style={{
                border: `2px dashed ${dragOver ? "#0066cc" : "rgba(0,102,204,0.2)"}`,
                borderRadius: 12, padding: "20px 24px", marginBottom: 16, cursor: "pointer",
                background: dragOver ? "rgba(0,102,204,0.04)" : "rgba(0,0,0,0.01)",
                color: "#0066cc",
                transition: "all 0.2s", display: "flex", alignItems: "center", gap: 14
              }}>
              <span style={{ fontSize: 28 }}>📂</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Drop a .txt or .csv file here</div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>One URL per line, or comma-separated</div>
              </div>
              <input ref={fileRef} type="file" accept=".txt,.csv" style={{ display: "none" }} onChange={handleFileInput} />
            </div>

            {/* Textarea */}
            <textarea
              value={rawInput}
              onChange={e => setRawInput(e.target.value)}
              placeholder={"https://example.com/page-1\nhttps://example.com/page-2\nhttps://example.com/page-3\n...paste URLs here"}
              style={{
                width: "100%", minHeight: 260, background: "#ffffff",
                border: "1px solid rgba(0,102,204,0.3)", borderRadius: 12,
                color: "#003366", fontSize: 13, padding: "16px 18px", resize: "vertical",
                outline: "none", fontFamily: "'Space Mono', monospace", lineHeight: 1.7,
                boxSizing: "border-box", transition: "border 0.2s"
              }}
            />

            {/* Config row */}
            <div style={{ display: "flex", gap: 16, marginTop: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: 11, color: "#555", marginBottom: 6, letterSpacing: 1, textTransform: "uppercase" }}>Change Frequency</div>
                <select value={freq} onChange={e => setFreq(e.target.value)} style={selectStyle}>
                  {FREQUENCIES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                </select>
              </div>
              <div style={{
                background: "rgba(0,102,204,0.05)", border: "1px solid rgba(0,102,204,0.15)",
                borderRadius: 8, padding: "9px 14px", fontSize: 12, color: "#444", lineHeight: 1.5
              }}>
                <span style={{ color: "#0066cc", fontWeight: 700 }}>Auto:</span> Homepage → priority <strong style={{ color: "#004499" }}>1.0</strong> &nbsp;·&nbsp; All others → <strong style={{ color: "#004499" }}>0.9</strong><br />
                <span style={{ color: "#0066cc", fontWeight: 700 }}>lastmod</span> set to today's date automatically
              </div>
              <div style={{ marginLeft: "auto" }}>
                <button
                  onClick={handleGenerate}
                  disabled={validURLs.length === 0}
                  style={{
                    background: validURLs.length === 0 ? "rgba(0,102,204,0.2)" : "#0066cc",
                    color: "#fff",
                    border: "none", borderRadius: 10, padding: "12px 32px",
                    fontWeight: 800, fontSize: 15, cursor: validURLs.length === 0 ? "not-allowed" : "pointer",
                    fontFamily: "'DM Sans', sans-serif", letterSpacing: -0.3,
                    transition: "all 0.2s"
                  }}
                >
                  Generate Sitemap →
                </button>
              </div>
            </div>
          </>
        )}

        {step === "preview" && (
          <>
            {/* Back + stats */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
              <button onClick={() => setStep("input")} style={{
                background: "transparent", border: "1px solid #0066cc",
                color: "#0066cc", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontSize: 13,
                fontFamily: "'DM Sans', sans-serif"
              }}>← Back</button>
              <Stat label="URLs" value={validURLs.length} accent />
              {chunks.length > 0 && <Stat label="Files" value={chunks.length} />}
              <div style={{ color: "#0066cc", fontSize: 13, fontFamily: "'Space Mono', monospace" }}>
                ✓ Sitemap ready
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
              {chunks.length > 1 ? (
                <button onClick={handleDownloadAll} style={{
                  background: "#0066cc", color: "#fff", border: "none", borderRadius: 10,
                  padding: "12px 28px", fontWeight: 800, fontSize: 14, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif"
                }}>
                  ↓ Download All {chunks.length} Sitemaps
                </button>
              ) : (
                <button onClick={handleDownload} style={{
                  background: "#0066cc", color: "#fff", border: "none", borderRadius: 10,
                  padding: "12px 28px", fontWeight: 800, fontSize: 14, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif"
                }}>
                  ↓ Download sitemap.xml
                </button>
              )}
              <button onClick={handleCopy} style={{
                background: copied ? "rgba(0,102,204,0.1)" : "transparent",
                border: "1px solid #0066cc",
                color: "#0066cc", borderRadius: 10,
                padding: "12px 24px", fontWeight: 600, fontSize: 14, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s"
              }}>
                {copied ? "✓ Copied!" : "Copy XML"}
              </button>
            </div>

            {/* XML Preview */}
            <div style={{
              background: "#f8f9fa", border: "1px solid rgba(0,102,204,0.2)",
              borderRadius: 12, overflow: "hidden"
            }}>
              <div style={{
                padding: "12px 18px", borderBottom: "1px solid rgba(0,102,204,0.15)",
                display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.03)"
              }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ffbd2e" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
                <span style={{ marginLeft: 8, fontSize: 12, color: "#0066cc", fontFamily: "'Space Mono', monospace" }}>sitemap.xml</span>
              </div>
              <textarea
                readOnly
                value={generated}
                style={{
                  width: "100%", height: 420, background: "transparent", border: "none",
                  color: "#004499", fontSize: 12, padding: "18px", resize: "vertical",
                  outline: "none", fontFamily: "'Space Mono', monospace", lineHeight: 1.7,
                  boxSizing: "border-box"
                }}
              />
            </div>
          </>
        )}

        {/* How to Use Guide */}
        <div style={{ marginTop: 64, borderTop: "1px solid rgba(0,102,204,0.15)", paddingTop: 48 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 32px", letterSpacing: -1, color: "#0066cc" }}>Step-by-step guide</h2>

          {[
            {
              num: "01",
              title: "Add your URLs",
              desc: "You have two ways to add URLs:",
              tips: [
                "Paste directly -> Click inside the text box and paste your URLs. Put each URL on its own line.",
                "Upload a file -> Click the file drop zone. Accepted formats: .txt or .csv with one URL per line."
              ],
              note: "You can paste 50,000+ URLs — no limit."
            },
            {
              num: "02",
              title: "Choose Change Frequency",
              desc: "Pick how often your pages are typically updated:",
              tips: [
                "Daily — News sites, blogs, or pages that change every day.",
                "Weekly — Regular content updates, product pages.",
                "Monthly — Service pages.",
                "Quarterly — Rarely-changing pages like About, Contact."
              ],
              note: "This tells search engines how often to recrawl your pages."
            },
            {
              num: "03",
              title: "Click Generate Sitemap",
              desc: "Hit the green button. The tool will:",
              tips: [
                "Validate every URL — broken ones are skipped automatically.",
                "Set priority 1.0 for your homepage and 0.9 for all other pages.",
                "Set today's date as the lastmod timestamp."
              ],
              note: null
            }
          ].map((step, i) => (
            <div key={i} style={{
              display: "flex", gap: 24, marginBottom: 36,
              padding: "24px 28px", background: "rgba(0,102,204,0.02)",
              border: "1px solid rgba(0,102,204,0.1)", borderRadius: 14
            }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 28, fontWeight: 700, color: "rgba(0,102,204,0.2)" }}>{step.num}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8, color: "#0066cc" }}>{step.title}</div>
                <div style={{ color: "#555", fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>{step.desc}</div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {step.tips.map((tip, j) => (
                    <li key={j} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 13, color: "#444", lineHeight: 1.6 }}>
                      <span style={{ color: "#0066cc", flexShrink: 0 }}>›</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(0,102,204,0.15)", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#555" }}>
            Tool by <span style={{ color: "#0066cc", fontWeight: 700 }}>Vidhi Shah</span>
          </div>
        </div>

      </div>
    </div>
  );
}

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
      borderRadius: "10px",
      padding: "14px 20px",
      minWidth: "110px",
      textAlign: "center"
    }}>
      <div style={{ fontSize: "26px", fontWeight: 800, color: "#0066cc", fontFamily: "monospace", letterSpacing: "-1px" }}>{value}</div>
      <div style={{ fontSize: "11px", color: "#555", marginTop: "2px", letterSpacing: "1px", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

export default function App() {
  const [rawInput, setRawInput] = useState("");
  const [freq, setFreq] = useState("weekly");
  const [generated, setGenerated] = useState("");
  const [errors, setErrors] = useState([]);
  const [step, setStep] = useState("input");
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

  // Resets the application state back to clean input
  const clearAllData = () => {
    setRawInput("");
    setGenerated("");
    setErrors([]);
    setStep("input");
    if (fileRef.current) fileRef.current.value = ""; // Clear file input element
  };

  const handleDownload = async () => {
    const blob = new Blob([generated], { type: "application/xml" });

    // Try using the modern system "Save As" picker first
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: 'sitemap.xml',
          types: [{
            description: 'XML Files',
            accept: { 'application/xml': ['.xml'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        
        // Success! Clear input data
        clearAllData();
        return;
      } catch (err) {
        // If user cancelled the window, don't clear data, just exit
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback if browser doesn't support native picker
    let customName = prompt("What would you like to name your file?", "sitemap.xml");
    if (customName === null) return; // User cancelled
    if (!customName.endsWith(".xml")) customName += ".xml";

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = customName;
    a.click();
    URL.revokeObjectURL(url);
    
    // Clear input data
    clearAllData();
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

  const chunks = [];
  if (validURLs.length > 50000) {
    for (let i = 0; i < validURLs.length; i += 50000) {
      chunks.push(validURLs.slice(i, i + 50000));
    }
  }

  const handleDownloadAll = async () => {
    let customBaseName = prompt("Enter a base name for your split sitemaps:", "sitemap");
    if (customBaseName === null) return; // User cancelled
    customBaseName = customBaseName.replace(".xml", "");

    for (let i = 0; i < chunks.length; i++) {
      const xml = buildSitemap(chunks[i], freq);
      const blob = new Blob([xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${customBaseName}-${i + 1}.xml`;
      a.click();
      URL.revokeObjectURL(url);
      // Small timeout delay so browser allows multiple downloads smoothly
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    
    // Clear input data
    clearAllData();
  };

  const selectStyle = {
    background: "#fff",
    border: "1px solid #0066cc",
    borderRadius: "8px",
    color: "#0066cc",
    padding: "9px 14px",
    fontSize: "14px",
    outline: "none",
    cursor: "pointer",
    fontFamily: "monospace"
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#ffffff",
      color: "#0066cc",
      fontFamily: "sans-serif",
      padding: "20px",
      boxSizing: "border-box"
    }}>
      <div style={{ maxWidth: "820px", margin: "0 auto", padding: "20px" }}>

        {/* Header */}
        <div style={{ marginBottom: "40px" }}>
          <h1 style={{ fontSize: "38px", fontWeight: 800, margin: 0, color: "#0066cc" }}>
            XML Sitemap Generator
          </h1>
          <p style={{ color: "#555", marginTop: "10px", fontSize: "15px" }}>
            Paste URLs, upload a file, or mix both. Auto-splits at 50k per sitemap.
          </p>
        </div>

        {step === "input" && (
          <>
            {/* Stats bar */}
            {urls.length > 0 && (
              <div style={{ display: "flex", gap: "12px", marginBottom: "28px" }}>
                <Stat label="Total" value={urls.length} />
                <Stat label="Valid" value={validURLs.length} accent />
              </div>
            )}

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current.click()}
              style={{
                border: "2px dashed #0066cc",
                borderRadius: "12px", padding: "20px", marginBottom: "16px", cursor: "pointer",
                background: dragOver ? "rgba(0,102,204,0.04)" : "#fafafa",
                color: "#0066cc", display: "flex", alignItems: "center", gap: "14px"
              }}>
              <span style={{ fontSize: "24px" }}>📂</span>
              <div>
                <div style={{ fontWeight: 600 }}>Upload file (.txt or .csv)</div>
              </div>
              <input ref={fileRef} type="file" accept=".txt,.csv" style={{ display: "none" }} onChange={handleFileInput} />
            </div>

            {/* Textarea */}
            <textarea
              value={rawInput}
              onChange={e => setRawInput(e.target.value)}
              placeholder="https://example.com/page-1"
              style={{
                width: "100%", minHeight: "200px", background: "#ffffff",
                border: "1px solid #0066cc", borderRadius: "12px",
                color: "#000", fontSize: "14px", padding: "15px",
                boxSizing: "border-box"
              }}
            />

            {/* Config row */}
            <div style={{ display: "flex", gap: "16px", marginTop: "20px", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span style={{ marginRight: "10px", fontSize: "14px" }}>Frequency:</span>
                <select value={freq} onChange={e => setFreq(e.target.value)} style={selectStyle}>
                  {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <button
                onClick={handleGenerate}
                disabled={validURLs.length === 0}
                style={{
                  background: validURLs.length === 0 ? "#ccc" : "#0066cc",
                  color: "#fff", border: "none", borderRadius: "8px", padding: "12px 24px",
                  fontWeight: "bold", cursor: validURLs.length === 0 ? "not-allowed" : "pointer"
                }}
              >
                Generate Sitemap
              </button>
            </div>
          </>
        )}

        {step === "preview" && (
          <>
            <div style={{ marginBottom: "20px" }}>
              <button onClick={() => setStep("input")} style={{
                background: "transparent", border: "1px solid #0066cc",
                color: "#0066cc", borderRadius: "6px", padding: "6px 14px", cursor: "pointer"
              }}>← Back</button>
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              {chunks.length > 1 ? (
                <button onClick={handleDownloadAll} style={{
                  background: "#0066cc", color: "#fff", border: "none", borderRadius: "8px",
                  padding: "12px 24px", fontWeight: "bold", cursor: "pointer"
                }}>
                  ↓ Download All Sitemaps
                </button>
              ) : (
                <button onClick={handleDownload} style={{
                  background: "#0066cc", color: "#fff", border: "none", borderRadius: "8px",
                  padding: "12px 24px", fontWeight: "bold", cursor: "pointer"
                }}>
                  ↓ Download sitemap.xml
                </button>
              )}
              <button onClick={handleCopy} style={{
                background: "transparent", border: "1px solid #0066cc", color: "#0066cc",
                borderRadius: "8px", padding: "12px 24px", fontWeight: "bold", cursor: "pointer"
              }}>
                {copied ? "✓ Copied!" : "Copy XML"}
              </button>
            </div>

            <textarea
              readOnly
              value={generated}
              style={{
                width: "100%", height: "350px", background: "#f8f9fa",
                border: "1px solid #ccc", padding: "15px", fontFamily: "monospace",
                boxSizing: "border-box"
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

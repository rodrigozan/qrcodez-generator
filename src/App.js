import { useState, useRef, useCallback } from "react";
import QRCode from "qrcode";
import "./App.css";

const TABS = [
  { id: "url", label: "URL", icon: "🔗" },
  { id: "text", label: "Texto", icon: "✏️" },
  { id: "contact", label: "Contato", icon: "👤" },
];

const DEFAULT_FORM = {
  url: { value: "", protocol: "https" },
  text: { value: "" },
  contact: { name: "", phone: "", email: "", org: "", title: "" },
};

function buildQRValue(tab, form) {
  if (tab === "url") {
    const urlData = form.url || { value: "", protocol: "https" };
    let val = urlData.value.trim();
    if (val && !/^https?:\/\//i.test(val)) val = urlData.protocol + "://" + val;
    else if (/^http:\/\//i.test(val) && urlData.protocol === "https") val = "https://" + val.replace(/^http:\/\//i, "");
    else if (/^https:\/\//i.test(val) && urlData.protocol === "http") val = "http://" + val.replace(/^https:\/\//i, "");
    return val;
  }
  if (tab === "text") return form.text.value.trim();
  if (tab === "contact") {
    const c = form.contact;
    const lines = ["BEGIN:VCARD", "VERSION:3.0"];
    if (c.name) lines.push("FN:" + c.name);
    if (c.org) lines.push("ORG:" + c.org);
    if (c.title) lines.push("TITLE:" + c.title);
    if (c.phone) lines.push("TEL;TYPE=CELL:" + c.phone);
    if (c.email) lines.push("EMAIL:" + c.email);
    lines.push("END:VCARD");
    return lines.join("\n");
  }
  return "";
}

export default function App() {
  const [tab, setTab] = useState("url");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [fgColor, setFgColor] = useState("#0f172a");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [size, setSize] = useState(300);
  const canvasRef = useRef(null);

  const updateField = (field, value) => {
    setForm((prev) => {
      if (tab === "contact") {
        return { ...prev, contact: { ...prev.contact, [field]: value } };
      }
      return { ...prev, [tab]: { ...prev[tab], [field]: value } };
    });
    setError("");
  };

  const generate = useCallback(async () => {
    const value = buildQRValue(tab, form);
    if (!value) {
      setError("Preencha pelo menos um campo.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const dataUrl = await QRCode.toDataURL(value, {
        width: size,
        margin: 2,
        color: { dark: fgColor, light: bgColor },
        errorCorrectionLevel: "H",
      });
      setQrDataUrl(dataUrl);
    } catch (e) {
      setError("Erro ao gerar QR Code: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [tab, form, fgColor, bgColor, size]);

  const download = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = "qrcode-" + tab + "-" + Date.now() + ".png";
    a.click();
  };

  const copyToClipboard = async () => {
    if (!qrDataUrl) return;
    try {
      const blob = await fetch(qrDataUrl).then((r) => r.blob());
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="app">
      <div className="noise" />
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">▦</span>
            <span className="logo-text">QR<em>gen</em></span>
          </div>
          <p className="tagline">Gere QR Codes permanentes · sem expiração · sem rastreamento</p>
        </div>
      </header>

      <main className="main">
        <div className="card">
          <div className="tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={"tab-btn" + (tab === t.id ? " active" : "")}
                onClick={() => {
                  setTab(t.id);
                  setQrDataUrl(null);
                  setError("");
                }}
              >
                <span className="tab-icon">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          <div className="form-section">
            {tab === "url" && (
              <div className="fields">
                <label className="field-label">Endereço Web</label>
                <div className="input-row">
                  <select
                    className="protocol-select"
                    value={(form.url?.protocol) || "https"}
                    onChange={(e) => updateField("protocol", e.target.value)}
                  >
                    <option value="https">https://</option>
                    <option value="http">http://</option>
                  </select>
                  <input
                    className="input"
                    placeholder="exemplo.com.br"
                    value={(form.url?.value || "").replace(/^https?:\/\//i, "")}
                    onChange={(e) => updateField("value", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && generate()}
                  />
                </div>
                <p className="hint">O QR Code abrirá diretamente a URL no navegador — sem passar por buscadores.</p>
              </div>
            )}

            {tab === "text" && (
              <div className="fields">
                <label className="field-label">Seu Texto</label>
                <textarea
                  className="textarea"
                  rows={5}
                  placeholder="Digite qualquer mensagem, endereço, código..."
                  value={form.text.value}
                  onChange={(e) => updateField("value", e.target.value)}
                />
              </div>
            )}

            {tab === "contact" && (
              <div className="fields contact-grid">
                <div className="field-group">
                  <label className="field-label">Nome Completo</label>
                  <input className="input" placeholder="João da Silva" value={form.contact.name} onChange={(e) => updateField("name", e.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label">Telefone / WhatsApp</label>
                  <input className="input" placeholder="+55 12 99999-0000" value={form.contact.phone} onChange={(e) => updateField("phone", e.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label">E-mail</label>
                  <input className="input" type="email" placeholder="joao@empresa.com" value={form.contact.email} onChange={(e) => updateField("email", e.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label">Empresa</label>
                  <input className="input" placeholder="Phanter AI" value={form.contact.org} onChange={(e) => updateField("org", e.target.value)} />
                </div>
                <div className="field-group span-2">
                  <label className="field-label">Cargo</label>
                  <input className="input" placeholder="Desenvolvedor Full-Stack" value={form.contact.title} onChange={(e) => updateField("title", e.target.value)} />
                </div>
              </div>
            )}

            <div className="options-row">
              <div className="option-group">
                <label className="field-label">Cor do QR</label>
                <div className="color-wrap">
                  <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="color-input" />
                  <span className="color-val">{fgColor}</span>
                </div>
              </div>
              <div className="option-group">
                <label className="field-label">Fundo</label>
                <div className="color-wrap">
                  <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="color-input" />
                  <span className="color-val">{bgColor}</span>
                </div>
              </div>
              <div className="option-group">
                <label className="field-label">Tamanho</label>
                <select className="select" value={size} onChange={(e) => setSize(Number(e.target.value))}>
                  <option value={200}>200 px</option>
                  <option value={300}>300 px</option>
                  <option value={500}>500 px</option>
                  <option value={800}>800 px</option>
                </select>
              </div>
            </div>

            {error && <p className="error">{error}</p>}

            <button className="generate-btn" onClick={generate} disabled={loading}>
              {loading ? <span className="spinner" /> : "▦ Gerar QR Code"}
            </button>
          </div>
        </div>

        {qrDataUrl && (
          <div className="result-card">
            <div className="qr-frame">
              <img src={qrDataUrl} alt="QR Code gerado" className="qr-img" />
            </div>
            <div className="result-actions">
              <button className="action-btn primary" onClick={download}>↓ Baixar PNG</button>
              <button className="action-btn secondary" onClick={copyToClipboard}>
                {copied ? "✓ Copiado!" : "⧉ Copiar Imagem"}
              </button>
            </div>
            <p className="result-note">Este QR Code não expira — o dado está gravado diretamente nele.</p>
          </div>
        )}
      </main>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <footer className="footer">
        <span>▦ QRgen · Phanter AI · {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}

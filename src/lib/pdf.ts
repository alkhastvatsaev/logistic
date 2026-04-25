import { jsPDF } from "jspdf";
import { FinancialTotals } from "./logic";

export interface PDFData {
  title: string;
  size: string;
  id: string;
  imageUrl?: string;
  sellingPrice: number;
  totals: FinancialTotals;
  status: string;
  goldColor?: string;
  stoneType?: string;
  weight?: string;
  goldPurity?: string;
  goldWeight?: string;
  diamondCount?: string;
  totalCarat?: string;
  stoneQuality?: string;
  engraving?: string;
}

/**
 * Generates an Ultra-Premium "LOGIS." Proposal.
 * Mirroring the "Titane 2030" app aesthetic.
 */
/**
 * Highly Robust Image Pre-processor for jsPDF
 * Converts external URLs to Base64 to bypass CORS issues on mobile.
 */
const getBase64Image = async (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.setAttribute('crossOrigin', 'anonymous');
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg"));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

export const generateQuotePDF = async (data: PDFData) => {
  // Bespoke Mobile Format: [Width, Height]
  const doc = new jsPDF({ unit: "mm", format: [105, 200] });
  
  // --- PAGE 1: THE EMOTIONAL CORE (Visual & Price) ---
  let y = 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(0);
  doc.text("LOGIS.", 12, y, { charSpace: -0.5 });
  
  doc.setFontSize(6);
  doc.setTextColor(160);
  doc.text("PROPOSITION EXCLUSIVE", 12, y + 5, { charSpace: 1 });

  y = 30;
  if (data.imageUrl) {
    try {
      const base64 = data.imageUrl.startsWith('data:') ? data.imageUrl : await getBase64Image(data.imageUrl);
      if (base64) {
        doc.setFillColor(252, 252, 252);
        doc.roundedRect(10, y, 85, 90, 12, 12, "F"); 
        const imgProps = doc.getImageProperties(base64);
        const maxWidth = 80;
        const maxHeight = 85;
        let ratio = Math.min(maxWidth / imgProps.width, maxHeight / imgProps.height);
        doc.addImage(base64, 'JPEG', (105 - (imgProps.width * ratio)) / 2, y + (90 - (imgProps.height * ratio)) / 2, imgProps.width * ratio, imgProps.height * ratio, undefined, 'FAST');
        y += 95;
      }
    } catch (e) { y += 10; }
  }

  doc.setFontSize(22);
  const titleLines = doc.splitTextToSize(data.title.toUpperCase(), 85);
  doc.text(titleLines, 12, y, { charSpace: -0.5 });
  
  // PRICE PILL (Page 1 Focal Point)
  doc.setFillColor(0);
  doc.roundedRect(10, 165, 85, 25, 12.5, 12.5, "F");
  doc.setFontSize(7);
  doc.setTextColor(255);
  doc.text("PRIX TOTAL LIVRÉ TTC", 22, 173, { charSpace: 1 });
  doc.setFontSize(24);
  const priceStr = Math.round(data.sellingPrice).toLocaleString('fr-FR').replace(/\s/g, '') + "€";
  doc.text(priceStr, 22, 185);

  // --- PAGE 2: THE TECHNICAL AUDIT ---
  doc.addPage([105, 200]);
  y = 18;
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text("AUDIT TECHNIQUE", 12, y, { charSpace: 1 });
  
  y += 10;
  doc.setDrawColor(240);
  doc.line(12, y, 93, y);
  y += 15;

  const addTechSpec = (label: string, value: string) => {
    doc.setFontSize(7);
    doc.setTextColor(180);
    doc.text(label, 12, y, { charSpace: 0.5 });
    y += 5;
    doc.setFontSize(12);
    doc.setTextColor(0);
    const lines = doc.splitTextToSize(String(value || "N/A").toUpperCase(), 80);
    doc.text(lines, 12, y);
    y += (lines.length * 6) + 8;
  };

  addTechSpec("MÉTAUX", `${data.goldPurity || '18K (750)'} ${data.goldColor || 'JAUNE'}`);
  addTechSpec("POIDS OR", `${data.goldWeight || data.weight || '?'}G`);
  addTechSpec("PIERRES", data.totalCarat ? `${data.totalCarat}CT ${data.stoneType || 'DIAMANTS'}` : "SANS PIERRE");
  addTechSpec("QUALITÉ", data.stoneQuality || "VVS DEF");
  addTechSpec("ID RÉFÉRENCE", data.id.toUpperCase());

  // Page 2 Footer
  doc.setFontSize(6);
  doc.setTextColor(200);
  doc.text("SYSTÈME LOGIS 2030 • AUTHENTICITÉ GARANTIE", 52.5, 190, { align: "center" });

  const safeTitle = data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`PROFIL_LOGIS_${safeTitle}.pdf`);
};

/**
 * Generates an Internal Performance Recap (The "Director's View").
 */
export const generateInternalInvoicePDF = async (data: PDFData) => {
  const doc = new jsPDF({ unit: "mm", format: [105, 200] });
  const blueAccent = [0, 68, 255];

  // --- PAGE 1: AUDIT SUMMARY ---
  let y = 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(0);
  doc.text("AUDIT FINANCIER", 12, y, { charSpace: -0.5 });
  
  doc.setFontSize(6);
  doc.setTextColor(150);
  doc.text(`SYSTÈME LOGIS • ${data.id.toUpperCase()}`, 12, y + 5, { charSpace: 0.5 });

  y = 30;
  if (data.imageUrl) {
    try {
      const base64 = data.imageUrl.startsWith('data:') ? data.imageUrl : await getBase64Image(data.imageUrl);
      if (base64) {
        doc.setFillColor(248, 248, 248);
        doc.roundedRect(10, y, 85, 50, 10, 10, "F");
        const imgProps = doc.getImageProperties(base64);
        const ratio = Math.min(45 / imgProps.width, 35 / imgProps.height);
        doc.addImage(base64, 'JPEG', (105 - (imgProps.width * ratio)) / 2, y + (50 - (imgProps.height * ratio)) / 2, imgProps.width * ratio, imgProps.height * ratio, undefined, 'FAST');
        y += 60;
      }
    } catch (e) { y += 10; }
  }

  doc.setFontSize(14);
  doc.setTextColor(0);
  const titleLines = doc.splitTextToSize(data.title.toUpperCase(), 85);
  doc.text(titleLines, 12, y, { charSpace: -0.5 });
  
  y += (titleLines.length * 6) + 10;

  // KEY PROFIT PILL
  doc.setFillColor(242, 248, 255);
  doc.roundedRect(10, y, 85, 25, 12.5, 12.5, "F");
  doc.setTextColor(blueAccent[0], blueAccent[1], blueAccent[2]);
  doc.setFontSize(8);
  doc.text("RENTABILITÉ NETTE", 22, y + 8, { charSpace: 0.5 });
  doc.setFontSize(22);
  doc.text(Math.round(data.totals.profit).toLocaleString('fr-FR') + " €", 22, y + 18);

  // --- PAGE 2: MARGIN STRUCTURE & SPLIT ---
  doc.addPage([105, 200]);
  y = 18;
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text("STRUCTURE DE MARGE", 12, y, { charSpace: 1 });
  
  y += 10;
  doc.setDrawColor(240);
  doc.line(12, y, 93, y);
  y += 15;

  const addAuditRow = (label: string, value: string, isBold = false, color = [0, 0, 0]) => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(8);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(label.toUpperCase(), 12, y);
    doc.text(value, 93, y, { align: "right" });
    y += 12;
  };

  const formatPrice = (n: number) => Math.round(n).toLocaleString('fr-FR') + " €";

  addAuditRow("Prix de Vente Client", formatPrice(data.sellingPrice), true);
  addAuditRow("Coût Acquisition Usine", `-${formatPrice(data.totals.itemCostEUR)}`, false, [150, 150, 150]);
  addAuditRow("Logistique & Transit", `-${formatPrice(data.totals.shippingEUR)}`, false, [150, 150, 150]);
  
  y += 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(0);
  doc.text("RÉPARTITION PARTENAIRES", 12, y, { charSpace: 1 });
  y += 10;

  addAuditRow("ADAM (Gestion Ops)", formatPrice(data.totals.adamPart), true, blueAccent);
  addAuditRow("MIRZA (Marketing)", formatPrice(data.totals.mirzaPart), true, blueAccent);

  // Footer Audit
  doc.setFontSize(5);
  doc.setTextColor(200);
  doc.text("LOGIS INTERNAL PROTOCOL • PRIVATE RECORD • NO SHARE", 52.5, 190, { align: "center" });

  const safeTitle = data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`AUDIT_LOGIS_${safeTitle}.pdf`);
};

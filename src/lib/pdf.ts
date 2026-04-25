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
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const blueAccent = [0, 68, 255];

  // 1. INTERNAL HEADER
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(0);
  doc.text("AUDIT FINANCIER", 25, 30, { charSpace: -0.8 });
  
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`PIÈCE UNIQUE : ${data.id.toUpperCase()}`, 25, 37, { charSpace: 0.5 });
  doc.text(`SYSTÈME LOGIS 2030 • GÉNÉRÉ LE ${new Date().toLocaleDateString('fr-FR')}`, 185, 30, { align: "right" });

  // 2. ASSET CORE
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(25, 45, 160, 45, 8, 8, "F");
  
  if (data.imageUrl) {
    try {
      const imgProps = doc.getImageProperties(data.imageUrl);
      const targetH = 35;
      const targetW = (imgProps.width * targetH) / imgProps.height;
      const finalW = Math.min(targetW, 45); // Max 45mm width
      doc.addImage(data.imageUrl, 'JPEG', 32, 50, finalW, targetH, undefined, 'FAST');
    } catch (e) {
      console.error("PDF Image Error", e);
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(data.title.toUpperCase(), 85, 60, { charSpace: -0.5 });
  
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const techSpecs = `OR: ${data.goldWeight || '?'}G (${data.goldPurity || '18K'}) • PIERRES: ${data.totalCarat || '?'}CT (${data.diamondCount || '0'} PCS) • ${data.stoneQuality || 'VVS'}`;
  doc.text(techSpecs, 85, 68, { charSpace: 0.1 });
  doc.setFontSize(7);
  doc.text(`GRAVURE : ${data.engraving || 'AUCUNE'}`, 85, 73, { charSpace: 0.2 });

  // 3. PERFORMANCE DATA
  let y = 110;
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("STRUCTURE DE MARGE", 25, y, { charSpace: 1 });
  
  y += 5;
  doc.setDrawColor(240, 240, 240);
  doc.line(25, y, 185, y);
  y += 12;

  const addDataRow = (label: string, value: string, isBold = false, color = [0, 0, 0]) => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(10);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(label.toUpperCase(), 25, y);
    doc.text(value, 185, y, { align: "right" });
    y += 12;
  };

  const formatPrice = (n: number) => Math.round(n).toLocaleString('fr-FR') + " €";

  addDataRow("Prix de Vente Client", formatPrice(data.sellingPrice), true);
  addDataRow("Coût Acquisition Usine", `-${formatPrice(data.totals.itemCostEUR)}`, false, [120, 120, 120]);
  addDataRow("Logistique & Transit", `-${formatPrice(data.totals.shippingEUR)}`, false, [120, 120, 120]);

  y += 4;
  doc.setFillColor(242, 248, 255);
  doc.roundedRect(25, y, 160, 16, 8, 8, "F");
  doc.setTextColor(blueAccent[0], blueAccent[1], blueAccent[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("RENTABILITÉ NETTE", 35, y + 10, { charSpace: 0.5 });
  doc.text(formatPrice(data.totals.profit), 175, y + 10, { align: "right" });

  // 4. THE SPLIT (50/50 PARTNERS)
  y += 32;
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("RÉPARTITION DES BÉNÉFICES", 25, y, { charSpace: 1 });
  y += 12;
  
  addDataRow("ADAM (Gestion Ops)", formatPrice(data.totals.adamPart), true, blueAccent);
  addDataRow("MIRZA (Marketing)", formatPrice(data.totals.mirzaPart), true, blueAccent);

  // 5. INTERNAL FOOTER
  doc.setFontSize(6.5);
  doc.setTextColor(200);
  doc.text("LOGIS INTERNAL PROTOCOL • PRIVATE RECORD • DO NOT SHARE", 105, 288, { align: "center", charSpace: 0.2 });

  const safeTitle = data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`AUDIT_LOGIS_${safeTitle}.pdf`);
};

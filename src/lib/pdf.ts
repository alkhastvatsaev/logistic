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
export const generateQuotePDF = async (data: PDFData) => {
  const doc = new jsPDF({ unit: "mm", format: [105, 220] });
  const blueAccent = [0, 68, 255]; 
  const fadedGray = [160, 160, 160];
  
  // 1. MOBILE HEADER
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(0, 0, 0);
  doc.text("LOGIS.", 12, 18, { charSpace: -0.5 });
  
  doc.setFontSize(6);
  doc.setTextColor(fadedGray[0], fadedGray[1], fadedGray[2]);
  doc.text("OFFRE TECHNIQUE DÉTAILLÉE", 12, 23, { charSpace: 1 });

  // 2. REF & DATE (VERY SMALL BUT PRESENT)
  doc.setFontSize(5); 
  doc.setTextColor(200);
  doc.text(`Réf: ${data.id.substring(0, 8).toUpperCase()}`, 93, 16, { align: "right" });
  doc.text(`${new Date().toLocaleDateString('fr-FR')}`, 93, 20, { align: "right" });

  // 3. HERO IMAGE
  if (data.imageUrl) {
    try {
      const imgProps = doc.getImageProperties(data.imageUrl);
      const maxWidth = 85;
      const maxHeight = 80;
      let ratio = Math.min(maxWidth / imgProps.width, maxHeight / imgProps.height);
      const imgW = imgProps.width * ratio;
      const imgH = imgProps.height * ratio;
      
      doc.setFillColor(252, 252, 252);
      doc.roundedRect(10, 30, 85, 80, 12, 12, "F"); 
      
      const xPos = (105 - imgW) / 2;
      const yPos = 30 + (80 - imgH) / 2;
      doc.addImage(data.imageUrl, 'JPEG', xPos, yPos, imgW, imgH, undefined, 'FAST');
    } catch (e) {}
  }

  // 4. TITLE
  let y = 125;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(0);
  doc.text(data.title.toUpperCase(), 12, y, { maxWidth: 85, charSpace: -0.5 });
  
  y += 18;
  doc.setDrawColor(245);
  doc.line(12, y - 5, 93, y - 5);
  
  // 5. DETAILED SPECS
  const drawMobileRow = (label: string, value: string, currentY: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(180);
    doc.text(label, 12, currentY, { charSpace: 0.5 });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(String(value || "N/A").toUpperCase(), 12, currentY + 7);
  };

  drawMobileRow("MÉTAUX PRÉCIEUX", `${data.goldPurity || '18K (750)'} ${data.goldColor || 'JAUNE'}`, y);
  y += 20;
  drawMobileRow("POIDS ESTIMÉ", `${data.goldWeight || data.weight || '?'}G`, y);
  y += 20;
  drawMobileRow("PIERRES ET DIAMANTS", data.totalCarat ? `${data.totalCarat}CT - ${data.stoneQuality || 'VVS DEF'}` : "SANS PIERRE", y);
  y += 20;
  drawMobileRow("LIVRAISON ET SERVICE", "ÉCRIN LUXE • CERTIFICAT • 15 JOURS", y);
  
  // 6. PRICE (NO SPACE TO AVOID SLASH CONFUSION)
  y = 205;
  doc.setFillColor(0, 0, 0);
  doc.roundedRect(10, y - 15, 85, 26, 13, 13, "F"); 
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("PRIX TOTAL LIVRÉ TTC", 20, y - 5, { charSpace: 1 });
  doc.setFontSize(22);
  // We use replace to remove the non-breaking space that might look like a slash on some devices
  const priceStr = Math.round(data.sellingPrice).toLocaleString('fr-FR').replace(/\s/g, '') + "€";
  doc.text(priceStr, 20, y + 6);

  const safeTitle = data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`DEVIS_LOGIS_${safeTitle}.pdf`);
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

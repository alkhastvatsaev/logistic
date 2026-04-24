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
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const blueAccent = [0, 68, 255]; 
  const fadedGray = [160, 160, 160];
  
  // 1. TITANE HEADER
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(0, 0, 0);
  doc.text("LOGIS.", 25, 25, { charSpace: -0.8 });
  
  doc.setFontSize(6.5);
  doc.setTextColor(fadedGray[0], fadedGray[1], fadedGray[2]);
  doc.text("L O G I S T I Q U E   &   S O U R C I N G", 25, 31, { charSpace: 0.8 });

  doc.setFontSize(8);
  doc.text(`${data.id.toUpperCase().substring(0, 8)}`, 185, 25, { align: "right" });
  doc.text(`${new Date().toLocaleDateString('fr-FR')}`, 185, 30, { align: "right" });

  // 2. IMMERSIVE PRODUCT HERO
  if (data.imageUrl) {
    try {
      const imgProps = doc.getImageProperties(data.imageUrl);
      const maxWidth = 140;
      const maxHeight = 80;
      let ratio = Math.min(maxWidth / imgProps.width, maxHeight / imgProps.height);
      const imgW = imgProps.width * ratio;
      const imgH = imgProps.height * ratio;
      
      doc.setFillColor(254, 254, 254);
      doc.roundedRect(25, 45, 160, 90, 8, 8, "F"); 
      
      const xPos = (210 - imgW) / 2;
      const yPos = 45 + (90 - imgH) / 2;
      doc.addImage(data.imageUrl, 'JPEG', xPos, yPos, imgW, imgH, undefined, 'FAST');
    } catch (e) {}
  }

  // 3. TECHNICAL ARCHITECTURE
  let y = 150;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(0);
  doc.text(data.title.toUpperCase(), 25, y, { charSpace: -0.5 });
  
  y += 10;
  doc.setFontSize(7.5);
  doc.setTextColor(blueAccent[0], blueAccent[1], blueAccent[2]);
  doc.text("SPÉCIFICATIONS TECHNIQUES", 25, y, { charSpace: 1.5 });
  
  y += 4;
  doc.setDrawColor(240);
  doc.line(25, y, 185, y);
  
  y += 12;
  const drawRow = (label: string, value: string, xPos: number, currentY: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(160);
    doc.text(label, xPos, currentY, { charSpace: 0.5 });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(0);
    doc.text(String(value || "N/A").toUpperCase(), xPos, currentY + 7);
  };

  drawRow("MÉTAL & PURETÉ", `${data.goldPurity || 'OR 18K'} - ${data.goldColor || 'JAUNE'}`, 25, y);
  drawRow("QUALITÉ PIERRES", data.stoneQuality || (data.stoneType === "Sans Pierre" ? "AUCUNE" : "VVS / DEF"), 110, y);
  
  y += 18;
  drawRow("POIDS MÉTAL (G)", data.goldWeight ? `${data.goldWeight}g` : (data.weight || "N/A"), 25, y);
  drawRow("TOTAL CARATS", data.totalCarat ? `${data.totalCarat}ct (${data.diamondCount || 0} pces)` : "SUR DEVIS", 110, y);

  // 4. INCLUSIONS
  y += 24;
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(25, y, 160, 15, 7.5, 7.5, "F");
  doc.setFontSize(7);
  doc.setTextColor(180);
  doc.text(`LIVRÉ AVEC : ÉCRIN LUXE ET CERTIFICAT LOGIS. • GRAVURE : ${data.engraving || 'AUCUNE'}`, 105, y + 8.5, { align: "center", charSpace: 0.1 });

  // 5. TOTAL
  y += 25;
  doc.setFillColor(0, 0, 0);
  doc.roundedRect(25, y, 160, 36, 12, 12, "F"); 
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("PRIX TOTAL TTC LIVRÉ", 45, y + 12, { charSpace: 1 });
  doc.setFontSize(28);
  const priceStr = Math.round(data.sellingPrice).toLocaleString('fr-FR') + " €";
  doc.text(priceStr, 45, y + 26);

  // 6. MINIMAL FOOTER
  doc.setFontSize(7);
  doc.setTextColor(200);
  doc.text("PRODUCTION: 15-20D • INSURED WORLDWIDE SHIPPING • CC 2030 LOGIS.", 105, 288, { align: "center", charSpace: 0.5 });

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

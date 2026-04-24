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
      const maxWidth = 120;
      const maxHeight = 75;
      let imgWidth = imgProps.width;
      let imgHeight = imgProps.height;
      const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
      imgWidth = imgWidth * ratio;
      imgHeight = imgHeight * ratio;
      
      doc.setFillColor(252, 252, 252);
      doc.roundedRect(25, 45, 160, 85, 12, 12, "F"); 
      
      const xPos = (210 - imgWidth) / 2;
      doc.addImage(data.imageUrl, 'JPEG', xPos, 50, imgWidth, imgHeight, undefined, 'FAST');
    } catch (e) {}
  }

  // 3. TECHNICAL ARCHITECTURE
  let y = 145;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(0);
  doc.text(data.title.toUpperCase(), 25, y, { charSpace: -0.5 });
  
  y += 10;
  doc.setFontSize(7.5);
  doc.setTextColor(blueAccent[0], blueAccent[1], blueAccent[2]);
  doc.text("SPÉCIFICATIONS TECHNIQUES", 25, y, { charSpace: 2 });
  
  y += 4;
  doc.setDrawColor(245);
  doc.line(25, y, 185, y);
  
  y += 12;
  const drawRow = (label: string, value: string, xPos: number, currentY: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(200);
    doc.text(label, xPos, currentY, { charSpace: 0.5 });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(String(value || "N/A").toUpperCase(), xPos, currentY + 7, { charSpace: -0.3 });
  };

  drawRow("MÉTAL & ORIGINE", `OR 18K - ${data.goldColor || 'JAUNE'}`, 25, y);
  drawRow("QUALITÉ PIERRES", data.stoneType === "Sans Pierre" ? "AUCUNE" : "DEF - VVS1 (TYPE IIA)", 110, y);
  
  y += 18;
  drawRow("TAILLE / DIMENSION", data.size || "SUR MESURE", 25, y);
  drawRow("POIDS ESTIMÉ", data.weight ? `${data.weight}` : "SUR DEVIS", 110, y);

  // 4. INCLUSIONS PILL
  y += 24;
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(25, y, 160, 12, 6, 6, "F");
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(180);
  doc.text("LIVRÉ AVEC : ÉCRIN LUXE ET CERTIFICAT D'AUTHENTICITÉ LOGIS.", 105, y + 7.5, { align: "center", charSpace: 0.5 });

  // 5. TOTAL PILL
  y += 26;
  doc.setFillColor(0, 0, 0);
  doc.roundedRect(25, y, 160, 36, 18, 18, "F"); 
  
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("PRIX TOTAL TTC LIVRÉ", 45, y + 12, { charSpace: 1.5 });
  
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  const priceStr = data.sellingPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " €";
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
  doc.setFillColor(252, 252, 252);
  doc.roundedRect(25, 45, 160, 45, 10, 10, "F");
  
  if (data.imageUrl) {
    try {
      doc.addImage(data.imageUrl, 'JPEG', 32, 50, 45, 35, undefined, 'FAST');
    } catch (e) {}
  }

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(data.title.toUpperCase(), 85, 60, { charSpace: -0.5 });
  
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`CONFIG: OR 18K • ${data.goldColor || 'JAUNE'} • ${data.size || 'STD'}`, 85, 68, { charSpace: 0.5 });

  // 3. PERFORMANCE DATA
  let y = 110;
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("STRUCTURE DE MARGE", 25, y, { charSpace: 1 });
  
  y += 5;
  doc.setDrawColor(245);
  doc.line(25, y, 185, y);
  y += 10;

  const addDataRow = (label: string, value: string, isBold = false, color = [0, 0, 0]) => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(10);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(label, 25, y, { charSpace: isBold ? -0.2 : 0 });
    doc.text(value, 185, y, { align: "right" });
    y += 10;
  };

  addDataRow("Prix de Vente Total", `${data.sellingPrice.toLocaleString()} €`, true);
  addDataRow("Acquisition Usine", `-${data.totals.costEUR.toLocaleString()} €`, false, [150, 150, 150]);
  addDataRow("Services Logistiques", `-${data.totals.shippingEUR.toLocaleString()} €`, false, [150, 150, 150]);

  y += 5;
  doc.setFillColor(242, 248, 255);
  doc.roundedRect(25, y, 160, 14, 7, 7, "F");
  doc.setTextColor(blueAccent[0], blueAccent[1], blueAccent[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("RENTABILITÉ NETTE", 35, y + 9, { charSpace: 0.5 });
  doc.text(`${data.totals.profit.toLocaleString()} €`, 175, y + 9, { align: "right" });

  // 4. THE SPLIT (50/50 PARTNERS)
  y += 30;
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("RÉPARTITION PARTENAIRES", 25, y, { charSpace: 1 });
  y += 12;
  
  addDataRow("ADAM (Gestion & Ops)", `${data.totals.adamPart.toLocaleString()} €`, true);
  addDataRow("MIRZA (Client & Apport)", `${data.totals.mirzaPart.toLocaleString()} €`, true);

  // 5. INTERNAL FOOTER
  doc.setFontSize(6.5);
  doc.setTextColor(200);
  doc.text("LOGIS INTERNAL PROTOCOL • PRIVATE RECORD • DO NOT SHARE", 105, 288, { align: "center", charSpace: 0.2 });

  const safeTitle = data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`AUDIT_LOGIS_${safeTitle}.pdf`);
};

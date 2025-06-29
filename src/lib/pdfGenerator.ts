// src/lib/pdfGenerator.ts

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DocumentData, Timestamp } from 'firebase/firestore';

interface PdfOptions {
  familyName: string;
  babyName: string;
  startDate?: string;
  endDate?: string;
}

// 輔助函數：將日期物件轉為 YYYY/MM/DD 格式
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}/${month}/${day}`;
};

// 主匯出函數
export const generatePhotoWallPdf = async (
  photos: DocumentData[],
  options: PdfOptions
) => {
  // A4 尺寸 (寬 210mm, 高 297mm)
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;

  // --- 1. 繪製封面 ---
  pdf.setFillColor(243, 244, 246); // bg-gray-100
  pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
  pdf.setFont('heiti', 'bold'); // 需確保 jsPDF 支援中文字體，此處為示意
  pdf.setFontSize(28);
  pdf.text('我們的照片回憶錄', pdfWidth / 2, pdfHeight / 2 - 20, { align: 'center' });
  pdf.setFontSize(18);
  pdf.text(options.babyName, pdfWidth / 2, pdfHeight / 2, { align: 'center' });
  pdf.setFont('heiti', 'normal');
  pdf.setFontSize(12);
  if (options.startDate && options.endDate) {
    pdf.text(`${options.startDate} - ${options.endDate}`, pdfWidth / 2, pdfHeight / 2 + 10, { align: 'center' });
  }
  pdf.text(`由 ${options.familyName} 製作`, pdfWidth / 2, pdfHeight - 20, { align: 'center' });


  // --- 2. 繪製照片內容頁 ---
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    pdf.addPage();

    // 建立一個暫時的、符合 PDF 版面的 HTML 元素用於渲染
    const photoContainer = document.createElement('div');
    photoContainer.style.width = '180mm'; // pdfWidth - margin * 2
    photoContainer.style.padding = '10px';
    photoContainer.style.backgroundColor = 'white';
    photoContainer.style.position = 'absolute';
    photoContainer.style.left = '-9999px'; // 移出畫面外

    const img = document.createElement('img');
    img.crossOrigin = 'anonymous'; // 關鍵：處理 CORS 問題
    img.src = photo.imageUrl;
    img.style.width = '100%';
    img.style.height = 'auto';
    img.style.marginBottom = '10px';

    const date = (photo.timestamp as Timestamp).toDate();
    const dateText = document.createElement('p');
    dateText.innerText = formatDate(date);
    dateText.style.fontSize = '12px';
    dateText.style.color = '#6b7280'; // text-gray-500
    dateText.style.textAlign = 'center';

    const notesText = document.createElement('p');
    notesText.innerText = photo.notes || '';
    notesText.style.fontSize = '14px';
    notesText.style.color = '#1f2937'; // text-gray-800
    notesText.style.marginTop = '5px';
    notesText.style.textAlign = 'center';

    photoContainer.appendChild(img);
    photoContainer.appendChild(dateText);
    photoContainer.appendChild(notesText);
    document.body.appendChild(photoContainer);

    // 使用 html2canvas 將該元素轉為圖片
    const canvas = await html2canvas(photoContainer, {
      useCORS: true, // 允許載入跨域圖片
      scale: 2, // 提高解析度
    });
    
    document.body.removeChild(photoContainer); // 移除暫時元素

    const imgData = canvas.toDataURL('image/jpeg', 0.8);
    
    // 計算圖片在 PDF 中的尺寸
    const imgProps = pdf.getImageProperties(imgData);
    const imgHeight = (imgProps.height * (pdfWidth - margin * 2)) / imgProps.width;
    const yPos = (pdfHeight - imgHeight) / 2; // 置中

    pdf.addImage(imgData, 'JPEG', margin, yPos, pdfWidth - margin * 2, imgHeight);
  }

  // --- 3. 繪製封底 ---
  pdf.addPage();
  pdf.setFillColor(243, 244, 246); // bg-gray-100
  pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
  pdf.setFont('heiti', 'bold');
  pdf.setFontSize(24);
  pdf.text('The End', pdfWidth / 2, pdfHeight / 2, { align: 'center' });
  pdf.setFont('heiti', 'normal');
  pdf.setFontSize(12);
  pdf.text('Babix App - 紀錄寶寶的每個成長瞬間', pdfWidth / 2, pdfHeight - 20, { align: 'center' });


  // --- 4. 儲存 PDF ---
  pdf.save('照片牆回憶錄.pdf');
};
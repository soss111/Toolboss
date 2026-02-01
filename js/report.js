// report.js - provides generatePDFReport and preview/download wiring
(function(){
  // store last generated PDF blob and object URL
  let lastPdfBlob = null;
  let lastPdfUrl = null;

  async function generatePDFReport(opts = { preview: true, download: false }) {
    const { preview, download } = opts;

    // build printable DOM from page-level builder (expected to be defined in index.html)
    if (typeof buildPrintableReport !== 'function') {
      throw new Error('buildPrintableReport() not found on page');
    }

    const reportEl = buildPrintableReport();
    // ensure it's not visible and safe for rendering
    reportEl.style.position = 'absolute';
    reportEl.style.left = '-9999px';
    reportEl.style.top = '0';
    document.body.appendChild(reportEl);

    // Use html2canvas to render the element to canvas
    const scale = Math.min(2, window.devicePixelRatio || 1);
    const canvas = await html2canvas(reportEl, { scale: scale, useCORS: true, backgroundColor: '#ffffff' });

    // Create image data
    const imgData = canvas.toDataURL('image/png');

    // Create PDF using jsPDF (from UMD bundle)
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
      // try alternate location
      if (window.jsPDF) {
        // older CDN
      } else {
        document.body.removeChild(reportEl);
        throw new Error('jsPDF not available');
      }
    }

    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = 210; // mm for A4
    // compute image size in mm
    const pxPerMm = canvas.width / (pageWidth * (window.devicePixelRatio || 1));
    const imgWidthMm = pageWidth;
    const imgHeightMm = canvas.height / pxPerMm;

    // If content fits single page height, add directly, else scale to fit height
    const pageHeightMm = 297;
    if (imgHeightMm <= pageHeightMm) {
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidthMm, imgHeightMm);
    } else {
      // scale down to fit single page height (simple fallback)
      const scaleFactor = pageHeightMm / imgHeightMm;
      const newImgW = imgWidthMm * scaleFactor;
      const newImgH = imgHeightMm * scaleFactor;
      pdf.addImage(imgData, 'PNG', 0, 0, newImgW, newImgH);
    }

    const blob = pdf.output('blob');

    // cleanup temporary element
    document.body.removeChild(reportEl);

    // store blob and url for preview/download
    if (lastPdfUrl) {
      URL.revokeObjectURL(lastPdfUrl);
      lastPdfUrl = null;
    }
    lastPdfBlob = blob;
    lastPdfUrl = URL.createObjectURL(blob);

    if (preview) {
      const frame = document.getElementById('pdfPreviewFrame');
      const modal = document.getElementById('pdfPreviewModal');
      if (frame && modal) {
        frame.src = lastPdfUrl;
        modal.style.display = 'flex';
      } else {
        // fallback: open in new tab
        window.open(lastPdfUrl, '_blank');
      }
    }

    if (download) {
      // trigger download via anchor
      const a = document.createElement('a');
      a.href = lastPdfUrl;
      a.download = 'Venten_Report.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    return blob;
  }

  // Expose globally
  window.generatePDFReport = generatePDFReport;

  // wire preview modal buttons
  document.addEventListener('DOMContentLoaded', function() {
    const closeBtn = document.getElementById('closePdfPreview');
    const downloadBtn = document.getElementById('downloadPdfBtn');
    const modal = document.getElementById('pdfPreviewModal');
    const frame = document.getElementById('pdfPreviewFrame');

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
        if (frame) {
          // clear src and revoke url
          frame.src = '';
        }
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', function() {
        if (lastPdfUrl) {
          const a = document.createElement('a');
          a.href = lastPdfUrl;
          a.download = 'Venten_Report.pdf';
          document.body.appendChild(a);
          a.click();
          a.remove();
        } else {
          // Generate and download if not present
          generatePDFReport({ preview: false, download: true }).catch(err => console.error(err));
        }
      });
    }

    // close modal when clicking outside content
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          modal.style.display = 'none';
          if (frame) frame.src = '';
        }
      });
    }
  });
})();

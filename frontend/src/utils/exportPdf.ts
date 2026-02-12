/**
 * PDF Report Export — uses browser's print dialog as PDF generator.
 * This avoids heavy dependencies like jsPDF while providing good output.
 */
export function exportPdf(title = "Restaurant Simulation Report") {
    // Create a styled print view
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
        alert("Pop-up blocked — please allow pop-ups for PDF export.");
        return;
    }

    // Grab the main content area
    const mainContent = document.querySelector("main");
    if (!mainContent) return;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; color: #0F232E; padding: 32px; font-size: 12px; line-height: 1.5; }
        h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
        h2 { font-size: 14px; font-weight: 600; margin-top: 16px; margin-bottom: 8px; }
        .header { border-bottom: 2px solid #0000FF; padding-bottom: 12px; margin-bottom: 20px; }
        .meta { color: #9BAAB9; font-size: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th { background: #f0f3f6; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #9BAAB9; }
        td { padding: 6px 8px; border-top: 1px solid #e8edf2; }
        .card { border: 1px solid #e8edf2; border-radius: 8px; padding: 12px; margin: 8px 0; }
        .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .kpi { padding: 8px; border: 1px solid #e8edf2; border-radius: 6px; }
        .kpi-label { font-size: 9px; color: #9BAAB9; text-transform: uppercase; letter-spacing: 0.5px; }
        .kpi-value { font-size: 16px; font-weight: 700; }
        @media print { body { padding: 0; } @page { margin: 1cm; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        <div class="meta">Generated ${new Date().toLocaleDateString("cs-CZ")} ${new Date().toLocaleTimeString("cs-CZ")} · Restaurant Simulation Dashboard</div>
    </div>
    ${mainContent.innerHTML}
    <script>
        // Remove interactive elements
        document.querySelectorAll('button, input, select, textarea, [role="dialog"], nav').forEach(el => el.remove());
        // Auto-print
        setTimeout(() => { window.print(); }, 500);
    </script>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
}

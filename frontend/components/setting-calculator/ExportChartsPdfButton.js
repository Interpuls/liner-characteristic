import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Textarea,
  VStack,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { getSettingInputFields } from "../../lib/settingCalculator";
import { Chart as ChartJS } from "chart.js";

function getCanvasDataFromContainer(containerRef, title) {
  const container = containerRef?.current;
  const canvas = container?.querySelector?.("canvas");
  if (!canvas) return null;
  const chart = ChartJS.getChart(canvas);
  if (chart) {
    try {
      chart.setActiveElements([]);
      if (chart.tooltip?.setActiveElements) {
        chart.tooltip.setActiveElements([], { x: 0, y: 0 });
      }
      chart.update("none");
    } catch {}
  }
  return { title, dataUrl: canvas.toDataURL("image/png", 1.0) };
}

function formatCellValue(v) {
  if (v == null || v === "") return "-";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function firstNotesParagraph(notes) {
  if (!notes) return "";
  return String(notes)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find(Boolean) || "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function ExportChartsPdfButton({
  runData,
  chartRefs,
  unitSystem = "metric",
  showTrigger = true,
  onRegisterOpen,
  onCaptureModeChange,
}) {
  const [exportTitle, setExportTitle] = useState("");
  const [exportNotes, setExportNotes] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const modal = useDisclosure();
  const toast = useToast();

  const openModal = useCallback(() => {
    const defaultTitle = `Setting Calculator Report`;
    setExportTitle(defaultTitle);
    setExportNotes("");
    modal.onOpen();
  }, [modal]);

  useEffect(() => {
    if (!onRegisterOpen) return undefined;
    onRegisterOpen(() => openModal);
    return () => onRegisterOpen(null);
  }, [onRegisterOpen, openModal]);

  const reportData = useMemo(() => {
    const reportTitle = (exportTitle || "Setting Calculator Report").trim();
    const notesParagraph = firstNotesParagraph(exportNotes);
    const generatedAt = new Date().toLocaleString();
    const leftLabel = runData?.leftProduct?.label || "Left";
    const rightLabel = runData?.rightProduct?.label || "Right";
    const leftTeatSize = runData?.leftProduct?.sizeLabel || "";
    const rightTeatSize = runData?.rightProduct?.sizeLabel || "";
    const fields = getSettingInputFields(unitSystem);
    const left = runData?.response?.left?.inputsUsed || {};
    const right = runData?.response?.right?.inputsUsed || {};
    const inputRows = fields.map((f) => ({
      key: f.key,
      label: `${f.label}${f.unit ? ` (${f.unit})` : ""}`,
      left: formatCellValue(left?.[f.key]),
      right: formatCellValue(right?.[f.key]),
    }));
    return {
      reportTitle,
      notesParagraph,
      generatedAt,
      leftLabel,
      rightLabel,
      leftTeatSize,
      rightTeatSize,
      inputRows,
    };
  }, [exportTitle, exportNotes, runData, unitSystem]);

  const collectCharts = () => {
    const charts = [
      getCanvasDataFromContainer(chartRefs?.pulsationRef, "Pulsation Chart"),
      getCanvasDataFromContainer(chartRefs?.phasesRef, "Pulsator Phases"),
      getCanvasDataFromContainer(chartRefs?.realMilkingRef, "Real Milking / Real OFF"),
      getCanvasDataFromContainer(chartRefs?.appliedVacuumRef, "Applied Vacuum Difference"),
      getCanvasDataFromContainer(chartRefs?.massageIntensityRef, "Massage Intensity Difference"),
    ];
    return charts.every(Boolean) ? charts : null;
  };

  const waitForChartsStable = async () => {
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
    await new Promise((resolve) => setTimeout(resolve, 80));
  };

  const handleExportPdf = async () => {
    if (!runData) return;
    setIsExporting(true);
    try {
      if (onCaptureModeChange) {
        onCaptureModeChange(true);
        await waitForChartsStable();
      }
      const charts = collectCharts();
      if (!charts) {
        toast({
          status: "warning",
          title: "Charts not ready",
          description: "Please wait for all charts to render, then retry export.",
        });
        return;
      }

      const section2 = charts.slice(0, 3);
      const section3 = charts.slice(3);
      const logoUrl = `${window.location.origin}/logolinerlens.png`;

      const rowsHtml = reportData.inputRows
        .map(
          (row) => `
            <tr>
              <td>${escapeHtml(row.label)}</td>
              <td>${escapeHtml(row.left)}</td>
              <td>${escapeHtml(row.right)}</td>
            </tr>
          `
        )
        .join("");

      const chartsSection2Html = section2
        .map(
          (chart) => `
            <article class="pdf-chart-card">
              <h3 class="pdf-chart-title">${escapeHtml(chart.title)}</h3>
              <img src="${chart.dataUrl}" alt="${escapeHtml(chart.title)}" />
            </article>
          `
        )
        .join("");

      const chartsSection3Html = section3
        .map(
          (chart) => `
            <article class="pdf-chart-card pdf-chart-card--compact">
              <h3 class="pdf-chart-title">${escapeHtml(chart.title)}</h3>
              <img src="${chart.dataUrl}" alt="${escapeHtml(chart.title)}" />
            </article>
          `
        )
        .join("");

      const templateWidth = 720;
      const html = `
        <div id="sc-pdf-root">
          <style>
            #sc-pdf-root, #sc-pdf-root * {
              box-sizing: border-box;
            }
            #sc-pdf-root {
              width: ${templateWidth}px;
              font-family: Arial, Helvetica, sans-serif;
              color: #0f172a;
              background: #ffffff;
              padding: 8px 16px 16px 16px;
              box-sizing: border-box;
              overflow: hidden;
            }
            .pdf-logo {
              width: 210px;
              max-width: 210px;
              height: auto;
              object-fit: contain;
              display: block;
              margin-top: -4px;
              margin-bottom: 12px;
            }
            .pdf-title {
              margin: 0;
              font-size: 30px;
              line-height: 1.2;
              color: #12305f;
              font-weight: 800;
            }
            .pdf-meta {
              margin-top: 10px;
              font-size: 14px;
              color: #334155;
            }
            .pdf-notes-block {
              margin-top: 14px;
            }
            .pdf-notes-label {
              margin: 0 0 6px 0;
              font-size: 12px;
              font-weight: 700;
              color: #475569;
            }
            .pdf-notes {
              margin-top: 0;
              padding: 0 12px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              font-size: 13px;
              color: #334155;
              min-height: 64px;
              display: flex;
              align-items: center;
            }
            .pdf-notes-text {
              width: 100%;
              line-height: 1.4;
            }
            .pdf-section-title {
              margin: 22px 0 24px 0;
              color: #12305f;
              font-size: 20px;
              font-weight: 700;
            }
            .pdf-section-content {
              margin-top: 0;
            }
            .pdf-inputs-table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid #cbd5e1;
              font-size: 12px;
              table-layout: fixed;
            }
            .pdf-inputs-table th:nth-child(1),
            .pdf-inputs-table td:nth-child(1) { width: 46%; }
            .pdf-inputs-table th:nth-child(2),
            .pdf-inputs-table td:nth-child(2) { width: 27%; }
            .pdf-inputs-table th:nth-child(3),
            .pdf-inputs-table td:nth-child(3) { width: 27%; }
            .pdf-inputs-table thead th {
              background: #eff6ff;
              color: #12305f;
              font-weight: 700;
              border: 1px solid #cbd5e1;
              padding: 8px 10px;
              text-align: left;
              word-break: break-word;
            }
            .pdf-col-main {
              display: block;
              line-height: 1.2;
            }
            .pdf-col-sub {
              display: block;
              margin-top: 2px;
              font-size: 10px;
              font-weight: 600;
              color: #64748b;
              line-height: 1.2;
            }
            .pdf-inputs-table td {
              border: 1px solid #e2e8f0;
              padding: 7px 10px;
              vertical-align: top;
              word-break: break-word;
              overflow-wrap: anywhere;
            }
            .pdf-inputs-table tbody tr:nth-child(even) td {
              background: #f8fafc;
            }
            .pdf-hard-break {
              page-break-before: always;
              break-before: page;
              height: 0;
              margin: 0;
              padding: 0;
            }
            .pdf-hard-break + section {
              padding-top: 6px;
            }
            .pdf-hard-break + section .pdf-section-title {
              margin-top: 0;
            }
            .pdf-chart-card {
              margin: 0 0 14px 0;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              background: #ffffff;
              padding: 10px;
              overflow: hidden;
            }
            .pdf-chart-card--compact {
              width: 78%;
              margin-left: auto;
              margin-right: auto;
            }
            .pdf-chart-title {
              margin: 0 0 8px 0;
              font-size: 14px;
              font-weight: 700;
              color: #334155;
            }
            .pdf-chart-card img {
              width: 100%;
              max-width: 100%;
              height: auto;
              display: block;
              border-radius: 6px;
              border: 1px solid #f1f5f9;
              object-fit: contain;
            }
            .pdf-chart-card--compact img {
              max-height: 220px;
            }
            .pdf-report-footer {
              margin-top: 12px;
              padding: 10px 12px;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              background: #f1f5f9;
              color: #64748b;
              font-size: 11px;
              line-height: 1.45;
              page-break-inside: avoid;
              break-inside: avoid;
            }
          </style>

          <header>
            <img class="pdf-logo" src="${logoUrl}" alt="LinerLens logo" />
            <h1 class="pdf-title">${escapeHtml(reportData.reportTitle)}</h1>
            <div class="pdf-meta">Generated at: ${escapeHtml(reportData.generatedAt)}</div>
            ${
              reportData.notesParagraph
                ? `<div class="pdf-notes-block">
                    <p class="pdf-notes-label">Notes</p>
                    <div class="pdf-notes">
                      <div class="pdf-notes-text">${escapeHtml(reportData.notesParagraph)}</div>
                    </div>
                  </div>`
                : ""
            }
          </header>

          <section>
            <h2 class="pdf-section-title">1. Input parameters</h2>
            <div class="pdf-section-content">
              <table class="pdf-inputs-table">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>
                      <span class="pdf-col-main">${escapeHtml(reportData.leftLabel)}</span>
                      ${
                        reportData.leftTeatSize
                          ? `<span class="pdf-col-sub">Teat size: ${escapeHtml(reportData.leftTeatSize)}</span>`
                          : ""
                      }
                    </th>
                    <th>
                      <span class="pdf-col-main">${escapeHtml(reportData.rightLabel)}</span>
                      ${
                        reportData.rightTeatSize
                          ? `<span class="pdf-col-sub">Teat size: ${escapeHtml(reportData.rightTeatSize)}</span>`
                          : ""
                      }
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>
          </section>

          <div class="pdf-hard-break"></div>
          <section>
            <h2 class="pdf-section-title">2. Pulsation charts</h2>
            <div class="pdf-section-content">
              ${chartsSection2Html}
            </div>
          </section>

          <div class="pdf-hard-break"></div>
          <section>
            <h2 class="pdf-section-title">3. Percentage differences</h2>
            <div class="pdf-section-content">
              ${chartsSection3Html}
            </div>
          </section>

          <footer class="pdf-report-footer">
            This report was generated by MI LinerLens. All content is confidential and intended solely for the authorized recipient.
            Reproduction, distribution, or disclosure without prior written permission is prohibited.
            &copy; ${new Date().getFullYear()} MI LinerLens. All rights reserved.
          </footer>
        </div>
      `;

      const container = document.createElement("div");
      container.setAttribute("aria-hidden", "true");
      container.style.position = "fixed";
      container.style.inset = "0";
      container.style.opacity = "0";
      container.style.pointerEvents = "none";
      container.style.zIndex = "-1";
      container.innerHTML = html;
      document.body.appendChild(container);

      const html2pdf = (await import("html2pdf.js")).default;
      const filename = `${reportData.reportTitle.replace(/[^a-z0-9-_]+/gi, "_").replace(/_+/g, "_") || "setting_calculator_report"}.pdf`;
      const options = {
        margin: [5, 8, 8, 8],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 1.6,
          useCORS: true,
          backgroundColor: "#ffffff",
          windowWidth: templateWidth,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      };
      try {
        await html2pdf().set(options).from(container.firstElementChild).save();
        modal.onClose();
        toast({ status: "success", title: "PDF exported" });
      } finally {
        container.remove();
      }
    } catch (err) {
      toast({
        status: "error",
        title: "Export failed",
        description: err?.message || "Unable to generate PDF.",
      });
    } finally {
      if (onCaptureModeChange) onCaptureModeChange(false);
      setIsExporting(false);
    }
  };

  return (
    <>
      {showTrigger ? (
        <Button colorScheme="blue" variant="outline" onClick={openModal}>
          Export PDF
        </Button>
      ) : null}

      <Modal isOpen={modal.isOpen} onClose={modal.onClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Export comparison to PDF</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Title</FormLabel>
                <Input
                  value={exportTitle}
                  onChange={(e) => setExportTitle(e.target.value)}
                  placeholder="Setting Calculator Report"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Textarea
                  value={exportNotes}
                  onChange={(e) => setExportNotes(e.target.value)}
                  placeholder="Optional notes for this report"
                  rows={4}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={modal.onClose} isDisabled={isExporting}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleExportPdf} isLoading={isExporting}>
              Download PDF
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

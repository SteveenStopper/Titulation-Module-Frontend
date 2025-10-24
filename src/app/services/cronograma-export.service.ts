import { Injectable } from '@angular/core';
import { CronogramaUIC } from './cronograma-uic.service';

@Injectable({ providedIn: 'root' })
export class CronogramaExportService {
  exportCSV(model: CronogramaUIC, filename: string) {
    const rows = [
      ['Nº', 'Actividad/Descripción', 'Responsable', 'Del', 'Al'],
      ...(model.filas || []).map(f => [
        String(f.nro ?? ''),
        (f.actividad ?? '').replace(/\n/g, ' '),
        f.responsable ?? '',
        f.fechaInicio ?? '',
        f.fechaFin ?? ''
      ])
    ];
    const csv = rows.map(r => r.map(v => '"' + (v?.toString().replace(/"/g, '""') ?? '') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportPDF(model: CronogramaUIC, opts?: { title?: string; projectText?: string }) {
    const w = window.open('', '_blank');
    if (!w) return;
    const origin = window.location.origin;

    const style = `
      <style>
        @page { margin: 22mm 18mm 14mm 18mm; }
        html, body { height: 100%; margin: 0; }
        body { font-family: Arial, sans-serif; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; position: relative; }
        .page-wrap { padding: 0; position: relative; z-index: 1; }
        .bg-img { position: fixed; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.70; z-index: 0; pointer-events: none; }
        .pdf-header { display: flex; align-items: center; margin-bottom: 25px; }
        .pdf-header img.logo { height: 64px; margin-right: 16px; transform: translateY(4mm); }
        .pdf-title { text-align: center; margin: 10mm 0 0; font-weight: 700; }
        .pdf-sub { text-align: center; margin: 0; }
        .pdf-proj { text-align: center; margin: 8px 0 16px; font-weight: 700; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #000; padding: 6px; vertical-align: top; }
        th { background: #111; color: #fff; }
        .pdf-signature { position: fixed; left: 0; right: 0; bottom: 50mm; text-align: center; font-size: 12px; line-height: 1.35; }
        .pdf-signature .name { font-weight: 600; }
        .pdf-signature .role { font-weight: 600; }
        .pdf-signature .inst { font-weight: 700; }
      </style>`;

    const title = opts?.title ?? 'Cronograma';
    const header = `
      <div class="pdf-header">
        <img class="logo" src="${origin}/assets/Logo.png" alt="Logo" />
        <div style="flex:1"></div>
      </div>
      <h3 class="pdf-title">${model.titulo ?? ''}</h3>
      <div class="pdf-sub">${model.periodo ?? ''}</div>
      <div class="pdf-proj">${opts?.projectText ?? (model.proyecto ?? '')}</div>
    `;

    const rowsHtml = (model.filas || []).map(f => {
      const actividad = (f.actividad ?? '').replace(/\n/g, '<br/>');
      const responsable = (f.responsable ?? '').replace(/\n/g, '<br/>');
      const tiempo = (() => {
        if (f.fechaInicio && f.fechaFin) return `<div><strong>Del:</strong> ${f.fechaInicio}</div><div><strong>Al:</strong> ${f.fechaFin}</div>`;
        const unica = f.fechaInicio || f.fechaFin || '';
        return unica ? `<div><strong>Fecha:</strong> ${unica}</div>` : '';
      })();
      return `
        <tr>
          <td style="text-align:center;">${f.nro ?? ''}</td>
          <td>${actividad}</td>
          <td>${responsable}</td>
          <td>${tiempo}</td>
        </tr>
      `;
    }).join('');

    const table = `
      <table>
        <thead>
          <tr>
            <th>Nº</th>
            <th>Actividad / Descripción</th>
            <th>Responsable</th>
            <th>Tiempo</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    `;

    const signature = `
      <div class="pdf-signature">
        <div class="name">Ing. José Luis Vera, Ph.D.</div>
        <div class="role">Coordinador de Investigación</div>
        <div class="inst">INSTITUTO SUPERIOR TECNOLÓGICO LOS ANDES</div>
      </div>
    `;

    const bg = `<img class="bg-img" src="${origin}/assets/Fondo_doc.jpg" alt="bg" />`;
    const script = `
      <script>
        window.addEventListener('load', function() {
          var imgs = Array.prototype.slice.call(document.images || []);
          Promise.all(imgs.map(function(img){
            return img.complete ? Promise.resolve() : new Promise(function(res){
              img.addEventListener('load', res, { once: true });
              img.addEventListener('error', res, { once: true });
            });
          })).then(function(){
            setTimeout(function(){ window.focus(); window.print(); }, 100);
          });
        });
      <\/script>`;

    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>${style}</head><body>${bg}<div class="page-wrap">${header}${table}${signature}</div>${script}</body></html>`);
    w.document.close();
    w.focus();
  }
}

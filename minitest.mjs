import { chromium } from '/home/user/Rascals-Webseite/node_modules/playwright/index.mjs';
for (const flags of [['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'], []]) {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: flags });
  const p = await b.newPage({ viewport: { width: 500, height: 400 } });
  await p.goto('http://localhost:8731/mini.html', { waitUntil: 'load' });
  await p.waitForTimeout(2000);
  const r = await p.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return { canvas: false };
    const probe = document.createElement('canvas'); probe.width = 8; probe.height = 8;
    const ctx = probe.getContext('2d'); ctx.drawImage(c, 0, 0, 8, 8);
    const px = [...ctx.getImageData(0,0,8,8).data];
    return { canvas: true, brightest: Math.max(...px.filter((_,i)=>i%4!==3)),
             renderer: (() => { const g = c.getContext('webgl2'); const d = g?.getExtension('WEBGL_debug_renderer_info');
               return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'n/a'; })() };
  });
  console.log(flags.length ? 'swiftshader' : 'default   ', JSON.stringify(r));
  await b.close();
}

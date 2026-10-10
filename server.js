import http from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('public');
const structuredData = path.resolve('data/amen-thompson-20260104-structured.json');
const metricsData = path.resolve('data/rockets_2026_metrics.json');
const trainingVideo = '/Users/bobzheng/Downloads/train_video/训练_阿门1月4日 .mp4';
const renderedVideo = path.resolve('output/amen-thompson-structured-overlay.mp4');
const cache = new Map();
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/training-structure') {
    try {
      const body = await readFile(structuredData);
      res.writeHead(200, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store'});
      return res.end(body);
    } catch { res.writeHead(404); return res.end(JSON.stringify({error:'结构化数据尚未生成'})); }
  }
  if (url.pathname === '/api/rockets-metrics') {
    try {
      const body = await readFile(metricsData);
      res.writeHead(200, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store'});
      return res.end(body);
    } catch { res.writeHead(404); return res.end(JSON.stringify({error:'火箭球员指标尚未导入'})); }
  }
  if (url.pathname === '/media/training-video' || url.pathname === '/media/structured-video') {
    try {
      const selectedVideo = url.pathname === '/media/structured-video' ? renderedVideo : trainingVideo;
      const info = await stat(selectedVideo);
      const range = req.headers.range;
      if (!range) {
        res.writeHead(200, {'Content-Type':'video/mp4', 'Content-Length':info.size, 'Accept-Ranges':'bytes'});
        return createReadStream(selectedVideo).pipe(res);
      }
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match) { res.writeHead(416, {'Content-Range':`bytes */${info.size}`}); return res.end(); }
      const start = Math.min(Number(match[1] || 0), info.size - 1);
      const end = Math.min(Number(match[2] || info.size - 1), info.size - 1);
      if (end < start) { res.writeHead(416, {'Content-Range':`bytes */${info.size}`}); return res.end(); }
      res.writeHead(206, {'Content-Type':'video/mp4', 'Content-Length':end-start+1, 'Content-Range':`bytes ${start}-${end}/${info.size}`, 'Accept-Ranges':'bytes'});
      return createReadStream(selectedVideo, {start,end}).pipe(res);
    } catch { res.writeHead(404); return res.end('Training video not found'); }
  }
  if (url.pathname === '/api/games') {
    const date = url.searchParams.get('date');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || Number.isNaN(Date.parse(date))) { res.writeHead(400); return res.end(JSON.stringify({error:'日期无效'})); }
    try {
      const hit = cache.get(date);
      let data = hit?.data;
      if (!hit || Date.now() - hit.time > 30000) {
        // ESPN dates follow the US schedule. Fetch adjacent days, then filter in Shanghai time.
        const center = new Date(date + 'T12:00:00Z');
        const payloads = await Promise.all([-1,0,1].map(async offset => {
          const day = new Date(+center + offset * 86400000).toISOString().slice(0,10).replaceAll('-','');
          const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${day}&limit=100`, {signal:AbortSignal.timeout(12000)});
          if (!response.ok) throw new Error('upstream');
          return response.json();
        }));
        const formatter = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'});
        data = {events:[...new Map(payloads.flatMap(p=>p.events || []).map(e=>[e.id,e])).values()].filter(e=>formatter.format(new Date(e.date)) === date), fetchedAt:new Date().toISOString()};
        cache.set(date,{data,time:Date.now()});
      }
      res.writeHead(200,{'Content-Type':'application/json'}); return res.end(JSON.stringify(data));
    } catch { res.writeHead(502,{'Content-Type':'application/json'}); return res.end(JSON.stringify({error:'暂时无法连接赛事数据源，请稍后重试，或切换演示模式。'})); }
  }
  try {
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(root + path.sep)) throw new Error();
    const body = await readFile(file);
    res.writeHead(200,{'Content-Type':({'html':'text/html; charset=utf-8','css':'text/css','js':'text/javascript'})[file.split('.').pop()] || 'application/octet-stream'}); res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(process.env.PORT || 3000,'0.0.0.0',()=>console.log('COURTSIDE http://localhost:' + (process.env.PORT || 3000)));

import { spawnSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const input = '/Users/bobzheng/Downloads/train_video/训练_阿门1月4日 .mp4';
const source = JSON.parse(await readFile(path.join(root, 'data/amen-thompson-20260104-structured.json'), 'utf8'));
const outputDir = path.join(root, 'output');
const output = path.join(outputDir, 'amen-thompson-structured-overlay.mp4');
const font = '/System/Library/Fonts/Hiragino Sans GB.ttc';
const duration = source.source.durationSeconds;
const safe = value => String(value).replaceAll('\\', '\\\\').replaceAll(':', '\\:').replaceAll("'", "\\'").replaceAll(',', '\\,');
const seconds = event => {
  const text = String(event.timestamp || '0');
  const match = text.match(/(\d+(?::\d+(?:\.\d+)?)?)$/);
  return match ? match[1].split(':').reduce((total, part) => total * 60 + Number(part), 0) : 0;
};
const between = (start, end) => `between(t\\,${start.toFixed(3)}\\,${end.toFixed(3)})`;
const drawText = ({text, x, y, size = 28, color = 'white', box = false, boxColor = '0x0d1422@0.86', enable}) =>
  `drawtext=fontfile='${font}':text='${safe(text)}':x=${x}:y=${y}:fontsize=${size}:fontcolor=${color}${box ? `:box=1:boxcolor=${boxColor}:boxborderw=9` : ''}${enable ? `:enable='${enable}'` : ''}`;

const filters = [
  'format=yuv420p',
  'drawbox=x=30:y=28:w=590:h=94:color=0x101827@0.90:t=fill',
  drawText({text:'BROADCAST CODE',x:54,y:45,size:29,color:'0x75f1d1'}),
  drawText({text:'STRUCTURED PLAY ANALYSIS',x:54,y:82,size:18,color:'0xdce4f2'}),
  'drawbox=x=1504:y=32:w=382:h=65:color=0x101827@0.88:t=fill',
  drawText({text:'HOU 60   —   63 DAL',x:1534,y:48,size:25,color:'white'}),
  drawText({text:'3RD · 07:45–07:23',x:1534,y:77,size:16,color:'0xb9c5d8'})
];

source.events.forEach((event, index) => {
  const start = seconds(event);
  const end = index < source.events.length - 1 ? seconds(source.events[index + 1]) : duration;
  const enabled = between(start, end);
  filters.push(`drawbox=x=32:y=874:w=1856:h=166:color=0x0b1220@0.92:t=fill:enable='${enabled}'`);
  filters.push(drawText({text:`${event.time}  ·  ${event.tag}`,x:62,y:895,size:19,color:'0x75f1d1',enable:enabled}));
  filters.push(drawText({text:event.title,x:62,y:928,size:31,color:'white',enable:enabled}));
  filters.push(drawText({text:event.caption,x:62,y:980,size:20,color:'0xd4ddec',enable:enabled}));
  filters.push(`drawbox=x=1430:y=680:w=430:h=146:color=0x101827@0.90:t=fill:enable='${enabled}'`);
  filters.push(drawText({text:'STRUCTURED OUTPUT',x:1455,y:702,size:16,color:'0x75f1d1',enable:enabled}));
  filters.push(drawText({text:event.shot,x:1455,y:734,size:22,color:'white',enable:enabled}));
  filters.push(drawText({text:event.difficulty === '—' ? '阶段：组织 / 观察' : `难度：${event.difficulty}`,x:1455,y:773,size:18,color:'0xd4ddec',enable:enabled}));
  (event.players || []).slice(0, 3).forEach((player, playerIndex) => {
    const [name, metric, x, y, state] = player;
    const px = Math.round(Number(x) * 19.2), py = Math.round(Number(y) * 10.8);
    const color = state === 'gravity' ? '0xff7548' : state === 'shooter' ? '0x75f1d1' : '0x4265ff';
    filters.push(drawText({text:'●',x:px-14,y:py-20,size:42,color,enable:enabled}));
    filters.push(drawText({text:`${name} · ${metric}`,x:px+18,y:py-3,size:17,color:'white',box:true,enable:enabled}));
  });
  if (event.route?.length === 4) {
    const [x1, y1, x2, y2] = event.route.map(Number);
    const arrowX = Math.round(((x1 + x2) / 2) * 19.2);
    const arrowY = Math.round(((y1 + y2) / 2) * 10.8);
    filters.push(drawText({text:'→ 进攻线路',x:arrowX,y:arrowY,size:20,color:'0x75f1d1',box:true,enable:enabled}));
  }
});

await mkdir(outputDir, {recursive:true});
const filtergraph = `[0:v]${filters.join(',')}[structured]`;
const result = spawnSync('ffmpeg', ['-y','-hide_banner','-loglevel','warning','-i',input,'-filter_complex',filtergraph,'-map','[structured]','-map','0:a?','-c:v','libx264','-preset','medium','-crf','18','-c:a','copy','-movflags','+faststart',output], {stdio:'inherit'});
if (result.status !== 0) process.exit(result.status || 1);
console.log(`Created ${output}`);

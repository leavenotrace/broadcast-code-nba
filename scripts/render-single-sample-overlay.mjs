import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const input = path.join(root, 'public/media/single.mp4');
const output = path.join(root, 'output/single-structured-overlay.mp4');
const font = '/System/Library/Fonts/Hiragino Sans GB.ttc';
const safe = value => String(value).replaceAll('\\', '\\\\').replaceAll(':', '\\:').replaceAll("'", "\\'").replaceAll(',', '\\,');
const between = (start, end) => `between(t\\,${start}\\,${end})`;
const draw = ({ text, x, y, size = 28, color = 'white', box = false, enable }) =>
  `drawtext=fontfile='${font}':text='${safe(text)}':x=${x}:y=${y}:fontsize=${size}:fontcolor=${color}${box ? ':box=1:boxcolor=0x111827@0.88:boxborderw=8' : ''}${enable ? `:enable='${enable}'` : ''}`;

const frames = [
  { start: 0, end: 5.5, time: '00:00.0', title: '镜头建立：球员完成回合前落位', detail: '结构化状态：多人聚集 · 暂未检测到篮球', note: '保持 2 FPS 采样，等待动作开始。' },
  { start: 5.5, end: 11, time: '00:05.5', title: '队形调整：场边沟通持续进行', detail: '结构化状态：球员位置变化 · 暂不判定持球人', note: '下一采样段将继续追踪球员与篮球。' },
  { start: 11, end: 16.5, time: '00:11.0', title: '镜头维持：队伍准备恢复比赛', detail: '结构化状态：镜头内多球员 · 动作强度较低', note: '识别模型可在此段补充球员身份。' },
  { start: 16.5, end: 21.97, time: '00:16.5', title: '回合前状态：等待比赛重新开始', detail: '结构化状态：未见有效投篮或传球动作', note: '已保留原视频与结构化时间索引。' }
];

const filters = [
  'format=yuv420p',
  'drawbox=x=28:y=28:w=500:h=82:color=0x101827@0.90:t=fill',
  draw({ text: 'BROADCAST CODE', x: 50, y: 42, size: 27, color: '0x75f1d1' }),
  draw({ text: '中文结构化视频叠加', x: 50, y: 76, size: 18, color: '0xdce4f2' }),
  'drawbox=x=1480:y=32:w=412:h=68:color=0x101827@0.88:t=fill',
  draw({ text: '2 FPS 结构化采样', x: 1510, y: 47, size: 23, color: 'white' }),
  draw({ text: '每 0.5 秒更新一次时间索引', x: 1510, y: 76, size: 15, color: '0xb9c5d8' })
];

frames.forEach(frame => {
  const enabled = between(frame.start, frame.end);
  filters.push(`drawbox=x=32:y=870:w=1856:h=170:color=0x0b1220@0.92:t=fill:enable='${enabled}'`);
  filters.push(draw({ text: `采样帧 ${frame.time}  ·  2 FPS`, x: 60, y: 892, size: 18, color: '0x75f1d1', enable: enabled }));
  filters.push(draw({ text: frame.title, x: 60, y: 927, size: 30, color: 'white', enable: enabled }));
  filters.push(draw({ text: frame.detail, x: 60, y: 969, size: 20, color: '0xd4ddec', enable: enabled }));
  filters.push(draw({ text: frame.note, x: 60, y: 1003, size: 18, color: '0xaebbd0', enable: enabled }));
  filters.push(`drawbox=x=1445:y=640:w=415:h=162:color=0x101827@0.90:t=fill:enable='${enabled}'`);
  filters.push(draw({ text: '结构化输出', x: 1472, y: 664, size: 16, color: '0x75f1d1', enable: enabled }));
  filters.push(draw({ text: '球员：多人', x: 1472, y: 701, size: 23, color: 'white', enable: enabled }));
  filters.push(draw({ text: '篮球：待识别', x: 1472, y: 736, size: 21, color: 'white', enable: enabled }));
  filters.push(draw({ text: '动作：低强度 / 观察', x: 1472, y: 769, size: 17, color: '0xd4ddec', enable: enabled }));
});

await mkdir(path.dirname(output), { recursive: true });
const result = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'warning', '-i', input, '-filter_complex', `[0:v]${filters.join(',')}[out]`, '-map', '[out]', '-map', '0:a?', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-c:a', 'copy', '-movflags', '+faststart', output], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);
console.log(`Created ${output}`);

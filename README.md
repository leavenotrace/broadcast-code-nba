# Broadcast Code · NBA 赛场可视化

面向篮球训练视频的结构化分析与转播叠加页面。项目展示火箭队阿门·汤普森的一段训练片段：浏览器会按视频时间更新持球人、战术解读与三项球员指标，并可切换至 FFmpeg 烧录后的成片。

## 本地运行

需要 Node.js 22 或更高版本。

```bash
npm start
```

打开 `http://localhost:3000`。

## 内容与数据

- `public/`：前端页面、转播叠加层与持球人指标 UI。
- `public/media/single.mp4`：默认 NBA 样例视频（本地媒体文件，不纳入 Git）。页面默认预览该视频；配套回合 JSON 尚未提供，导入对应数据后才会显示逐回合解说与叠加层。克隆仓库后需自行把视频放回此路径；静态部署也需单独上传该媒体文件。
- `data/amen-thompson-20260104-structured.json`：阿门训练视频的结构化回合数据，不适用于默认 NBA 样例视频。
- `data/rockets_2026_metrics.json`：火箭队 2025–26 赛季展示数据；命中率为赛季 FG%，球员引力与胜负影响率均为展示指数，不能视为实时预测或官方统计。
- `scripts/render-structured-video.mjs`：使用 FFmpeg 合成结构化标注成片。
- `server.js`：本地开发服务器与媒体接口。

## 生成标注视频

`scripts/render-structured-video.mjs` 仍使用阿门训练视频及其配套数据，暂不适用于新的默认样例。使用脚本前需先把输入视频和 JSON 都换成同一段素材。

输出文件位于 `output/amen-thompson-structured-overlay.mp4`。该文件和源视频属于大体积媒体素材，不纳入 Git 仓库。

## 部署

静态版本已部署在 CloudFront：[Broadcast Code](https://d2k0ez95q0j7hd.cloudfront.net/)。

# Responsive Typography Guidelines

本文档定义 Avail 网站的响应式字体规范。目标是在手机、平板和桌面屏幕上保持清晰的视觉层级、舒适的阅读体验和一致的组件表现。

## 核心原则

- 字号使用 CSS `clamp()` 在不同视口宽度之间平滑缩放。
- 每个字号都必须设置最小值和最大值，避免在极窄或极宽屏幕上失控。
- 应根据内容语义选择字号，而不是根据单个页面临时指定固定像素值。
- 标题、正文、按钮和辅助信息应使用本文档定义的语义 class。
- 除特殊视觉需求外，不应在组件内新增 `text-[固定值]`。

## 字体层级

| 语义 | CSS class | 字号范围 | 推荐用途 |
| --- | --- | --- | --- |
| 主视觉标题 | `type-display` | 40px–88px | 首页 Hero 主标题，每页最多使用一次 |
| 页面标题 | `type-page-title` | 36px–60px | Privacy、Terms 等独立页面的 H1 |
| 区块标题 | `type-section-title` | 32px–48px | 首页各主要 section 的 H2 |
| 卡片标题 | `type-feature-title` | 17px–20px | 功能卡片、FAQ 问题、内容模块标题 |
| 引导正文 | `type-lead` | 17px–20px | Hero 描述、section 简介、页面导语 |
| 普通正文 | `type-body` | 15px–17px | 卡片描述、列表、FAQ 答案、法律正文 |
| 按钮文字 | `type-button` | 14px–16px | 主按钮、次按钮和导航 CTA |
| 辅助文字 | `type-caption` | 12px–13px | 标签、元信息、表单提示和统计说明 |

## 当前 CSS 定义

规范定义在 `src/index.css` 的 `@layer components` 中：

```css
.type-display {
  font-size: clamp(2.5rem, 1.55rem + 4.2vw, 5.5rem);
  line-height: 1.06;
  letter-spacing: -0.025em;
}

.type-page-title {
  font-size: clamp(2.25rem, 1.75rem + 2.25vw, 3.75rem);
  line-height: 1.08;
  letter-spacing: -0.02em;
}

.type-section-title {
  font-size: clamp(2rem, 1.7rem + 1.35vw, 3rem);
  line-height: 1.12;
  letter-spacing: -0.015em;
}

.type-feature-title {
  font-size: clamp(1.0625rem, 1rem + 0.3vw, 1.25rem);
  line-height: 1.35;
}

.type-lead {
  font-size: clamp(1.0625rem, 0.98rem + 0.38vw, 1.25rem);
  line-height: 1.65;
}

.type-body {
  font-size: clamp(0.9375rem, 0.9rem + 0.18vw, 1.0625rem);
  line-height: 1.7;
}

.type-button {
  font-size: clamp(0.875rem, 0.84rem + 0.16vw, 1rem);
  line-height: 1.25;
}

.type-caption {
  font-size: clamp(0.75rem, 0.72rem + 0.12vw, 0.8125rem);
  line-height: 1.5;
}
```

## 使用示例

### Hero 标题和简介

```tsx
<h1 className="type-display font-black text-[#1B1F23]">
  Train smarter. Perform better.
</h1>

<p className="type-lead text-[#64707D]">
  Performance planning designed around female athletes.
</p>
```

### Section 标题和正文

```tsx
<h2 className="type-section-title font-black text-[#1B1F23]">
  Built around your biology
</h2>

<p className="type-body text-[#64707D]">
  Training and recovery guidance that adapts to the individual.
</p>
```

### 卡片和按钮

```tsx
<h3 className="type-feature-title font-extrabold text-[#1B1F23]">
  Smart Schedule
</h3>

<button className="type-button font-extrabold">
  Secure Early Access
</button>
```

## 响应式使用规则

1. 一个页面只能有一个主 H1，首页使用 `type-display`，普通内容页使用 `type-page-title`。
2. 页面主要区块的 H2 使用 `type-section-title`。
3. H3、卡片标题和 FAQ 问题使用 `type-feature-title`。
4. 大段正文默认使用 `type-body`；只有承担页面介绍作用的文字才使用 `type-lead`。
5. 所有可点击按钮和 CTA 使用 `type-button`，不要依赖父容器继承字号。
6. 标签、日期、表单字段名称及次要数据使用 `type-caption`，但重要操作信息不得小于 14px。
7. 字体响应式变化由 `clamp()` 处理，通常不需要再添加 `sm:text-*`、`md:text-*` 或 `lg:text-*`。
8. 如果设计确实需要例外，应先确认无法映射到现有语义层级，再新增全局语义 class，避免只在单一组件中硬编码字号。

## 验收范围

每次新增或修改页面后，至少检查以下视口宽度：

- 360px：小尺寸手机
- 390px：常见手机
- 768px：平板
- 1024px：小型桌面或横向平板
- 1440px：标准桌面
- 1920px：大尺寸桌面

检查重点：

- 标题是否溢出或产生不自然的单字换行。
- 正文每行是否过长，桌面端应配合 `max-width` 控制阅读宽度。
- 按钮文字是否保持单行；如果空间不足，应优先调整按钮布局而不是缩小到规范下限以下。
- 字体层级是否清楚，同级内容是否保持一致。
- 文字缩放后是否造成卡片高度、导航或表单布局异常。

## 页面容器规范

全站顶级内容容器使用共享的 `pageShell`，避免各组件分别设置不同的页面宽度：

```ts
export const pageShell =
  'mx-auto w-full max-w-full px-5 tablet:px-8 air:max-w-[1120px] air:px-12 mac:max-w-[1360px] mac:px-14 full-hd:max-w-[1600px] full-hd:px-16 qhd:max-w-[2240px] qhd:px-24 four-k:max-w-[2560px] four-k:px-28';
```

对应规则：

- 手机端左右内边距：20px。
- 平板端左右内边距：32px。
- MacBook Air 档最大宽度：1120px，左右内边距为 48px。
- Mac 档最大宽度：1360px，左右内边距为 56px。
- Full HD 档最大宽度：1600px，左右内边距为 64px。
- QHD / 2K 档最大宽度：2240px，左右内边距为 96px。
- 4K 档最大宽度：2560px，左右内边距为 112px。
- 宽屏下容器使用 `mx-auto` 水平居中，不再随视口无限拉宽。
- Section 背景可以占满屏幕，但文字、卡片和交互组件必须放在 `pageShell` 内。
- 不应在 `pageShell` 外层重复添加水平 `padding`，避免形成双重边距。

### 设备断点

断点定义在 `src/index.css` 的 `@theme` 中。所有数值均按 CSS viewport 宽度计算，而不是设备面板的物理像素：

| 档位 | 断点范围 | Tailwind 前缀 | 容器规则 |
| --- | --- | --- | --- |
| 手机 | 小于 640px | 默认 | 宽度自适应，左右 20px |
| 平板 | 640px–1023px | `tablet:` | 宽度自适应，左右 32px |
| MacBook Air | 1024px–1439px | `air:` | 最大 1120px，左右 48px |
| Mac | 1440px–1919px | `mac:` | 最大 1360px，左右 56px |
| Full HD | 1920px–2559px | `full-hd:` | 最大 1600px，左右 64px |
| QHD / 2K | 2560px–3839px | `qhd:` | 最大 2240px，左右 96px |
| 4K | 3840px 及以上 | `four-k:` | 最大 2560px，左右 112px |

```css
@theme {
  --breakpoint-tablet: 40rem;      /* 640px */
  --breakpoint-air: 64rem;         /* 1024px */
  --breakpoint-mac: 90rem;         /* 1440px */
  --breakpoint-full-hd: 120rem;    /* 1920px */
  --breakpoint-qhd: 160rem;        /* 2560px */
  --breakpoint-four-k: 240rem;     /* 3840px */
}
```

不要根据设备品牌做 User-Agent 判断。布局只根据实际 viewport 宽度切换，因此缩放浏览器窗口、横屏平板和外接显示器时也能正确响应。

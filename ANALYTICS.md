# PackBridge Analytics Specification & AI Context

This document defines the analytics tracking schema, data dictionary, and analysis guidelines for **PackBridge** (Minecraft Resource Pack Converter).
It is formatted to serve both as a development specification and as context for AI assistants analyzing Umami metrics.

---

## 1. Product Overview & Architecture Context

- **Product**: PackBridge ([packbridge.manpuc.me](https://packbridge.manpuc.me))
- **Purpose**: Bidirectional conversion and version updating of Minecraft resource/texture packs between Java Edition and Bedrock Edition.
- **Core Architecture**:
  - **100% Client-side Processing (Zero-server-upload)**: Conversion runs via Web Workers, fflate, JSZip, and ffmpeg.wasm in the user's browser. Files are never uploaded to any server.
  - **Privacy Guarantee**: No pack names, texture images, UUIDs, or personal identifiable information (PII) are ever sent to analytics.
  - **Analytics Engine**: Umami (Privacy-focused, cookie-less, lightweight).

---

## 2. Absolute Prohibitions (Data Integrity & Privacy)

The following fields are strictly forbidden from being collected or ingested:
1. `file.name` / Pack names / Descriptions in `pack.mcmeta`
2. Texture / asset internal paths (e.g., `textures/entity/...`)
3. Raw error messages or stack traces (to prevent path leaks like `C:\Users\<username>\...`)
4. Pack UUIDs (`manifest.json` UUIDs)
5. User IDs / Persistent tracking tokens
6. Precise file sizes in bytes (all sizes must be bucketed)

---

## 3. Event Schema & Data Dictionary

### Event 1: `file_selected`
Triggered immediately after a valid pack (`.zip` or `.mcpack`) is loaded into the converter interface.

| Property | Type / Enum | Definition & AI Interpretation |
| :--- | :--- | :--- |
| `format` | `"zip"` \| `"mcpack"` | The file extension. `.mcpack` is typically native Bedrock; `.zip` can be Java or Bedrock. |
| `size_tier` | `"<10MB"` \| `"10-50MB"` \| `"50-100MB"` \| `">100MB"` | Binned file size. Heavy packs (`>50MB`) have higher memory and worker crash risks. |
| `input_method` | `"drop"` \| `"file_picker"` | User input UX: dropped via drag-and-drop overlay vs. selected through the file dialog. |

---

### Event 2: `file_abandoned`
Triggered when a user loads a pack but leaves without initiating conversion.

| Property | Type / Enum | Definition & AI Interpretation |
| :--- | :--- | :--- |
| `reason` | `"manual_reset"` \| `"page_unload"` | Whether the user explicitly clicked "Reset" or closed/navigated away from the tab. |
| `has_warning` | `boolean` | `true` if a compatibility or edition warning was visible when abandoned (indicates user confusion or unsupported pack). |

---

### Event 3: `conversion_start`
Triggered when the user clicks the "Convert" button.

| Property | Type / Enum | Definition & AI Interpretation |
| :--- | :--- | :--- |
| `direction` | `"java-to-bedrock"` \| `"bedrock-to-java"` \| `"java-to-java"` \| `"bedrock-to-bedrock"` | The selected conversion direction. Helps identify user demand distribution. |
| `java_version` | String (e.g., `"1.21.4"`, `"1.20.4"`) | Source or target Java Edition version ID. |
| `bedrock_version` | String (e.g., `"1.21.50"`) | Source or target Bedrock Edition version ID. |
| `detection` | `"auto_detected"` \| `"manual_changed"` | `"auto_detected"` = user accepted automatic version detection; `"manual_changed"` = user manually adjusted version/edition. |
| `opt_gui` | `boolean` | Whether beta GUI conversion is enabled. |
| `opt_animation` | `boolean` | Whether texture animation conversion is enabled. |
| `opt_audio_reencode` | `boolean` | Whether high-load ffmpeg.wasm audio re-encoding is enabled. |
| `user_type` | `"first_time"` \| `"repeat"` | Anonymous client-side determination via localStorage count (no UUID used). |
| `usage_tier` | `"1st"` \| `"2-5th"` \| `"6-10th"` \| `"11th+"` | Cumulative conversions performed by this browser. Indicates retention. |
| `ui_lang` | String (e.g., `"ja"`, `"en"`, `"zh"`, `"es"`) | Active UI language at conversion time. |

---

### Event 4: `conversion_success`
Triggered when the Web Worker completes conversion without critical failure.

| Property | Type / Enum | Definition & AI Interpretation |
| :--- | :--- | :--- |
| `direction` | Enum (same as `conversion_start`) | Used for cross-tabulating performance across conversion types. |
| `duration_tier` | `"<5s"` \| `"5-15s"` \| `"15-30s"` \| `"30-60s"` \| `">60s"` | Total conversion latency. |
| `file_count_tier` | `"<100"` \| `"100-500"` \| `"500-2000"` \| `">2000"` | Scale of internal assets converted. |
| `has_audio` | `boolean` | `true` if the pack contains audio assets (`.ogg`, `.fsb`, sound definitions). |
| `has_animations` | `boolean` | `true` if the pack contains model/texture animation controllers. |
| `opt_audio_reencode` | `boolean` | Cross-reference with `duration_tier` to measure ffmpeg processing overhead. |
| `skip_reason_top` | `"NONE"` \| `"NO_MAPPING"` \| `"UNSUPPORTED_FORMAT"` | Primary reason for unmapped files: `"NO_MAPPING"` signals missing asset translation rules in the mapping database. |

---

### Event 5: `conversion_failed`
Triggered when an unhandled exception or worker error halts conversion.

| Property | Type / Enum | Definition & AI Interpretation |
| :--- | :--- | :--- |
| `direction` | Enum (same as `conversion_start`) | The conversion direction where the crash occurred. |
| `error_category` | `"INVALID_ARCHIVE"` \| `"OUT_OF_MEMORY"` \| `"WORKER_CRASH"` \| `"FFMPEG_ERROR"` \| `"UNKNOWN"` | Abstracted category of failure (raw stack traces are never recorded). |
| `opt_audio_reencode` | `boolean` | Correlates whether ffmpeg.wasm was active during the failure. |
| `size_tier` | Enum (same as `file_selected`) | Pack size tier that caused the failure. |

---

### Event 6: `pack_download`
Triggered when the user clicks the "Download" button on the conversion report.

| Property | Type / Enum | Definition & AI Interpretation |
| :--- | :--- | :--- |
| `format` | `"zip"` \| `"mcpack"` | Final output package format chosen by the user. |
| `direction` | String | Conversion direction of the downloaded pack. |

---

### Event 7: `report_click`
Triggered when the user clicks a bug reporting link.

| Property | Type / Enum | Definition & AI Interpretation |
| :--- | :--- | :--- |
| `source` | `"error_banner"` \| `"report_summary"` \| `"footer"` | Origin of the user's report navigation: critical failure banner, report summary with skips, or standard footer link. |

---

## 4. Key Performance Indicators & AI Analysis Prompts

When evaluating analytics data, use the following formulas and perspectives:

### 1. Funnel Conversion Rate (CVR)
- **Start-to-Download CVR**: `pack_download (count) / conversion_start (count)`
- **Full Funnel Drop-off**: `file_selected` → `conversion_start` → `conversion_success` → `pack_download`
- *AI Diagnostic*: If `file_selected` to `conversion_start` drop-off is high, check `file_abandoned.has_warning` to determine if users are hitting version/format confusion.

### 2. Mapping Quality Assessment
- Look at `conversion_success.skip_reason_top === "NO_MAPPING"`.
- *AI Diagnostic*: A high frequency of `NO_MAPPING` indicates that users' packs contain textures/sounds not yet covered by `scripts/generate_mappings.ts` (GeyserMC/PrismarineJS data).

### 3. Client Stability & Resource Bottlenecks
- Look at `conversion_failed.error_category === "OUT_OF_MEMORY"` grouped by `size_tier`.
- Correlate `conversion_failed.error_category === "FFMPEG_ERROR"` with `opt_audio_reencode === true`.
- *AI Diagnostic*: Suggests whether audio re-encoding should default to off on mobile or if chunking memory optimizations are needed.

### 4. User Loyalty & Retention
- Ratio of `conversion_start.user_type === "repeat"` vs. `"first_time"`.
- Distribution across `usage_tier` (`2-5th`, `6-10th`, `11th+`).

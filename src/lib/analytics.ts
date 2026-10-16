import type { ConversionDirection, PackReport } from './pack/types';

/**
 * Umami Window Object Declaration
 */
declare global {
  interface Window {
    umami?: {
      track: (
        eventName: string,
        eventData?: Record<string, string | number | boolean>
      ) => void;
    };
  }
}

/**
 * 厳格なイベント定義（禁忌データを排除したホワイトリスト型）
 */
export type AnalyticsEventMap = {
  file_selected: {
    format: 'zip' | 'mcpack';
    size_tier: '<10MB' | '10-50MB' | '50-100MB' | '>100MB';
    input_method: 'drop' | 'file_picker';
  };
  file_abandoned: {
    reason: 'manual_reset' | 'page_unload';
    has_warning: boolean;
  };
  conversion_start: {
    direction: ConversionDirection;
    java_version: string;
    bedrock_version: string;
    detection: 'auto_detected' | 'manual_changed';
    opt_gui: boolean;
    opt_animation: boolean;
    opt_audio_reencode: boolean;
    user_type: 'first_time' | 'repeat';
    usage_tier: '1st' | '2-5th' | '6-10th' | '11th+';
    ui_lang: string;
  };
  conversion_success: {
    direction: ConversionDirection;
    duration_tier: '<5s' | '5-15s' | '15-30s' | '30-60s' | '>60s';
    file_count_tier: '<100' | '100-500' | '500-2000' | '>2000';
    has_audio: boolean;
    has_animations: boolean;
    opt_audio_reencode: boolean;
    skip_reason_top: 'NONE' | 'NO_MAPPING' | 'UNSUPPORTED_FORMAT';
  };
  conversion_failed: {
    direction: ConversionDirection;
    error_category: 'INVALID_ARCHIVE' | 'OUT_OF_MEMORY' | 'WORKER_CRASH' | 'FFMPEG_ERROR' | 'UNKNOWN';
    opt_audio_reencode: boolean;
    size_tier: '<10MB' | '10-50MB' | '50-100MB' | '>100MB';
  };
  pack_download: {
    format: 'zip' | 'mcpack';
    direction: string;
  };
  report_click: {
    source: 'error_banner' | 'report_summary' | 'footer';
  };
};

/**
 * 安全なUmamiイベント送信ラッパー
 */
export function trackEvent<E extends keyof AnalyticsEventMap>(
  name: E,
  props: AnalyticsEventMap[E]
): void {
  if (typeof window === 'undefined') return;

  try {
    if (window.umami && typeof window.umami.track === 'function') {
      window.umami.track(name, props as Record<string, string | number | boolean>);
    }
  } catch (err) {
    // 広告ブロッカーやオフライン時も例外を握りつぶしてユーザー体験を阻害しない
    console.debug('[Umami Analytics] Failed to track:', err);
  }
}

/**
 * ファイルサイズの階級（バケット）化
 */
export function getSizeTier(bytes: number): '<10MB' | '10-50MB' | '50-100MB' | '>100MB' {
  const mb = bytes / (1024 * 1024);
  if (mb < 10) return '<10MB';
  if (mb < 50) return '10-50MB';
  if (mb < 100) return '50-100MB';
  return '>100MB';
}

/**
 * 処理時間の階級（バケット）化
 */
export function getDurationTier(ms: number): '<5s' | '5-15s' | '15-30s' | '30-60s' | '>60s' {
  const sec = ms / 1000;
  if (sec < 5) return '<5s';
  if (sec < 15) return '5-15s';
  if (sec < 30) return '15-30s';
  if (sec < 60) return '30-60s';
  return '>60s';
}

/**
 * ファイル総数の階級化
 */
export function getFileCountTier(count: number): '<100' | '100-500' | '500-2000' | '>2000' {
  if (count < 100) return '<100';
  if (count < 500) return '100-500';
  if (count < 2000) return '500-2000';
  return '>2000';
}

/**
 * LocalStorageを使用した匿名変換回数管理（UUID不保持）
 */
const STORAGE_KEY_CONVERSION_COUNT = 'pb_anon_conversion_count';

export function getLocalConversionCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONVERSION_COUNT);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function incrementLocalConversionCount(): number {
  if (typeof window === 'undefined') return 1;
  try {
    const current = getLocalConversionCount();
    const next = current + 1;
    localStorage.setItem(STORAGE_KEY_CONVERSION_COUNT, String(next));
    return next;
  } catch {
    return 1;
  }
}

export function getUsageTier(count: number): '1st' | '2-5th' | '6-10th' | '11th+' {
  if (count <= 1) return '1st';
  if (count <= 5) return '2-5th';
  if (count <= 10) return '6-10th';
  return '11th+';
}

/**
 * エラーの抽象化（生メッセージやスタックトレースは送信しない）
 */
export function categorizeError(err: unknown): 'INVALID_ARCHIVE' | 'OUT_OF_MEMORY' | 'WORKER_CRASH' | 'FFMPEG_ERROR' | 'UNKNOWN' {
  if (!err) return 'UNKNOWN';
  const str = String(err instanceof Error ? err.message : err).toLowerCase();

  if (str.includes('ffmpeg') || str.includes('audio') || str.includes('sound')) {
    return 'FFMPEG_ERROR';
  }
  if (str.includes('memory') || str.includes('heap') || str.includes('oom') || str.includes('allocation')) {
    return 'OUT_OF_MEMORY';
  }
  if (str.includes('worker') || str.includes('terminated')) {
    return 'WORKER_CRASH';
  }
  if (str.includes('zip') || str.includes('corrupt') || str.includes('end of data') || str.includes('format')) {
    return 'INVALID_ARCHIVE';
  }
  return 'UNKNOWN';
}

/**
 * レポートから主要なスキップ原因および構成要素を安全に抽出
 */
export function analyzeReportSafety(report: PackReport) {
  let hasAudio = false;
  let hasAnimations = false;
  let noMappingCount = 0;
  let unsupportedFormatCount = 0;

  for (const item of report.details) {
    const fn = (item.filename || '').toLowerCase();
    if (fn.endsWith('.ogg') || fn.endsWith('.fsb') || fn.includes('sound')) {
      hasAudio = true;
    }
    if (fn.includes('animation') || fn.includes('anim_')) {
      hasAnimations = true;
    }

    if (item.status === 'skipped') {
      const reason = (item.reason || '').toLowerCase();
      if (reason.includes('mapping') || reason.includes('not found') || reason.includes('unknown')) {
        noMappingCount++;
      } else {
        unsupportedFormatCount++;
      }
    }
  }

  let skipReasonTop: 'NONE' | 'NO_MAPPING' | 'UNSUPPORTED_FORMAT' = 'NONE';
  if (report.skippedCount > 0) {
    skipReasonTop = noMappingCount >= unsupportedFormatCount ? 'NO_MAPPING' : 'UNSUPPORTED_FORMAT';
  }

  return {
    hasAudio,
    hasAnimations,
    skipReasonTop,
  };
}

import type { Language } from '@/lib/i18n/config';
import type { BasePairKey, MappingCounts, VersionPageSpec } from './version-pages';

export interface VersionPageLocalizedCopy {
  title: string;
  metaDescription: string;
  keywords: string;
  h1: string;
  lead: string;
  breadcrumbHome: string;
  breadcrumbConvert: string;
  breadcrumbCurrent: string;
  specsHeading: string;
  sourceLabel: string;
  targetLabel: string;
  packFormatLabel: string;
  minEngineLabel: string;
  mappingHeading: string;
  mappingSubtitle: string;
  texturesLabel: string;
  soundsLabel: string;
  langKeysLabel: string;
  totalAssetsLabel: string;
  notesHeading: string;
  notes: string[];
  faqHeading: string;
  faqs: { question: string; answer: string }[];
  relatedHeading: string;
  reverseLinkLabel: string;
  otherVersionsHeading: string;
  allVersionsHubLink: string;
}

export interface ConvertHubLocalizedCopy {
  title: string;
  metaDescription: string;
  h1: string;
  lead: string;
  breadcrumbHome: string;
  breadcrumbConvert: string;
  j2bHeading: string;
  j2bSub: string;
  b2jHeading: string;
  b2jSub: string;
  assetsMappedUnit: string;
  openConverterCta: string;
  backToGenericTitle: string;
  backToGenericDesc: string;
  backToGenericCta: string;
  popularSectionTitle: string;
  popularSectionDesc: string;
  popularViewAll: string;
}

const PAIR_NOTES: Record<Language, Record<BasePairKey, string[]>> = {
  ja: {
    '26.3.0_to_1.26.60': [
      'Java Edition 26.3（pack_format 95）と Bedrock Edition 26.6（内部 min_engine_version [1, 26, 60]）の新バージョニング体系に対応した最新世代ペアです。',
      '1.21.4 以降で導入された items/ アイテムモデル定義および 1.20.2 以降の GUI スプライト分割構造を維持しつつ、pack.mcmeta / manifest.json を最新フォーマット番号で生成します。',
      '最新スナップショット・正式版で追加されたブロック・エンティティ・サウンドイベント定義の相互変換に対応しています。',
    ],
    '1.21.4_to_1.21.50': [
      '「The Garden Awakens」アップデート世代である Java 1.21.4（pack_format 46）と Bedrock 1.21.5（min_engine_version [1, 21, 5]）のペアです。',
      'Java 1.21.4（pack_format 46）で刷新された assets/minecraft/items/ のアイテムモデル定義や、ペールガーデン（Pale Oak・Creaking・Resin 等）のテクスチャ・音源パスに対応しています。',
      'GUI 変換を有効にすると、textures/gui/sprites/ の個別スプライトと統合版 textures/ui/ の相互変換も行えます。',
    ],
    '1.20.4_to_1.20.80': [
      '配布リソースパックが非常に多い Java 1.20.3〜1.20.4（pack_format 22）と Bedrock 1.20.8（min_engine_version [1, 20, 8]）の安定版ペアです。',
      'Java 1.20.2（pack_format 18）で GUI の icons.png / widgets.png が textures/gui/sprites/ に分割された直後の世代にあたるため、モダン GUI スプライト変換に標準対応しています。',
      '桜バイオーム・考古学・トライアルチャンバー先行要素を含む 1,600 件超のテクスチャと約 3,000 件の言語キーを変換します。',
    ],
    '1.16.5_to_1.16.200': [
      'PvP テクスチャや大型配布マップで今なお根強い人気を持つ Java 1.16.2〜1.16.5（pack_format 6）と Bedrock 1.16.2（min_engine_version [1, 16, 2]）のペアです。',
      'GUI が単一シート（icons.png / widgets.png）の旧構造世代であり、ネザーアップデートまでのブロック・アイテム名と統合版レガシー命名（stone_andesite 等）を正確に対応づけます。',
      '旧世代パックのファイル構造を保ったまま、目的のエディションで警告なく読み込めるメタデータを出力します。',
    ],
  },
  en: {
    '26.3.0_to_1.26.60': [
      'Covers the latest Minecraft versioning era: Java Edition 26.3 (pack_format 95) and Bedrock Edition 26.6 (min_engine_version [1, 26, 60]).',
      'Generates valid pack.mcmeta (format 95) or manifest.json headers while preserving post-1.21.4 item model structures and split GUI sprites.',
      'Includes full texture, sound event, and localization key mappings for the latest blocks and entities.',
    ],
    '1.21.4_to_1.21.50': [
      'Designed for the "The Garden Awakens" release: Java 1.21.4 (pack_format 46) and Bedrock 1.21.5 (min_engine_version [1, 21, 5]).',
      'Accounts for the new assets/minecraft/items/ item model definitions introduced in Java 1.21.4 (pack_format 46) as well as Pale Garden assets (Pale Oak, Creaking, Resin).',
      'Supports modern split GUI sprites (textures/gui/sprites/ ↔ textures/ui/) when GUI conversion is enabled.',
    ],
    '1.20.4_to_1.20.80': [
      'Pairs the widely used Java 1.20.3–1.20.4 (pack_format 22) release with Bedrock 1.20.8 (min_engine_version [1, 20, 8]).',
      'Handles the post-1.20.2 GUI sprite sheet split (where icons.png and widgets.png moved to individual files under textures/gui/sprites/).',
      'Maps Cherry Grove, Archaeology, and 1.20 era textures, sounds, and language files directly in your browser.',
    ],
    '1.16.5_to_1.16.200': [
      'Built for classic Nether Update & PvP packs: Java 1.16.2–1.16.5 (pack_format 6) and Bedrock 1.16.2 (min_engine_version [1, 16, 2]).',
      'Uses pre-1.20.2 monolithic GUI sprite sheets (icons.png / widgets.png) and bridges flattened Java 1.13+ block names with legacy Bedrock texture names.',
      'Outputs clean pack_format 6 or [1, 16, 2] metadata so older packs load without version warnings.',
    ],
  },
  zh: {
    '26.3.0_to_1.26.60': [
      '面向最新版本号体系：Java 版 26.3（pack_format 95）与基岩版 26.6（内部 min_engine_version [1, 26, 60]）互转。',
      '自动生成符合 pack_format 95 或 [1, 26, 60] 规范的元数据文件，兼容 1.21.4+ 的物品模型结构与新版拆分 GUI 精灵图。',
      '完整覆盖最新方块、实体纹理、音效事件与语言键映射。',
    ],
    '1.21.4_to_1.21.50': [
      '对应“苍白之园（The Garden Awakens）”版本：Java 1.21.4（pack_format 46）与基岩版 1.21.5（min_engine_version [1, 21, 5]）。',
      '针对 Java 1.21.4（pack_format 46）引入的 assets/minecraft/items/ 新物品模型定义，以及苍白橡木、嘎枝（Creaking）、树脂等新增材质与音效进行精准映射。',
      '支持 1.20.2+ 拆分后的 GUI 精灵图目录（textures/gui/sprites/ ↔ textures/ui/）转换。',
    ],
    '1.20.4_to_1.20.80': [
      '适配资源包存量极大的 Java 1.20.3–1.20.4（pack_format 22）与基岩版 1.20.8（min_engine_version [1, 20, 8]）。',
      '处于 Java 1.20.2（pack_format 18）GUI 贴图拆分后的首个稳定世代，原生支持新版 GUI 精灵与传统路径转换。',
      '涵盖樱花树林、考古系统等 1.20 世代逾 1,600 项材质与约 3,000 条语言键值。',
    ],
    '1.16.5_to_1.16.200': [
      '专为经典下界更新及 PvP 材质包打造：Java 1.16.2–1.16.5（pack_format 6）与基岩版 1.16.2（min_engine_version [1, 16, 2]）。',
      '采用旧版单张 GUI 贴图结构（icons.png / widgets.png），准确映射 1.16 方块物品名称与基岩版传统命名（如 stone_andesite）。',
      '转换后自动写入对应的旧版版本号，避免在游戏内出现版本不兼容警告。',
    ],
  },
  ko: {
    '26.3.0_to_1.26.60': [
      '최신 버전 체계인 Java Edition 26.3(pack_format 95)과 Bedrock Edition 26.6(min_engine_version [1, 26, 60]) 간의 변환을 지원합니다.',
      '1.21.4 이후의 아이템 모델 구조와 분할된 GUI 스프라이트를 유지하며 최신 pack.mcmeta 및 manifest.json을 생성합니다.',
      '최신 블록, 엔티티 텍스처, 사운드 이벤트 및 언어 키 매핑이 모두 포함되어 있습니다.',
    ],
    '1.21.4_to_1.21.50': [
      'The Garden Awakens 업데이트 세대인 Java 1.21.4(pack_format 46)와 Bedrock 1.21.5(min_engine_version [1, 21, 5]) 전용 페어입니다.',
      'Java 1.21.4(pack_format 46)에서 도입된 assets/minecraft/items/ 아이템 모델 정의와 창백한 정원(Pale Oak, Creaking, Resin) 에셋 경로를 정확히 매핑합니다.',
      'GUI 변환 옵션 활성화 시 분할된 textures/gui/sprites/와 베드락 textures/ui/ 간의 상호 변환을 처리합니다.',
    ],
    '1.20.4_to_1.20.80': [
      '배포 리소스팩이 가장 많은 Java 1.20.3~1.20.4(pack_format 22)와 Bedrock 1.20.8(min_engine_version [1, 20, 8]) 안정화 버전 페어입니다.',
      'Java 1.20.2(pack_format 18)의 GUI 스프라이트 분할 이후 구조를 지원하며 벚꽃 숲 및 고고학 업데이트 에셋을 매핑합니다.',
      '1,600개 이상의 텍스처와 약 3,000개의 언어 키를 브라우저 내에서 즉시 변환합니다.',
    ],
    '1.16.5_to_1.16.200': [
      'PvP 텍스처팩과 클래식 맵에서 인기가 높은 Java 1.16.2~1.16.5(pack_format 6)와 Bedrock 1.16.2(min_engine_version [1, 16, 2]) 페어입니다.',
      '단일 시트 GUI(icons.png / widgets.png) 구조와 네더 업데이트 시절의 블록/아이템 명명 규칙을 베드락 레거시 경로와 매핑합니다.',
      '버전 경고 없이 바로 적용할 수 있도록 정확한 구버전 메타데이터를 생성합니다.',
    ],
  },
  tl: {
    '26.3.0_to_1.26.60': [
      'Para sa pinakabagong sistema ng bersyon: Java Edition 26.3 (pack_format 95) at Bedrock Edition 26.6 (min_engine_version [1, 26, 60]).',
      'Gumagawa ng tamang pack.mcmeta (format 95) o manifest.json habang pinapanatili ang bagong item model structure at split GUI sprites.',
      'Kumpleto sa mapping ng mga pinakabagong texture, sound event, at language file.',
    ],
    '1.21.4_to_1.21.50': [
      'Para sa "The Garden Awakens" update: Java 1.21.4 (pack_format 46) at Bedrock 1.21.5 (min_engine_version [1, 21, 5]).',
      'Sinusuportahan ang bagong assets/minecraft/items/ item model definition na ipinakilala sa Java 1.21.4 (pack_format 46) at mga asset ng Pale Garden.',
      'May suporta para sa split GUI sprites (textures/gui/sprites/ ↔ textures/ui/).',
    ],
    '1.20.4_to_1.20.80': [
      'Para sa sikat na Java 1.20.3–1.20.4 (pack_format 22) at Bedrock 1.20.8 (min_engine_version [1, 20, 8]).',
      'Akma sa post-1.20.2 GUI sprite split at sumasaklaw sa Cherry Grove at Archaeology assets.',
      'Mahigit 1,600 textures at ~3,000 language keys ang nako-convert nang direkta sa browser.',
    ],
    '1.16.5_to_1.16.200': [
      'Para sa classic Nether Update at PvP packs: Java 1.16.2–1.16.5 (pack_format 6) at Bedrock 1.16.2 (min_engine_version [1, 16, 2]).',
      'Gumagamit ng dating single-sheet GUI (icons.png / widgets.png) at nagtutugma ng legacy Bedrock texture names.',
      'Naglalabas ng tamang metadata upang walang version warning sa laro.',
    ],
  },
  es: {
    '26.3.0_to_1.26.60': [
      'Compatible con la numeración más reciente: Java Edition 26.3 (pack_format 95) y Bedrock Edition 26.6 (min_engine_version [1, 26, 60]).',
      'Genera archivos pack.mcmeta (formato 95) o manifest.json válidos conservando los modelos de objetos modernos y sprites GUI divididos.',
      'Incluye asignaciones completas de texturas, sonidos e idiomas de la última versión.',
    ],
    '1.21.4_to_1.21.50': [
      'Diseñado para la actualización "The Garden Awakens": Java 1.21.4 (pack_format 46) y Bedrock 1.21.5 (min_engine_version [1, 21, 5]).',
      'Contempla las nuevas definiciones de modelos de objetos en assets/minecraft/items/ introducidas en Java 1.21.4 (pack_format 46) y los recursos de Pale Garden.',
      'Admite conversión de sprites GUI modernos divididos (textures/gui/sprites/ ↔ textures/ui/).',
    ],
    '1.20.4_to_1.20.80': [
      'Conecta la popular versión Java 1.20.3–1.20.4 (pack_format 22) con Bedrock 1.20.8 (min_engine_version [1, 20, 8]).',
      'Compatible con la división de hojas de sprites GUI introducida en 1.20.2 (format 18).',
      'Convierte más de 1.600 texturas y cerca de 3.000 claves de idioma localmente en tu navegador.',
    ],
    '1.16.5_to_1.16.200': [
      'Ideal para paquetes clásicos de PvP y Nether Update: Java 1.16.2–1.16.5 (pack_format 6) y Bedrock 1.16.2 (min_engine_version [1, 16, 2]).',
      'Respeta las hojas GUI clásicas (icons.png / widgets.png) y traduce nombres de bloques entre Java 1.16 y Bedrock.',
      'Genera metadatos exactos para cargar el paquete sin advertencias de incompatibilidad.',
    ],
  },
  fr: {
    '26.3.0_to_1.26.60': [
      'Prend en charge la dernière génération : Java Edition 26.3 (pack_format 95) et Bedrock Edition 26.6 (min_engine_version [1, 26, 60]).',
      'Génère un pack.mcmeta (format 95) ou manifest.json conforme tout en préservant la structure des modèles 1.21.4+ et les sprites GUI découpés.',
      'Couvre l’ensemble des textures, événements sonores et clés de langue récents.',
    ],
    '1.21.4_to_1.21.50': [
      'Conçu pour la mise à jour « The Garden Awakens » : Java 1.21.4 (pack_format 46) et Bedrock 1.21.5 (min_engine_version [1, 21, 5]).',
      'Prend en charge les nouvelles définitions de modèles d’objets dans assets/minecraft/items/ introduites en Java 1.21.4 (pack_format 46) ainsi que les ressources du Jardin pâle.',
      'Compatible avec la conversion des sprites GUI modernes (textures/gui/sprites/ ↔ textures/ui/).',
    ],
    '1.20.4_to_1.20.80': [
      'Associe la très répandue version Java 1.20.3–1.20.4 (pack_format 22) à Bedrock 1.20.8 (min_engine_version [1, 20, 8]).',
      'Gère la séparation des feuilles de sprites GUI introduite depuis la 1.20.2 (format 18).',
      'Convertit plus de 1 600 textures et environ 3 000 clés de traduction directement dans le navigateur.',
    ],
    '1.16.5_to_1.16.200': [
      'Idéal pour les packs PvP et Nether Update : Java 1.16.2–1.16.5 (pack_format 6) et Bedrock 1.16.2 (min_engine_version [1, 16, 2]).',
      'Utilise la structure GUI classique (icons.png / widgets.png) et fait correspondre la nomenclature Java 1.16 aux chemins Bedrock.',
      'Produit des métadonnées adaptées pour éviter tout avertissement de version en jeu.',
    ],
  },
  de: {
    '26.3.0_to_1.26.60': [
      'Unterstützt die neueste Versionsgeneration: Java Edition 26.3 (pack_format 95) und Bedrock Edition 26.6 (min_engine_version [1, 26, 60]).',
      'Erzeugt passende pack.mcmeta (Format 95) bzw. manifest.json-Dateien unter Beibehaltung moderner Item-Modelle und aufgeteilter GUI-Sprites.',
      'Umfasst sämtliche aktuellen Textur-, Sound- und Sprachschlüssel-Zuordnungen.',
    ],
    '1.21.4_to_1.21.50': [
      'Abgestimmt auf das Update „The Garden Awakens“: Java 1.21.4 (pack_format 46) und Bedrock 1.21.5 (min_engine_version [1, 21, 5]).',
      'Berücksichtigt die in Java 1.21.4 (pack_format 46) eingeführten Item-Modelldefinitionen unter assets/minecraft/items/ sowie alle Blassgarten-Assets.',
      'Unterstützt aufgeteilte GUI-Sprites (textures/gui/sprites/ ↔ textures/ui/).',
    ],
    '1.20.4_to_1.20.80': [
      'Verbindet die weit verbreitete Version Java 1.20.3–1.20.4 (pack_format 22) mit Bedrock 1.20.8 (min_engine_version [1, 20, 8]).',
      'Kompatibel mit der seit Java 1.20.2 (Format 18) eingeführten Aufteilung der GUI-Sprite-Sheets.',
      'Konvertiert über 1.600 Texturen und rund 3.000 Sprachschlüssel lokal im Browser.',
    ],
    '1.16.5_to_1.16.200': [
      'Optimal für klassische Nether-Update- und PvP-Packs: Java 1.16.2–1.16.5 (pack_format 6) und Bedrock 1.16.2 (min_engine_version [1, 16, 2]).',
      'Verarbeitet klassische Einzelblatt-GUIs (icons.png / widgets.png) und ordnet Java-1.16-Blocknamen den Bedrock-Pfaden zu.',
      'Erstellt präzise Metadaten für das Laden ohne Versionswarnung.',
    ],
  },
};

export function getVersionPageCopy(
  lang: Language,
  spec: VersionPageSpec,
  counts: MappingCounts
): VersionPageLocalizedCopy {
  const isJ2B = spec.direction === 'java-to-bedrock';
  const fromVer = spec.slugFrom;
  const toVer = spec.slugTo;
  const jVer = spec.javaDisplayVersion;
  const bVer = spec.bedrockDisplayVersion;
  const pf = spec.javaPackFormat;
  const mev = `[${spec.bedrockMinEngineVersion.join(', ')}]`;
  const notes = PAIR_NOTES[lang]?.[spec.basePairKey] ?? PAIR_NOTES.en[spec.basePairKey];

  const tCount = counts.textures.toLocaleString();
  const sCount = counts.sounds.toLocaleString();
  const lCount = counts.lang.toLocaleString();
  const totalCount = counts.total.toLocaleString();

  switch (lang) {
    case 'ja': {
      const fromName = isJ2B ? `Java ${fromVer}` : `統合版(Bedrock) ${fromVer}`;
      const toName = isJ2B ? `統合版(Bedrock) ${toVer}` : `Java ${toVer}`;
      return {
        title: isJ2B
          ? `Java ${jVer} リソースパックを統合版 ${bVer} に変換 | PackBridge`
          : `統合版(Bedrock) ${bVer} リソースパックを Java ${jVer} に変換 | PackBridge`,
        metaDescription: `${fromName} のマイクラ リソースパック・テクスチャパックを ${toName} へブラウザ内で即座に変換。アップロード不要・最大 ${totalCount} 件のテクスチャ/サウンド/言語マッピングに対応。`,
        keywords: `マイクラ, リソースパック 変換, テクスチャ 変換, ${fromVer}, ${toVer}, Java ${jVer}, Bedrock ${bVer}, 統合版, pack_format ${pf}, PackBridge`,
        h1: isJ2B
          ? `Java ${jVer} リソースパックを統合版 ${bVer} に変換`
          : `統合版 ${bVer} リソースパックを Java ${jVer} に変換`,
        lead: `${fromName} から ${toName} への変換設定がプリセットされています。ファイル（.zip / .mcpack）をドロップするだけで、ブラウザ内で安全に変換を開始できます。`,
        breadcrumbHome: 'ホーム',
        breadcrumbConvert: 'バージョン別変換',
        breadcrumbCurrent: `${isJ2B ? 'Java' : 'Bedrock'} ${fromVer} → ${isJ2B ? 'Bedrock' : 'Java'} ${toVer}`,
        specsHeading: `${fromVer} → ${toVer} 変換スペックと対応アセット数`,
        sourceLabel: `変換元 (${isJ2B ? 'Java Edition' : 'Bedrock Edition'})`,
        targetLabel: `変換先 (${isJ2B ? 'Bedrock Edition' : 'Java Edition'})`,
        packFormatLabel: `Java pack_format`,
        minEngineLabel: `Bedrock min_engine_version`,
        mappingHeading: 'このバージョンペアの専用マッピング定義数',
        mappingSubtitle: `実ファイル（${spec.mappingFile}）に基づく ${isJ2B ? 'Java → Bedrock' : 'Bedrock → Java'} 変換テーブルの内訳`,
        texturesLabel: 'テクスチャパス',
        soundsLabel: 'サウンド定義',
        langKeysLabel: '言語キー (.lang/.json)',
        totalAssetsLabel: '合計マッピング定義',
        notesHeading: `${fromVer} と ${toVer} 間の仕様・変換のポイント`,
        notes,
        faqHeading: `${fromVer} → ${toVer} 変換のよくある質問`,
        faqs: [
          {
            question: `${fromName} のリソースパックは ${toName} でそのまま使えますか？`,
            answer: `いいえ、そのままではファイル構造とメタデータが異なるため読み込めません。PackBridge では ${
              isJ2B
                ? `Java ${jVer}（pack_format ${pf}）の pack.mcmeta と assets/minecraft/ 構造を、統合版 ${bVer}（min_engine_version ${mev}）の manifest.json と textures/ 構造へ`
                : `統合版 ${bVer}（min_engine_version ${mev}）の manifest.json と textures/ 構造を、Java ${jVer}（pack_format ${pf}）の pack.mcmeta と assets/minecraft/ 構造へ`
            }自動変換します。`,
          },
          {
            question: `${fromVer} から ${toVer} への変換ではテクスチャ以外の音や言語も変換されますか？`,
            answer: `はい。このバージョンペアでは ${tCount} 件のテクスチャパスに加え、${sCount} 件のサウンド定義および ${lCount} 件の言語キー（合計 ${totalCount} 件）のマッピングに対応しています。すべての処理はお使いのブラウザ内で完結し、外部サーバーへファイルが送信されることはありません。`,
          },
        ],
        relatedHeading: '関連するバージョン変換ペア',
        reverseLinkLabel: `逆方向で変換する: ${isJ2B ? `統合版 ${bVer} → Java ${jVer}` : `Java ${jVer} → 統合版 ${bVer}`}`,
        otherVersionsHeading: `同じ方向（${isJ2B ? 'Java → 統合版' : '統合版 → Java'}）の他バージョン`,
        allVersionsHubLink: 'すべてのバージョン別変換一覧を見る',
      };
    }

    case 'zh': {
      const fromName = isJ2B ? `Java ${fromVer}` : `基岩版 ${fromVer}`;
      const toName = isJ2B ? `基岩版 ${toVer}` : `Java ${toVer}`;
      return {
        title: isJ2B
          ? `Java ${jVer} 材质包转基岩版 ${bVer} | PackBridge`
          : `基岩版 ${bVer} 材质包转 Java ${jVer} | PackBridge`,
        metaDescription: `在浏览器内将 Minecraft ${fromName} 资源包/材质包一键转换为 ${toName}。无需上传服务器，内置 ${totalCount} 项纹理、音效与语言键精准映射。`,
        keywords: `我的世界, 材质包转换器, 资源包转换, ${fromVer}, ${toVer}, Java ${jVer}, 基岩版 ${bVer}, pack_format ${pf}, PackBridge`,
        h1: isJ2B
          ? `Java ${jVer} 材质包转基岩版 ${bVer}`
          : `基岩版 ${bVer} 材质包转 Java ${jVer}`,
        lead: `已为您预设 ${fromName} 转 ${toName} 的版本参数。只需拖入 .zip 或 .mcpack 文件，即可在浏览器本地直接开始转换。`,
        breadcrumbHome: '首页',
        breadcrumbConvert: '按版本转换',
        breadcrumbCurrent: `${fromName} → ${toName}`,
        specsHeading: `${fromVer} → ${toVer} 版本规格与支持资产数`,
        sourceLabel: `源版本 (${isJ2B ? 'Java 版' : '基岩版'})`,
        targetLabel: `目标版本 (${isJ2B ? '基岩版' : 'Java 版'})`,
        packFormatLabel: 'Java pack_format',
        minEngineLabel: '基岩版 min_engine_version',
        mappingHeading: '当前版本对专属映射条目数',
        mappingSubtitle: `基于 ${spec.mappingFile} 的 ${isJ2B ? 'Java → 基岩版' : '基岩版 → Java'} 实测映射统计`,
        texturesLabel: '纹理材质路径',
        soundsLabel: '音效事件定义',
        langKeysLabel: '语言翻译键',
        totalAssetsLabel: '映射规则总计',
        notesHeading: `${fromVer} 与 ${toVer} 转换注意事项`,
        notes,
        faqHeading: `${fromVer} 转 ${toVer} 常见问题`,
        faqs: [
          {
            question: `${fromName} 的材质包可以直接在 ${toName} 中使用吗？`,
            answer: `不能直接使用，因为两者的目录结构与元数据格式完全不同。PackBridge 会自动将 ${
              isJ2B
                ? `Java ${jVer}（pack_format ${pf}）的 pack.mcmeta 与 assets/minecraft/ 结构转换为基岩版 ${bVer}（min_engine_version ${mev}）所需的 manifest.json 与 textures/ 结构`
                : `基岩版 ${bVer}（min_engine_version ${mev}）的 manifest.json 与 textures/ 结构转换为 Java ${jVer}（pack_format ${pf}）所需的 pack.mcmeta 与 assets/minecraft/ 结构`
            }。`,
          },
          {
            question: `从 ${fromVer} 转换到 ${toVer} 时，除了贴图还会转换音效和语言文件吗？`,
            answer: `是的。该版本对内置了 ${tCount} 条纹理路径、${sCount} 条音效定义以及 ${lCount} 条语言键（共计 ${totalCount} 条映射）。所有转换均在您的浏览器本地完成，文件绝不会上传到服务器。`,
          },
        ],
        relatedHeading: '相关版本转换入口',
        reverseLinkLabel: `反向转换：${isJ2B ? `基岩版 ${bVer} → Java ${jVer}` : `Java ${jVer} → 基岩版 ${bVer}`}`,
        otherVersionsHeading: `同方向（${isJ2B ? 'Java → 基岩版' : '基岩版 → Java'}）其他版本`,
        allVersionsHubLink: '查看所有版本转换列表',
      };
    }

    case 'ko': {
      const fromName = isJ2B ? `Java ${fromVer}` : `베드락 ${fromVer}`;
      const toName = isJ2B ? `베드락 ${toVer}` : `Java ${toVer}`;
      return {
        title: isJ2B
          ? `Java ${jVer} 리소스팩을 베드락 ${bVer}으로 변환 | PackBridge`
          : `베드락 ${bVer} 리소스팩을 Java ${jVer}로 변환 | PackBridge`,
        metaDescription: `마인크래프트 ${fromName} 리소스팩·텍스처팩을 ${toName} 버전으로 브라우저에서 즉시 변환하세요. 서버 업로드 없이 총 ${totalCount}개의 에셋 매핑을 지원합니다.`,
        keywords: `마인크래프트, 리소스팩 변환, 텍스처팩 변환, ${fromVer}, ${toVer}, Java ${jVer}, Bedrock ${bVer}, pack_format ${pf}, PackBridge`,
        h1: isJ2B
          ? `Java ${jVer} 리소스팩을 베드락 ${bVer}으로 변환`
          : `베드락 ${bVer} 리소스팩을 Java ${jVer}로 변환`,
        lead: `${fromName}에서 ${toName}(으)로의 변환 설정이 미리 선택되어 있습니다. 파일(.zip / .mcpack)을 드롭하면 브라우저에서 바로 변환이 시작됩니다.`,
        breadcrumbHome: '홈',
        breadcrumbConvert: '버전별 변환',
        breadcrumbCurrent: `${fromName} → ${toName}`,
        specsHeading: `${fromVer} → ${toVer} 변환 사양 및 매핑 통계`,
        sourceLabel: `원본 버전 (${isJ2B ? 'Java Edition' : 'Bedrock Edition'})`,
        targetLabel: `대상 버전 (${isJ2B ? 'Bedrock Edition' : 'Java Edition'})`,
        packFormatLabel: 'Java pack_format',
        minEngineLabel: 'Bedrock min_engine_version',
        mappingHeading: '이 버전 페어의 전용 매핑 수',
        mappingSubtitle: `${spec.mappingFile} 기준 ${isJ2B ? 'Java → Bedrock' : 'Bedrock → Java'} 매핑 항목 내역`,
        texturesLabel: '텍스처 경로',
        soundsLabel: '사운드 정의',
        langKeysLabel: '언어 키',
        totalAssetsLabel: '총 매핑 규칙',
        notesHeading: `${fromVer} ↔ ${toVer} 버전별 변환 참고사항`,
        notes,
        faqHeading: `${fromVer} → ${toVer} 자주 묻는 질문`,
        faqs: [
          {
            question: `${fromName} 리소스팩을 ${toName}에서 그대로 사용할 수 있나요?`,
            answer: `아니요, 폴더 구조와 메타데이터 형식이 달라 그대로 작동하지 않습니다. PackBridge는 ${
              isJ2B
                ? `Java ${jVer}(pack_format ${pf}) 구조를 베드락 ${bVer}(min_engine_version ${mev})의 manifest.json 및 textures/ 구조로`
                : `베드락 ${bVer}(min_engine_version ${mev}) 구조를 Java ${jVer}(pack_format ${pf})의 pack.mcmeta 및 assets/minecraft/ 구조로`
            } 자동 변환합니다.`,
          },
          {
            question: `${fromVer}에서 ${toVer}로 변환할 때 텍스처 외에 사운드나 언어 파일도 변환되나요?`,
            answer: `네, 이 버전 페어는 ${tCount}개의 텍스처 경로, ${sCount}개의 사운드 정의, ${lCount}개의 언어 키(총 ${totalCount}개) 매핑을 지원합니다. 모든 작업은 브라우저 내부에서 로컬로 처리됩니다.`,
          },
        ],
        relatedHeading: '관련 버전 변환 페어',
        reverseLinkLabel: `반대 방향 변환: ${isJ2B ? `베드락 ${bVer} → Java ${jVer}` : `Java ${jVer} → 베드락 ${bVer}`}`,
        otherVersionsHeading: `같은 방향(${isJ2B ? 'Java → 베드락' : '베드락 → Java'})의 다른 버전`,
        allVersionsHubLink: '모든 버전별 변환 목록 보기',
      };
    }

    case 'tl': {
      const fromName = isJ2B ? `Java ${fromVer}` : `Bedrock ${fromVer}`;
      const toName = isJ2B ? `Bedrock ${toVer}` : `Java ${toVer}`;
      return {
        title: isJ2B
          ? `I-convert ang Java ${jVer} Resource Pack sa Bedrock ${bVer} | PackBridge`
          : `I-convert ang Bedrock ${bVer} Resource Pack sa Java ${jVer} | PackBridge`,
        metaDescription: `I-convert ang Minecraft ${fromName} resource at texture pack papuntang ${toName} nang direkta sa iyong browser. Walang upload sa server, may ${totalCount} asset mappings.`,
        keywords: `Minecraft, resource pack converter, texture pack converter, ${fromVer}, ${toVer}, Java ${jVer}, Bedrock ${bVer}, pack_format ${pf}, PackBridge`,
        h1: isJ2B
          ? `I-convert ang Java ${jVer} Resource Pack sa Bedrock ${bVer}`
          : `I-convert ang Bedrock ${bVer} Resource Pack sa Java ${jVer}`,
        lead: `Naka-preset na ang converter na ito para sa ${fromName} papuntang ${toName}. I-drop lang ang iyong .zip o .mcpack file upang magsimula agad sa browser.`,
        breadcrumbHome: 'Home',
        breadcrumbConvert: 'Convert by Version',
        breadcrumbCurrent: `${fromName} → ${toName}`,
        specsHeading: `Detalye ng ${fromVer} → ${toVer} at Bilang ng Mappings`,
        sourceLabel: `Source (${isJ2B ? 'Java Edition' : 'Bedrock Edition'})`,
        targetLabel: `Target (${isJ2B ? 'Bedrock Edition' : 'Java Edition'})`,
        packFormatLabel: 'Java pack_format',
        minEngineLabel: 'Bedrock min_engine_version',
        mappingHeading: 'Bilang ng Asset Mappings sa Pair na Ito',
        mappingSubtitle: `Batay sa ${spec.mappingFile} para sa direksyong ${isJ2B ? 'Java → Bedrock' : 'Bedrock → Java'}`,
        texturesLabel: 'Texture Paths',
        soundsLabel: 'Sound Definitions',
        langKeysLabel: 'Language Keys',
        totalAssetsLabel: 'Kabuuang Mappings',
        notesHeading: `Mahahalagang Paalala para sa ${fromVer} at ${toVer}`,
        notes,
        faqHeading: `FAQ sa Pag-convert ng ${fromVer} → ${toVer}`,
        faqs: [
          {
            question: `Magagamit ba nang direkta ang ${fromName} resource pack sa ${toName}?`,
            answer: `Hindi, dahil magkaiba ang folder structure at metadata ng Java (pack_format ${pf}) at Bedrock (min_engine_version ${mev}). Awtomatikong kino-convert ng PackBridge ang mga file at manifest para gumana sa ${toName}.`,
          },
          {
            question: `Kasama bang nako-convert ang sounds at language files mula ${fromVer} papuntang ${toVer}?`,
            answer: `Oo. Sinusuportahan ng pair na ito ang ${tCount} textures, ${sCount} sound definitions, at ${lCount} language keys (${totalCount} kabuuang mappings) nang lokal sa iyong browser.`,
          },
        ],
        relatedHeading: 'Mga Kaugnay na Version Conversion',
        reverseLinkLabel: `Baliktarin ang direksyon: ${isJ2B ? `Bedrock ${bVer} → Java ${jVer}` : `Java ${jVer} → Bedrock ${bVer}`}`,
        otherVersionsHeading: `Ibang Bersyon (${isJ2B ? 'Java → Bedrock' : 'Bedrock → Java'})`,
        allVersionsHubLink: 'Tingnan ang lahat ng version conversions',
      };
    }

    case 'es': {
      const fromName = isJ2B ? `Java ${fromVer}` : `Bedrock ${fromVer}`;
      const toName = isJ2B ? `Bedrock ${toVer}` : `Java ${toVer}`;
      return {
        title: isJ2B
          ? `Convertir Resource Pack de Java ${jVer} a Bedrock ${bVer} | PackBridge`
          : `Convertir Resource Pack de Bedrock ${bVer} a Java ${jVer} | PackBridge`,
        metaDescription: `Convierte paquetes de recursos y texturas de Minecraft ${fromName} a ${toName} directamente en tu navegador. Sin subir archivos al servidor y con ${totalCount} asignaciones.`,
        keywords: `Minecraft, convertir resource pack, texture pack, ${fromVer}, ${toVer}, Java ${jVer}, Bedrock ${bVer}, pack_format ${pf}, PackBridge`,
        h1: isJ2B
          ? `Convertir Resource Pack de Java ${jVer} a Bedrock ${bVer}`
          : `Convertir Resource Pack de Bedrock ${bVer} a Java ${jVer}`,
        lead: `Este convertidor ya está preconfigurado para pasar de ${fromName} a ${toName}. Arrastra tu archivo .zip o .mcpack para iniciar la conversión local al instante.`,
        breadcrumbHome: 'Inicio',
        breadcrumbConvert: 'Conversión por versión',
        breadcrumbCurrent: `${fromName} → ${toName}`,
        specsHeading: `Especificaciones de ${fromVer} → ${toVer} y recursos compatibles`,
        sourceLabel: `Origen (${isJ2B ? 'Java Edition' : 'Bedrock Edition'})`,
        targetLabel: `Destino (${isJ2B ? 'Bedrock Edition' : 'Java Edition'})`,
        packFormatLabel: 'Java pack_format',
        minEngineLabel: 'Bedrock min_engine_version',
        mappingHeading: 'Asignaciones verificadas para este par de versiones',
        mappingSubtitle: `Datos exactos de ${spec.mappingFile} (${isJ2B ? 'Java → Bedrock' : 'Bedrock → Java'})`,
        texturesLabel: 'Rutas de texturas',
        soundsLabel: 'Eventos de sonido',
        langKeysLabel: 'Claves de idioma',
        totalAssetsLabel: 'Total de asignaciones',
        notesHeading: `Notas técnicas entre ${fromVer} y ${toVer}`,
        notes,
        faqHeading: `Preguntas frecuentes sobre ${fromVer} → ${toVer}`,
        faqs: [
          {
            question: `¿Funciona un paquete de ${fromName} directamente en ${toName}?`,
            answer: `No directamente, ya que Java ${jVer} utiliza pack.mcmeta (pack_format ${pf}) y Bedrock ${bVer} requiere manifest.json (min_engine_version ${mev}) con rutas distintas. PackBridge transforma automáticamente tanto la estructura como los metadatos.`,
          },
          {
            question: `¿Se convierten también sonidos e idiomas al pasar de ${fromVer} a ${toVer}?`,
            answer: `Sí. Este par incluye ${tCount} rutas de texturas, ${sCount} definiciones de sonido y ${lCount} claves de idioma (${totalCount} en total), procesadas 100% en tu navegador sin subir archivos.`,
          },
        ],
        relatedHeading: 'Conversiones de versiones relacionadas',
        reverseLinkLabel: `Dirección inversa: ${isJ2B ? `Bedrock ${bVer} → Java ${jVer}` : `Java ${jVer} → Bedrock ${bVer}`}`,
        otherVersionsHeading: `Otras versiones (${isJ2B ? 'Java → Bedrock' : 'Bedrock → Java'})`,
        allVersionsHubLink: 'Ver todas las conversiones por versión',
      };
    }

    case 'fr': {
      const fromName = isJ2B ? `Java ${fromVer}` : `Bedrock ${fromVer}`;
      const toName = isJ2B ? `Bedrock ${toVer}` : `Java ${toVer}`;
      return {
        title: isJ2B
          ? `Convertir un Resource Pack Java ${jVer} vers Bedrock ${bVer} | PackBridge`
          : `Convertir un Resource Pack Bedrock ${bVer} vers Java ${jVer} | PackBridge`,
        metaDescription: `Convertissez vos packs de ressources et textures Minecraft de ${fromName} vers ${toName} directement dans le navigateur. Sans envoi sur serveur, avec ${totalCount} correspondances.`,
        keywords: `Minecraft, convertisseur resource pack, texture pack, ${fromVer}, ${toVer}, Java ${jVer}, Bedrock ${bVer}, pack_format ${pf}, PackBridge`,
        h1: isJ2B
          ? `Convertir un Resource Pack Java ${jVer} vers Bedrock ${bVer}`
          : `Convertir un Resource Pack Bedrock ${bVer} vers Java ${jVer}`,
        lead: `Le convertisseur est préconfiguré pour ${fromName} vers ${toName}. Déposez simplement votre fichier .zip ou .mcpack pour lancer la conversion locale.`,
        breadcrumbHome: 'Accueil',
        breadcrumbConvert: 'Conversion par version',
        breadcrumbCurrent: `${fromName} → ${toName}`,
        specsHeading: `Spécifications ${fromVer} → ${toVer} et ressources prises en charge`,
        sourceLabel: `Source (${isJ2B ? 'Java Edition' : 'Bedrock Edition'})`,
        targetLabel: `Cible (${isJ2B ? 'Bedrock Edition' : 'Java Edition'})`,
        packFormatLabel: 'Java pack_format',
        minEngineLabel: 'Bedrock min_engine_version',
        mappingHeading: 'Correspondances dédiées pour cette paire de versions',
        mappingSubtitle: `Issu de ${spec.mappingFile} (${isJ2B ? 'Java → Bedrock' : 'Bedrock → Java'})`,
        texturesLabel: 'Chemins de textures',
        soundsLabel: 'Définitions audio',
        langKeysLabel: 'Clés de langue',
        totalAssetsLabel: 'Total des correspondances',
        notesHeading: `Particularités techniques entre ${fromVer} et ${toVer}`,
        notes,
        faqHeading: `Questions fréquentes : ${fromVer} → ${toVer}`,
        faqs: [
          {
            question: `Un pack de ressources ${fromName} est-il utilisable tel quel sur ${toName} ?`,
            answer: `Non, car Java ${jVer} utilise pack.mcmeta (pack_format ${pf}) tandis que Bedrock ${bVer} exige manifest.json (min_engine_version ${mev}) et une arborescence différente. PackBridge convertit automatiquement les fichiers et métadonnées.`,
          },
          {
            question: `Les sons et fichiers de langue sont-ils convertis de ${fromVer} vers ${toVer} ?`,
            answer: `Oui. Cette paire prend en charge ${tCount} textures, ${sCount} définitions sonores et ${lCount} clés de traduction (soit ${totalCount} correspondances), le tout localement dans votre navigateur.`,
          },
        ],
        relatedHeading: 'Conversions de versions associées',
        reverseLinkLabel: `Sens inverse : ${isJ2B ? `Bedrock ${bVer} → Java ${jVer}` : `Java ${jVer} → Bedrock ${bVer}`}`,
        otherVersionsHeading: `Autres versions (${isJ2B ? 'Java → Bedrock' : 'Bedrock → Java'})`,
        allVersionsHubLink: 'Voir toutes les conversions par version',
      };
    }

    case 'de': {
      const fromName = isJ2B ? `Java ${fromVer}` : `Bedrock ${fromVer}`;
      const toName = isJ2B ? `Bedrock ${toVer}` : `Java ${toVer}`;
      return {
        title: isJ2B
          ? `Java ${jVer} Resource Pack in Bedrock ${bVer} umwandeln | PackBridge`
          : `Bedrock ${bVer} Resource Pack in Java ${jVer} umwandeln | PackBridge`,
        metaDescription: `Konvertiere Minecraft ${fromName} Resource- und Texture-Packs direkt im Browser zu ${toName}. Kein Server-Upload, mit ${totalCount} Asset-Zuordnungen.`,
        keywords: `Minecraft, Resource Pack Konverter, Texture Pack umwandeln, ${fromVer}, ${toVer}, Java ${jVer}, Bedrock ${bVer}, pack_format ${pf}, PackBridge`,
        h1: isJ2B
          ? `Java ${jVer} Resource Pack in Bedrock ${bVer} umwandeln`
          : `Bedrock ${bVer} Resource Pack in Java ${jVer} umwandeln`,
        lead: `Dieser Konverter ist bereits für ${fromName} nach ${toName} voreingestellt. Ziehe einfach deine .zip- oder .mcpack-Datei hinein, um lokal im Browser zu starten.`,
        breadcrumbHome: 'Startseite',
        breadcrumbConvert: 'Nach Version konvertieren',
        breadcrumbCurrent: `${fromName} → ${toName}`,
        specsHeading: `${fromVer} → ${toVer} Spezifikationen & unterstützte Assets`,
        sourceLabel: `Quelle (${isJ2B ? 'Java Edition' : 'Bedrock Edition'})`,
        targetLabel: `Ziel (${isJ2B ? 'Bedrock Edition' : 'Java Edition'})`,
        packFormatLabel: 'Java pack_format',
        minEngineLabel: 'Bedrock min_engine_version',
        mappingHeading: 'Verifizierte Zuordnungen für dieses Versionspaar',
        mappingSubtitle: `Basierend auf ${spec.mappingFile} (${isJ2B ? 'Java → Bedrock' : 'Bedrock → Java'})`,
        texturesLabel: 'Texturpfade',
        soundsLabel: 'Sound-Definitionen',
        langKeysLabel: 'Sprachschlüssel',
        totalAssetsLabel: 'Zuordnungen gesamt',
        notesHeading: `Technische Hinweise für ${fromVer} und ${toVer}`,
        notes,
        faqHeading: `Häufige Fragen zu ${fromVer} → ${toVer}`,
        faqs: [
          {
            question: `Kann ein ${fromName} Resource Pack direkt in ${toName} verwendet werden?`,
            answer: `Nein, da Java ${jVer} die Datei pack.mcmeta (pack_format ${pf}) nutzt und Bedrock ${bVer} eine manifest.json (min_engine_version ${mev}) sowie andere Ordnerpfade benötigt. PackBridge wandelt Struktur und Metadaten automatisch um.`,
          },
          {
            question: `Werden beim Wechsel von ${fromVer} zu ${toVer} auch Sounds und Sprachdateien konvertiert?`,
            answer: `Ja. Dieses Versionspaar umfasst ${tCount} Texturpfade, ${sCount} Sound-Definitionen und ${lCount} Sprachschlüssel (insgesamt ${totalCount} Zuordnungen) – komplett lokal in deinem Browser.`,
          },
        ],
        relatedHeading: 'Verwandte Versions-Konvertierungen',
        reverseLinkLabel: `Umgekehrte Richtung: ${isJ2B ? `Bedrock ${bVer} → Java ${jVer}` : `Java ${jVer} → Bedrock ${bVer}`}`,
        otherVersionsHeading: `Weitere Versionen (${isJ2B ? 'Java → Bedrock' : 'Bedrock → Java'})`,
        allVersionsHubLink: 'Alle Versions-Konvertierungen anzeigen',
      };
    }

    case 'en':
    default: {
      const fromName = isJ2B ? `Java ${fromVer}` : `Bedrock ${fromVer}`;
      const toName = isJ2B ? `Bedrock ${toVer}` : `Java ${toVer}`;
      return {
        title: isJ2B
          ? `Convert Java ${jVer} Resource Pack to Bedrock ${bVer} | PackBridge`
          : `Convert Bedrock ${bVer} Resource Pack to Java ${jVer} | PackBridge`,
        metaDescription: `Convert Minecraft ${fromName} resource packs and texture packs to ${toName} directly in your browser. No server upload required, with ${totalCount} mapped assets.`,
        keywords: `Minecraft, convert resource pack, texture pack converter, ${fromVer} to ${toVer}, Java ${jVer}, Bedrock ${bVer}, pack_format ${pf}, PackBridge`,
        h1: isJ2B
          ? `Convert Java ${jVer} Resource Pack to Bedrock ${bVer}`
          : `Convert Bedrock ${bVer} Resource Pack to Java ${jVer}`,
        lead: `Preset for ${fromName} to ${toName}. Drop your .zip or .mcpack file below to start converting locally in your browser.`,
        breadcrumbHome: 'Home',
        breadcrumbConvert: 'Convert by Version',
        breadcrumbCurrent: `${fromName} → ${toName}`,
        specsHeading: `${fromVer} → ${toVer} Technical Specs & Mapped Assets`,
        sourceLabel: `Source (${isJ2B ? 'Java Edition' : 'Bedrock Edition'})`,
        targetLabel: `Target (${isJ2B ? 'Bedrock Edition' : 'Java Edition'})`,
        packFormatLabel: 'Java pack_format',
        minEngineLabel: 'Bedrock min_engine_version',
        mappingHeading: 'Verified Asset Mappings for This Pair',
        mappingSubtitle: `Exact counts from ${spec.mappingFile} (${isJ2B ? 'Java → Bedrock' : 'Bedrock → Java'})`,
        texturesLabel: 'Texture Paths',
        soundsLabel: 'Sound Definitions',
        langKeysLabel: 'Language Keys',
        totalAssetsLabel: 'Total Mapped Entries',
        notesHeading: `Version Notes for ${fromVer} & ${toVer}`,
        notes,
        faqHeading: `${fromVer} to ${toVer} Conversion FAQ`,
        faqs: [
          {
            question: `Can a ${fromName} resource pack be used directly in ${toName}?`,
            answer: `Not without conversion. Java ${jVer} uses pack.mcmeta (pack_format ${pf}) and assets/minecraft/ paths, while Bedrock ${bVer} requires manifest.json (min_engine_version ${mev}) and textures/ paths. PackBridge automatically converts both the folder structure and metadata.`,
          },
          {
            question: `Does converting from ${fromVer} to ${toVer} include sounds and language files as well as textures?`,
            answer: `Yes. This version pair includes ${tCount} texture path mappings, ${sCount} sound definitions, and ${lCount} localization keys (${totalCount} total entries). Everything runs locally in your browser without uploading files to any server.`,
          },
        ],
        relatedHeading: 'Related Version Conversions',
        reverseLinkLabel: `Reverse direction: ${isJ2B ? `Bedrock ${bVer} → Java ${jVer}` : `Java ${jVer} → Bedrock ${bVer}`}`,
        otherVersionsHeading: `Other ${isJ2B ? 'Java → Bedrock' : 'Bedrock → Java'} Version Pairs`,
        allVersionsHubLink: 'View all version-specific converters',
      };
    }
  }
}

export function getConvertHubCopy(lang: Language): ConvertHubLocalizedCopy {
  switch (lang) {
    case 'ja':
      return {
        title: 'バージョン別 マイクラ リソースパック・テクスチャ変換一覧 | PackBridge',
        metaDescription: 'Minecraft Java版（26.3 / 1.21.4 / 1.20.4 / 1.16.5）と統合版（Bedrock 26.6 / 1.21.5 / 1.20.8 / 1.16.2）のバージョン指定リソースパック変換ページ一覧。',
        h1: 'バージョン別 リソースパック変換一覧',
        lead: '変換したい Minecraft のバージョンペアを選択すると、バージョンがプリセットされた専用コンバーターが開きます。すべてブラウザ内で安全に処理されます。',
        breadcrumbHome: 'ホーム',
        breadcrumbConvert: 'バージョン別変換',
        j2bHeading: 'Java Edition → 統合版 (Bedrock Edition)',
        j2bSub: 'Java版のリソースパック (.zip) を指定バージョンの統合版 (.mcpack) に変換',
        b2jHeading: '統合版 (Bedrock Edition) → Java Edition',
        b2jSub: '統合版のリソースパック (.mcpack / .zip) を指定バージョンの Java版 (.zip) に変換',
        assetsMappedUnit: '件のマッピング定義',
        openConverterCta: 'このペアで変換する',
        backToGenericTitle: '他のバージョン（1.8〜26.3）を変換したい場合',
        backToGenericDesc: 'トップページの汎用コンバーターでは、Java版 30 バージョン・統合版 13 バージョンおよび同エディション内のバージョン更新に対応しています。',
        backToGenericCta: '汎用コンバーターを開く',
        popularSectionTitle: '人気のバージョン別変換',
        popularSectionDesc: 'よく使われるバージョンの組み合わせをプリセットした専用ページから直接変換できます。',
        popularViewAll: 'すべてのバージョン別変換一覧を見る →',
      };
    case 'zh':
      return {
        title: '按版本转换 Minecraft 材质包/资源包列表 | PackBridge',
        metaDescription: '支持 Minecraft Java 版（26.3 / 1.21.4 / 1.20.4 / 1.16.5）与基岩版（26.6 / 1.21.5 / 1.20.8 / 1.16.2）指定版本材质包互转入口汇总。',
        h1: '按版本转换 Minecraft 材质包',
        lead: '选择您需要转换的 Java 版与基岩版版本组合，即可打开已预设好参数的专属转换器，全程在浏览器本地完成。',
        breadcrumbHome: '首页',
        breadcrumbConvert: '按版本转换',
        j2bHeading: 'Java 版 → 基岩版 (Bedrock Edition)',
        j2bSub: '将 Java 版材质包 (.zip) 转换为指定版本的基岩版 (.mcpack)',
        b2jHeading: '基岩版 (Bedrock Edition) → Java 版',
        b2jSub: '将基岩版材质包 (.mcpack / .zip) 转换为指定版本的 Java 版 (.zip)',
        assetsMappedUnit: '项映射规则',
        openConverterCta: '使用此版本对转换',
        backToGenericTitle: '需要转换其他版本（1.8 ~ 26.3）？',
        backToGenericDesc: '首页通用转换器支持全部 30 个 Java 版本、13 个基岩版本以及同版本跨代升级。',
        backToGenericCta: '返回通用转换器',
        popularSectionTitle: '热门版本材质包转换',
        popularSectionDesc: '直接进入已预设对应版本号（1.21.4、1.20.4、1.16.5、26.3 等）的专属转换页面。',
        popularViewAll: '查看全部版本转换列表 →',
      };
    case 'ko':
      return {
        title: '버전별 마인크래프트 리소스팩·텍스처팩 변환 목록 | PackBridge',
        metaDescription: 'Minecraft Java Edition(26.3 / 1.21.4 / 1.20.4 / 1.16.5)과 Bedrock Edition(26.6 / 1.21.5 / 1.20.8 / 1.16.2) 버전 지정 변환 페이지 모음.',
        h1: '버전별 리소스팩 변환 목록',
        lead: '원하는 버전 페어를 선택하면 해당 버전이 미리 설정된 변환기가 열립니다. 모든 작업은 브라우저 내에서 안전하게 처리됩니다.',
        breadcrumbHome: '홈',
        breadcrumbConvert: '버전별 변환',
        j2bHeading: 'Java Edition → Bedrock Edition (베드락)',
        j2bSub: 'Java 리소스팩(.zip)을 지정한 베드락 버전(.mcpack)으로 변환',
        b2jHeading: 'Bedrock Edition (베드락) → Java Edition',
        b2jSub: '베드락 리소스팩(.mcpack / .zip)을 지정한 Java 버전(.zip)으로 변환',
        assetsMappedUnit: '개 매핑 규칙',
        openConverterCta: '이 버전으로 변환하기',
        backToGenericTitle: '다른 버전(1.8~26.3)을 변환하고 싶으신가요?',
        backToGenericDesc: '메인 페이지 변환기에서는 Java 30개 버전, 베드락 13개 버전 및 동일 에디션 버전 업데이트를 모두 지원합니다.',
        backToGenericCta: '전체 버전 변환기 열기',
        popularSectionTitle: '인기 버전별 리소스팩 변환',
        popularSectionDesc: '자주 찾는 버전 조합이 미리 설정된 전용 페이지에서 바로 변환을 시작할 수 있습니다.',
        popularViewAll: '모든 버전별 변환 목록 보기 →',
      };
    case 'tl':
      return {
        title: 'Listahan ng Minecraft Resource Pack Converter ayon sa Bersyon | PackBridge',
        metaDescription: 'I-convert ang Minecraft Java (26.3 / 1.21.4 / 1.20.4 / 1.16.5) at Bedrock (26.6 / 1.21.5 / 1.20.8 / 1.16.2) resource packs nang direkta sa browser.',
        h1: 'Resource Pack Converter ayon sa Bersyon',
        lead: 'Pumili ng pares ng bersyon sa ibaba upang buksan ang pre-configured converter nang direkta sa iyong browser.',
        breadcrumbHome: 'Home',
        breadcrumbConvert: 'Convert by Version',
        j2bHeading: 'Java Edition → Bedrock Edition',
        j2bSub: 'I-convert ang Java resource packs (.zip) sa Bedrock (.mcpack)',
        b2jHeading: 'Bedrock Edition → Java Edition',
        b2jSub: 'I-convert ang Bedrock packs (.mcpack / .zip) sa Java (.zip)',
        assetsMappedUnit: 'mapped entries',
        openConverterCta: 'Buksan ang Converter',
        backToGenericTitle: 'Naghahanap ng ibang bersyon (1.8–26.3)?',
        backToGenericDesc: 'Sinusuportahan ng pangunahing converter ang lahat ng 30 Java versions at 13 Bedrock versions.',
        backToGenericCta: 'Buksan ang Main Converter',
        popularSectionTitle: 'Mga Sikat na Version Conversion',
        popularSectionDesc: 'Direktang mag-convert gamit ang mga preset na bersyon para sa 1.21.4, 1.20.4, 1.16.5, at 26.3.',
        popularViewAll: 'Tingnan ang lahat ng version converters →',
      };
    case 'es':
      return {
        title: 'Convertidor de Resource Packs de Minecraft por Versión | PackBridge',
        metaDescription: 'Directorio de conversión de paquetes de recursos entre Minecraft Java (26.3 / 1.21.4 / 1.20.4 / 1.16.5) y Bedrock (26.6 / 1.21.5 / 1.20.8 / 1.16.2).',
        h1: 'Conversión de Resource Packs por Versión',
        lead: 'Selecciona un par de versiones para abrir el convertidor preconfigurado directamente en tu navegador.',
        breadcrumbHome: 'Inicio',
        breadcrumbConvert: 'Conversión por versión',
        j2bHeading: 'Java Edition → Bedrock Edition',
        j2bSub: 'Convierte paquetes de Java (.zip) a Bedrock (.mcpack)',
        b2jHeading: 'Bedrock Edition → Java Edition',
        b2jSub: 'Convierte paquetes de Bedrock (.mcpack / .zip) a Java (.zip)',
        assetsMappedUnit: 'asignaciones',
        openConverterCta: 'Abrir convertidor',
        backToGenericTitle: '¿Buscas otra versión (1.8–26.3)?',
        backToGenericDesc: 'El convertidor principal admite las 30 versiones de Java, 13 de Bedrock y actualizaciones dentro de la misma edición.',
        backToGenericCta: 'Ir al convertidor principal',
        popularSectionTitle: 'Conversiones por versión populares',
        popularSectionDesc: 'Accede directamente al convertidor preconfigurado para los pares de versiones más buscados.',
        popularViewAll: 'Ver todas las conversiones por versión →',
      };
    case 'fr':
      return {
        title: 'Convertisseur de Resource Packs Minecraft par Version | PackBridge',
        metaDescription: 'Liste des convertisseurs de packs de ressources par version entre Minecraft Java (26.3 / 1.21.4 / 1.20.4 / 1.16.5) et Bedrock (26.6 / 1.21.5 / 1.20.8 / 1.16.2).',
        h1: 'Conversion de Resource Packs par Version',
        lead: 'Choisissez une paire de versions ci-dessous pour ouvrir le convertisseur préconfiguré directement dans votre navigateur.',
        breadcrumbHome: 'Accueil',
        breadcrumbConvert: 'Conversion par version',
        j2bHeading: 'Java Edition → Bedrock Edition',
        j2bSub: 'Convertir des packs Java (.zip) vers Bedrock (.mcpack)',
        b2jHeading: 'Bedrock Edition → Java Edition',
        b2jSub: 'Convertir des packs Bedrock (.mcpack / .zip) vers Java (.zip)',
        assetsMappedUnit: 'correspondances',
        openConverterCta: 'Ouvrir le convertisseur',
        backToGenericTitle: 'Vous cherchez une autre version (1.8–26.3) ?',
        backToGenericDesc: 'Le convertisseur principal prend en charge 30 versions Java, 13 versions Bedrock et la mise à jour de version.',
        backToGenericCta: 'Ouvrir le convertisseur principal',
        popularSectionTitle: 'Conversions par version populaires',
        popularSectionDesc: 'Accédez directement aux convertisseurs préconfigurés pour 1.21.4, 1.20.4, 1.16.5 et 26.3.',
        popularViewAll: 'Voir toutes les conversions par version →',
      };
    case 'de':
      return {
        title: 'Minecraft Resource Pack Konverter nach Version | PackBridge',
        metaDescription: 'Übersicht aller versionsspezifischen Resource-Pack-Konverter zwischen Minecraft Java (26.3 / 1.21.4 / 1.20.4 / 1.16.5) und Bedrock (26.6 / 1.21.5 / 1.20.8 / 1.16.2).',
        h1: 'Resource Packs nach Version umwandeln',
        lead: 'Wähle ein Versionspaar aus, um den voreingestellten Konverter direkt lokal im Browser zu öffnen.',
        breadcrumbHome: 'Startseite',
        breadcrumbConvert: 'Nach Version konvertieren',
        j2bHeading: 'Java Edition → Bedrock Edition',
        j2bSub: 'Java Resource Packs (.zip) in Bedrock (.mcpack) umwandeln',
        b2jHeading: 'Bedrock Edition → Java Edition',
        b2jSub: 'Bedrock Resource Packs (.mcpack / .zip) in Java (.zip) umwandeln',
        assetsMappedUnit: 'Zuordnungen',
        openConverterCta: 'Konverter öffnen',
        backToGenericTitle: 'Andere Version (1.8–26.3) gesucht?',
        backToGenericDesc: 'Der Hauptkonverter unterstützt alle 30 Java- und 13 Bedrock-Versionen sowie Versions-Updates.',
        backToGenericCta: 'Zum Hauptkonverter',
        popularSectionTitle: 'Beliebte Versions-Konvertierungen',
        popularSectionDesc: 'Direkt mit voreingestellten Versionen für 1.21.4, 1.20.4, 1.16.5 und 26.3 starten.',
        popularViewAll: 'Alle Versions-Konverter anzeigen →',
      };
    case 'en':
    default:
      return {
        title: 'Minecraft Resource Pack Converter by Version | PackBridge',
        metaDescription: 'Browse version-specific Minecraft resource pack and texture pack converters between Java Edition (26.3, 1.21.4, 1.20.4, 1.16.5) and Bedrock Edition (26.6, 1.21.5, 1.20.8, 1.16.2).',
        h1: 'Convert Minecraft Resource Packs by Version',
        lead: 'Select a Minecraft version pair below to open a pre-configured converter with verified texture, sound, and language mappings.',
        breadcrumbHome: 'Home',
        breadcrumbConvert: 'Convert by Version',
        j2bHeading: 'Java Edition → Bedrock Edition',
        j2bSub: 'Convert Java resource packs (.zip) to target Bedrock versions (.mcpack)',
        b2jHeading: 'Bedrock Edition → Java Edition',
        b2jSub: 'Convert Bedrock packs (.mcpack / .zip) to target Java versions (.zip)',
        assetsMappedUnit: 'mapped entries',
        openConverterCta: 'Open Converter',
        backToGenericTitle: 'Need another version (1.8–26.3)?',
        backToGenericDesc: 'The main converter supports all 30 Java versions, 13 Bedrock versions, and same-edition version updates.',
        backToGenericCta: 'Open Universal Converter',
        popularSectionTitle: 'Popular Version Conversions',
        popularSectionDesc: 'Jump straight into a pre-configured converter for the most requested Java and Bedrock version pairs.',
        popularViewAll: 'View all version converters →',
      };
  }
}


import type { Translation } from "./types";

const ko: Translation = {
	title: "마인크래프트 리소스 팩 & 텍스처 팩 변환기 | PackBridge",
	heading: "PackBridge",
	description: "마인크래프트 리소스 팩과 텍스처 팩을 자바 에디션과 베드락 에디션 간에 상호 변환합니다. 모든 변환은 브라우저 내에서 이루어지며, 파일이 서버로 전송되지 않습니다.",
	metaDescription: "무료 온라인 마인크래프트(Minecraft) 리소스 팩 및 텍스처 팩 변환기. 자바와 베드락 에디션 간에 간편하게 변환하세요. 브라우저 로컬 처리로 안전하고 빠릅니다.",
	h1Title: "마인크래프트 리소스 팩 / 텍스처 팩 변환기",

	// SEO Content
	introTitle: "PackBridge란?",
	introDescription: "PackBridge는 마인크래프트의 서로 다른 에디션(자바 에디션 ⇄ 베드락 에디션) 간에 리소스 팩 및 텍스처 팩을 변환하기 위한 강력한 도구입니다. 복잡한 파일 구조의 변환을 자동화하여 원하는 텍스처를 어떤 기기에서든 즐길 수 있게 해줍니다.",
	introFeaturesTitle: "주요 특징",
	introFeature1: "브라우저 내 처리: 파일은 서버로 전송되지 않으며 사용자의 브라우저 내에서 안전하게 처리됩니다.",
	introFeature2: "상호 변환 지원: 자바 ⇄ 베드락 간 리소스 팩 및 텍스처 팩의 양방향 변환을 지원합니다.",
	introFeature3: "빠르고 가벼움: 속도에 최적화되어 대용량 리소스 팩도 단 몇 초 만에 변환할 수 있습니다.",
	introFeature4: "버전 변환: 같은 에디션 내에서 구버전에서 신버전으로의 업데이트를 지원합니다. 팩 포팅(Porting)에 최적입니다.",

	directionJavaToBedrock: "Java → Bedrock",
	directionBedrockToJava: "Bedrock → Java",
	directionVersionUpdate: "버전 변경",
	sourceEdition: "원본 에디션",
	targetEdition: "대상 에디션",
	editionJava: "자바 에디션 (Java)",
	editionBedrock: "베드락 에디션 (Bedrock)",

	dropzoneTitle: "파일을 드롭하거나 클릭하여 선택",
	dropzoneTitleMobile: "탭하여 파일 선택",
	dropzoneSubtitle: ".zip 또는 .mcpack 형식 지원",
	dropzoneProcessing: "처리 중...",
	sourceVersion: "원본 버전",
	targetVersion: "대상 버전",
	autoDetected: "자동 감지됨",
	uploadToAutoDetect: "자동 감지를 위해 파일 업로드",

	btnConvert: "변환 시작",
	btnDownload: "변환된 팩 다운로드",
	inAppBrowserNotice: "인앱 브라우저에서는 저장이 안 될 수 있어요.",
	inAppBrowserAction: "Safari·Chrome에서 열어 주세요",
	inAppBrowserOpenExternal: "외부 브라우저로 열기",
	btnReset: "다른 파일 변환",

	reportTitle: "변환 보고서",
	statusConverted: "변환됨",
	statusSkipped: "건너뜀",
	statusError: "오류",

	summaryTitle: "변환 완료!",
	countTotal: "총 파일 수",
	countConverted: "변환 성공",
	countSkipped: "건너뜀",
	countErrors: "오류",

	btnExportTxt: "TXT 내보내기",

	unsupportedTitle: "지원되지 않거나 건너뛴 파일",
	unsupportedReason: "이유",

	errorNoFile: "파일을 선택해 주세요.",
	errorInvalidFile: "유효하지 않은 파일 형식입니다. .zip 또는 .mcpack을 선택해 주세요.",
	errorConversion: "변환 중 오류가 발생했습니다.",
	errorZeroConverted: "변환할 수 있는 파일이 없습니다. 마인크래프트 리소스 팩 아카이브인지 확인해 주세요.",
	warnPossibleBedrock: "선택된 파일(.mcpack)은 이미 베드락 에디션용 리소스 팩일 가능성이 있습니다. 자바 에디션에서 변환하려면 일반적으로 자바 에디션용 .zip 파일을 선택합니다.",
	warnPossibleJava: "선택된 파일은 이미 자바 에디션용 리소스 팩일 가능성이 있습니다. 베드락 에디션에서 변환하려면 베드락 에디션용 .mcpack 또는 .zip 파일을 선택해 주세요.",
	warnNotMinecraftPack: "마인크래프트 리소스 팩이 아닐 수 있습니다 (pack.mcmeta, manifest.json 또는 텍스처 폴더를 찾을 수 없음).",

	footer: "PackBridge | Minecraft Resource Pack & Texture Pack Converter",
	terms: "이용약관",
	keywords: "마인크래프트, 리소스 팩, 텍스처 팩, 텍스처, 변환기, 리소스팩 변환, 텍스처팩 변환, 자바, 베드락, PackBridge, 포팅",
	disclaimerPerfect: "*주의: 모든 파일의 완벽한 변환을 보장하지 않습니다. 변환 후 수동 수정이 필요할 수 있습니다.",
	error404Title: "페이지를 찾을 수 없습니다",
	error404Description: "죄송합니다. 찾으시는 페이지가 존재하지 않거나 이동되었을 수 있습니다.",

	// Terms of Use
	termsLastUpdated: "2026년 11월 1일",
	termsSections: [
		{
			title: "1. 서비스 이용",
			content: "마인크래프트 리소스 팩 및 텍스처 팩을 자바 에디션과 베드락 에디션 간에 변환하는 도구입니다. 모든 처리는 브라우저 내에서 이루어지며 파일은 서버로 전송되지 않습니다.",
		},
		{
			title: "2. 면책 사항 (자기 책임)",
			content: "본 서비스 및 소스 코드 이용에 따른 모든 결과는 사용자 본인의 책임입니다. 개발자(manpuc)는 어떠한 손해나 문제에 대해서도 책임을 지지 않습니다.",
		},
		{
			title: "3. 저작권 및 라이선스",
			content: "소스 코드 및 디자인 저작권은 manpuc에 있습니다. 출처 명시(https://www.manpuc.me) 시 자유로운 이용이 가능하나, 완전한 복제나 단순 변경 후 재배포는 엄격히 금지됩니다.",
		},
		{
			title: "4. 금지 사항",
			content: "네트워크 과부하 유발, 사이트 운영 방해 및 법령 위반 행위를 금지합니다.",
		},
		{
			title: "5. 약관의 변경",
			content: "본 약관은 개발자의 판단에 의해 예고 없이 변경될 수 있습니다. 서비스를 계속 이용하실 경우, 최신 약관에 동의한 것으로 간주됩니다.",
		},
		{
			title: "6. 개인정보 처리방침",
			content: "• 데이터 처리: 이 서비스를 통해 변환되는 모든 데이터는 사용자의 브라우저 내에서 로컬로 처리됩니다. 파일 내용은 서버로 전송되거나 수집되지 않습니다。\n• 분석: 이 사이트는 이용 현황 파악을 위해 Umami를 사용합니다. 이는 통계적 정보를 수집하며 개인을 식별하는 정보는 수집하지 않습니다。\n• 로컬 스토리지: 언어 설정 및 테마(다크 모드) 저장을 위해 브라우저의 localStorage를 사용합니다.",
		},
	],
	backToHome: "홈으로 돌아가기",
	viewSourceCode: "GitHub에서 소스 코드 보기",
	openSourceText: "이 서비스는 오픈 소스로 공개되어 있습니다.",
	betaFeatures: "베타 기능",
	betaGroupUiTextures: "UI 및 텍스처",
	betaGroupAudioLang: "오디오 및 번역",
	enableGuiConversion: "GUI 변환",
	enableModernGuiSprites: "1.20.2+ 분할 GUI 스프라이트 변환",
	enableTgaConversion: "TGA 이미지를 PNG로 변환",
	enableAnimationConversion: "애니메이션 변환",
	enableLanguageConversion: '언어 및 번역 변환',
	enableSoundConversion: '사운드 정의 변환',
	enableAudioReencode: '오디오 재인코딩 (FFmpeg, ~20MB)',
	enablePbrConversion: 'PBR / 셰이더 맵 변환 (RTX ⇄ LabPBR)',
	enableModelConversion: '3D 커스텀 모델 변환 (Geo ⇄ JSON/CEM)',
	betaCalloutActive: '활성화됨',
	betaCalloutPreview: '활성화 시 주의사항',
	betaWarningAudioReencode: '최초 실행 시 약 20MB의 FFmpeg 라이브러리를 로드하여 변환 시간과 CPU 부하가 크게 증가합니다.',
	betaWarningModernGuiSprites: 'GUI 스프라이트를 동적으로 잘라내어 합성하므로 고해상도 팩에서 메모리 사용량이 늘어나고 일부 UI에서 정렬이 어긋날 수 있습니다.',
	betaWarningGuiConversion: 'Java와 Bedrock 간의 GUI 구조 차이로 인해 일부 보관함 또는 컨테이너 화면이 완벽하게 맞지 않을 수 있습니다.',
	betaWarningTgaConversion: '모든 TGA 이미지를 PNG로 디코딩 변환하므로 TGA 파일이 많은 팩의 경우 완료까지 시간이 걸릴 수 있습니다.',
	betaWarningPbrConversion: 'Bedrock RTX/Deferred PBR 맵(_mer/_normal)과 Java LabPBR 셰이더 맵(_s/_n)을 상호 변환합니다. 픽셀 단위 연산으로 처리 시간이 늘어나며 Java에서는 Iris/OptiFine 등의 모드가 필요합니다.',
	betaWarningModelConversion: '3D 블록/아이템 모델 및 엔티티 지오메트리(.geo.json ⇄ .json / OptiFine CEM .jem)를 실험적으로 변환합니다. 복잡한 본 구조는 일부 어긋날 수 있습니다.',
};

export default ko;

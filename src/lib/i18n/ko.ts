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
	statusWarning: "경고",
	reportSearchPlaceholder: "파일 이름 또는 사유로 검색...",
	reportFilterAll: "전체",
	reportNoMatches: "일치하는 파일이 없습니다",
	reportPrev: "이전",
	reportNext: "다음",

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
	errorFileExpired: "파일 참조가 만료되었습니다. 파일을 다시 선택해 주세요.",
	errorZeroConverted: "변환할 수 있는 파일이 없습니다. 마인크래프트 리소스 팩 아카이브인지 확인해 주세요.",
	warnPossibleBedrock: "선택된 파일(.mcpack)은 이미 베드락 에디션용 리소스 팩일 가능성이 있습니다. 자바 에디션에서 변환하려면 일반적으로 자바 에디션용 .zip 파일을 선택합니다.",
	warnPossibleJava: "선택된 파일은 이미 자바 에디션용 리소스 팩일 가능성이 있습니다. 베드락 에디션에서 변환하려면 베드락 에디션용 .mcpack 또는 .zip 파일을 선택해 주세요.",
	warnNotMinecraftPack: "마인크래프트 리소스 팩이 아닐 수 있습니다 (pack.mcmeta, manifest.json 또는 텍스처 폴더를 찾을 수 없음).",
	noticeAutoSwitchedToBedrockToJava: "베드락 팩이 감지되어 변환 방향을 'Bedrock → Java'로 자동 전환했습니다.",
	noticeAutoSwitchedToJavaToBedrock: "자바 팩이 감지되어 변환 방향을 'Java → Bedrock'으로 자동 전환했습니다.",

	footer: "PackBridge | Minecraft Resource Pack & Texture Pack Converter",
	terms: "이용약관",
	keywords: "마인크래프트, 리소스 팩, 텍스처 팩, 텍스처, 변환기, 리소스팩 변환, 텍스처팩 변환, 자바, 베드락, PackBridge, 포팅",
	disclaimerPerfect: "*주의: 모든 파일의 완벽한 변환을 보장하지 않습니다. 변환 후 수동 수정이 필요할 수 있습니다.",
	error404Title: "페이지를 찾을 수 없습니다",
	error404Description: "죄송합니다. 찾으시는 페이지가 존재하지 않거나 이동되었을 수 있습니다.",

	// Terms of Use
	termsLastUpdatedLabel: "최종 업데이트",
	termsLastUpdated: "2026년 11월 27일",
	termsSections: [
		{
			title: "1. 서비스 이용",
			content: "본 서비스는 마인크래프트 리소스 팩 및 텍스처 팩을 자바 에디션과 베드락 에디션 간에 변환하고, 동일 에디션 내 버전 변환 및 실험적 베타 기능(GUI 변환, FFmpeg 오디오 재인코딩, PBR 셰이더 맵, 3D 커스텀 모델)을 제공합니다. 모든 변환 처리는 브라우저 내에서 이루어지며 팩 파일은 외부 서버로 전송되지 않습니다. 변환된 메타데이터(manifest.json, pack.mcmeta, .jem)에는 PackBridge 변환 크레딧이 표기됩니다.",
		},
		{
			title: "2. 면책 사항 및 제3자 권리 (자기 책임)",
			content: "본 서비스 및 소스 코드 이용에 따른 모든 결과는 사용자 본인의 책임입니다. 베타 기능을 포함해 모든 파일의 완벽한 변환을 보장하지 않으며, 변환된 데이터에 표시 오류나 문제가 발생할 수 있습니다. 개발자(manpuc)는 어떠한 손해나 문제에 대해서도 책임을 지지 않습니다.\n제3자가 제작한 리소스 팩을 변환·사용·재배포할 경우, 원작자의 라이선스 및 이용약관을 확인하고 준수할 책임은 전적으로 사용자에게 있습니다.\n본 서비스는 비공식 도구이며 Mojang AB 또는 Microsoft의 승인이나 제휴를 받은 공식 마인크래프트 제품이 아닙니다(NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.).",
		},
		{
			title: "3. 저작권 및 라이선스",
			content: "소스 코드 및 디자인 저작권은 manpuc에 있습니다. 출처 명시(https://www.manpuc.me) 시 자유로운 이용이 가능하나, 완전한 복제나 단순 변경 후 재배포는 엄격히 금지됩니다.",
		},
		{
			title: "4. 금지 사항",
			content: "네트워크 과부하 유발, 사이트 운영 방해, 제3자의 지식재산권 침해 및 법령 위반 행위를 금지합니다.",
		},
		{
			title: "5. 약관의 변경",
			content: "본 약관은 개발자의 판단에 의해 예고 없이 변경될 수 있습니다. 서비스를 계속 이용하실 경우, 최신 약관에 동의한 것으로 간주됩니다.",
		},
		{
			title: "6. 개인정보 처리방침",
			content: "• 데이터 처리: 본 서비스로 변환되는 모든 팩 파일은 사용자의 브라우저 내에서 로컬로 처리됩니다. 파일 본체나 내부 에셋은 외부 서버로 전송되거나 수집되지 않습니다.\n• 외부 라이브러리 및 글꼴: 베타 기능인 오디오 재인코딩 사용 시 외부 CDN(unpkg.com / cdn.jsdelivr.net)에서 SHA-256 무결성 검증을 거쳐 FFmpeg 라이브러리를 불러오며, 화면 표시를 위해 Google Fonts를 사용합니다. 이 과정에서 사용자의 팩 데이터는 전송되지 않으나 표준 HTTP 요청 정보(IP 주소 등)가 해당 제공자에게 전달됩니다.\n• 분석: 쿠키를 사용하지 않는 Umami를 통해 익명 통계 및 파일명·경로·URL·개인정보가 마스킹된 기술 오류 요약만을 수집하며 개인을 식별하지 않습니다.\n• 브라우저 스토리지(localStorage / sessionStorage): 언어·테마·UI 상태·베타 설정 저장, 개인 식별자 없는 익명 변환 횟수 카운트(통계용), 버그 신고 보조용 임시 로그 및 재전송 대기시간(초기화 또는 탭 종료 시 삭제) 저장에 사용됩니다.\n• 버그 신고: 사용자가 직접 버그 신고를 제출한 경우에만 입력 내용, 선택 입력한 회신용 이메일(Formspree 직접 전송 시에만 사용, 회신 목적 한정), 브라우저/OS 정보 및 사용자가 첨부 선택한 파일명·오류 로그가 Formspree(formspree.io) 또는 공개 GitHub Issues(github.com)로 전송됩니다. 팩 파일 본체는 업로드되지 않습니다.",
		},
	],
	backToHome: "홈으로 돌아가기",
	viewSourceCode: "GitHub에서 소스 코드 보기",
	openSourceText: "이 서비스는 오픈 소스로 공개되어 있습니다.",
	betaFeatures: "베타 기능",
	betaActiveCount: "{count}개 활성화",
	enableGuiConversion: "GUI 변환",
	enableAudioReencode: '오디오 재인코딩 (FFmpeg, ~10MB)',
	enablePbrConversion: 'PBR / 셰이더 맵 변환 (RTX ⇄ LabPBR)',
	enableModelConversion: '3D 커스텀 모델 변환 (Geo ⇄ JSON/CEM)',
	betaWarningAudioReencode: '최초 실행 시 약 10MB의 FFmpeg 라이브러리를 로드하여 .wav/.mp3 및 비 44.1kHz/비 Vorbis .ogg를 모노/스테레오 채널을 유지한 채 재인코딩합니다(변환 시간과 CPU 부하 증가).',
	betaWarningGuiConversion: 'icons.png와 widgets.png를 동적으로 잘라내므로 고해상도 팩에서 메모리 사용량이 늘어날 수 있습니다. 또한 Java와 Bedrock 간의 GUI 구조 차이로 인해 일부 보관함 또는 컨테이너 화면이 완벽하게 맞지 않을 수 있습니다.',
	betaWarningPbrConversion: 'Bedrock RTX/Deferred PBR 맵(_mer/_normal)과 Java LabPBR 셰이더 맵(_s/_n)을 상호 변환합니다. 픽셀 단위 연산으로 처리 시간이 늘어나며 Java에서는 Iris/OptiFine 등의 모드가 필요합니다.',
	betaWarningModelConversion: '3D 블록/아이템 모델 및 엔티티 지오메트리(.geo.json ⇄ .json / OptiFine CEM .jem)를 실험적으로 변환합니다. 복잡한 본 구조는 일부 어긋날 수 있습니다.',
};

export default ko;

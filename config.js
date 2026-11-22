/* =========================================================
 *  밍밍시 친구네 귤 주문서 — 설정 파일
 *  여기만 고치면 상품, 가격, 계좌, 안내 문구가 모두 바뀌어요.
 *  ⚠️ 상품 id / 가격을 바꾸면 apps-script/Code.gs 의 PRODUCTS 도 똑같이 바꿔주세요.
 * ========================================================= */
window.MM_CONFIG = {
  // 1) 구글 Apps Script 웹앱 URL (README 3단계에서 복사)
  //    비워두면 "데모 모드"로 동작해요 (이 브라우저에만 저장).
  API_URL: "",

  // 2) 브랜드
  BRAND: "밍밍시",
  TITLE: "밍밍시 친구네 귤 주문서",
  FARM: "친구네 귤농장",
  TAGLINE: "강제 착색 · 코팅 · 왁스 없이, 당일 수확해서 바로 보내요",

  // 3) 상품 (icon: "gyul" 귤 / "small" 꼬마 / "home" 가정용 / "gift" 선물용)
  PRODUCTS: [
    { id: "noji10",   name: "노지감귤",     weight: "10kg", price: 35000, desc: "새콤달콤 제주 노지감귤",          icon: "gyul",  badge: "BEST" },
    { id: "small5",   name: "꼬마 황금향",  weight: "5kg",  price: 25000, desc: "크기가 작은 사이즈 · 45과 내외",   icon: "small" },
    { id: "home5",    name: "가정용 황금향", weight: "5kg",  price: 35000, desc: "집에서 넉넉하게 즐기는 황금향",    icon: "home" },
    { id: "gift5",    name: "선물용 황금향", weight: "5kg",  price: 40000, desc: "고르고 고른 선물용 황금향",        icon: "gift",  badge: "선물" }
    // 품절되면 soldOut: true 를 추가하세요. 예) { id: "gift5", ..., soldOut: true }
  ],
  MAX_QTY_PER_ITEM: 20,

  // 4) 안내 사항
  NOTICES: [
    "택배비 포함 가격입니다.",
    "가정용 포장으로 나갑니다.",
    "강제 착색, 코팅, 왁스 없이 당일 수확한 상품을 직접 배송합니다.",
    "당일 수확 후 꼼꼼하게 포장하여 발송되지만 농산물 특성상 배송 중 일부 깨짐이 발생할 수 있는 점 양해 부탁드립니다. 파손이 심한 상태로 도착했다면 사진과 함께 문자 주세요."
  ],

  // 5) 입금 계좌
  BANK: { name: "우리은행", number: "1002-555-170283", holder: "윤지명" },

  // 6) 택배사 (관리자 화면 기본값)
  DEFAULT_CARRIER: "CJ대한통운",

  // 7) 문의처
  CONTACT_PHONE: "010-2697-3440",

  // 8) 데모 모드 관리자 비밀번호 (API_URL 이 비어있을 때만 사용)
  DEMO_ADMIN_PASSWORD: "1234"
};

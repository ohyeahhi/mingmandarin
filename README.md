# 🍊 밍밍시 친구네 귤 주문서

손님이 귤/황금향을 주문하고, 관리자가 주문 현황을 보고 **엑셀로 송장을 만들고**, 손님이 **이름 + 휴대폰 번호로 송장번호를 조회**하는 주문 페이지예요.

| 페이지 | 주소 | 하는 일 |
|---|---|---|
| 주문자 | `index.html` | 상품·수량 선택 → 이름/번호/주소 → 계좌 안내 + 입금 셀프체크 → 주문 완료 |
| 송장 조회 | `index.html#lookup` | 이름 + 휴대폰 번호 → 주문 상태 · 송장번호 · 배송조회 링크 |
| 관리자 | `admin.html` | 비밀번호 로그인 → 대시보드 · 상태 변경 · 송장 입력 · 엑셀 다운로드/업로드 |
| 사용법 | `guide.html` | 손님/농장용 사용 설명서 + 인스타·카톡 공유 문구 |

주문 데이터는 **Supabase 무료 데이터베이스**에 쌓이고, 관리자 페이지에서 **엑셀로 다운로드**해요. 서버비 0원이에요.

---

## 처음 한 번만 설정하기 (Supabase, 10분)

주문은 **Supabase**(무료 데이터베이스)에 저장되고, 관리자 페이지에서 **엑셀(.xlsx)로 다운로드**해요.

### 1. Supabase 프로젝트 만들기
1. [supabase.com](https://supabase.com) → **Start your project** → **Continue with GitHub**로 가입해요.
2. **New project**를 눌러요.
   - Name: `mingmandarin`
   - Database Password: 아무거나 강하게 정해요. **Generate a password**를 눌러도 되고, 이 주문서에서는 쓰지 않아요.
   - Region: **Northeast Asia (Seoul)**
   - **Create new project** → 1~2분 기다려요.

### 2. SQL 한 번 실행하기
1. 왼쪽 메뉴 **SQL Editor** → **New query**를 눌러요.
2. [`supabase/setup.sql`](supabase/setup.sql) 내용을 통째로 복사해서 붙여넣어요.
3. 맨 아래 `'여기에-비밀번호'`를 **관리자 비밀번호**로 바꿔요. 따옴표는 그대로 두세요.
4. 오른쪽 아래 **Run**을 누르면 → `Success. No rows returned`가 나오면 성공이에요.
   (위험한 작업이라는 경고 창이 뜨면 **Run this query**를 눌러요.)

### 3. 주소와 키 복사해서 `config.js`에 넣기
1. 왼쪽 아래 ⚙️ **Project Settings → Data API**(또는 **API**) 에서 **Project URL**을 복사해요. 예: `https://abcd1234.supabase.co`
2. **Project Settings → API Keys**에서 **Publishable key**(`sb_publishable_...`)를 복사해요. 예전 화면이면 `anon` `public` 키를 복사해요.
   (⚠️ `secret` / `service_role` 키는 절대 쓰지 마세요.)
3. `config.js`에 넣어요.
```js
SUPABASE_URL: "https://abcd1234.supabase.co",
SUPABASE_KEY: "sb_publishable_xxxxxxxx",
```
> 이 두 값은 공개돼도 괜찮아요. 주문 표는 직접 읽을 수 없고, 정해진 기능(주문하기·송장 조회·비밀번호가 필요한 관리자 기능)만 쓸 수 있게 막아두었어요.

**가격을 바꾸려면** `config.js`의 가격과 Supabase **Table Editor → products** 표의 `price`를 같이 바꿔요. 주문 금액은 products 표 기준으로 계산돼요.
**품절**은 products 표에서 `sold_out`을 체크하면 돼요.
**관리자 비밀번호 변경**은 setup.sql 맨 아래 `insert into public.settings ...` 부분만 새 비밀번호로 다시 실행하면 돼요.

> 무료 플랜은 **1주일 동안 아무 요청이 없으면 프로젝트가 일시정지**돼요. 판매 기간에는 상관없고, 멈췄다면 대시보드에서 **Restore**를 누르면 돼요.

<details><summary>(선택) Supabase 대신 구글 시트를 쓰고 싶다면</summary>

`apps-script/Code.gs`를 구글 시트의 Apps Script에 붙여넣고 웹 앱으로 배포한 뒤, URL을 `config.js`의 `API_URL`에 넣고 `SUPABASE_URL`은 비워두세요.
</details>

### 3. 인터넷에 올리기
아래 중 편한 방법 하나.

- **GitHub Pages**: 저장소 **Settings → Pages → Build and deployment → Source: Deploy from a branch** → 브랜치 선택, 폴더 `/ (root)` → **Save**. 1~2분 뒤 `https://ohyeahhi.github.io/mingmandarin/` 에서 열려요.
- **Netlify Drop**: [app.netlify.com/drop](https://app.netlify.com/drop)에 이 폴더를 끌어다 놓으면 바로 주소가 생겨요.

인스타 프로필 링크에 주문 주소를 걸면 끝! 특정 상품을 담은 채로 열고 싶으면 `?item=gift5`처럼 붙여요.

> `SUPABASE_URL`이 비어 있으면 **데모 모드**예요. 주문이 내 브라우저에만 저장되고, 관리자 비밀번호는 `1234`, 샘플 주문이 들어 있어요. 디자인을 미리 볼 때 쓰세요.

---

## 관리자 사용법 — 송장 한 번에 등록하기

1. **입금 확인**: 통장과 비교해서 주문 상태를 `입금확인`으로 바꿔요. 여러 건을 체크해서 한 번에 바꿀 수도 있어요.
2. **송장용 엑셀 다운로드**: 박스마다 한 줄(1줄 = 송장 1개)이고, 맨 끝에 빈 **`송장번호`** 칸이 있어요.
   - 열: 주문번호 · 받는분성명 · 받는분전화번호 · 우편번호 · 받는분주소 · 품목명 · 박스수량 · 박스순번 · 배송메세지 · 보내는분성명 · 주문자 · 주문자연락처 · 택배사 · **송장번호**
3. 택배 접수 후 받은 번호를 **송장번호 칸에 채워요.**
4. **그 파일 그대로 `송장번호 일괄 등록`에 업로드** → 주문번호에 맞춰 한 번에 입력되고 상태가 `발송완료`로 바뀌어요.
   - 한 주문에 박스가 여러 개면 송장번호가 `,`로 합쳐져서 저장돼요.
   - 택배사 시스템에서 받은 엑셀도 `주문번호` 열과 `송장번호`(또는 `운송장번호`) 열만 있으면 올릴 수 있어요.
5. 손님은 **송장 조회** 탭에서 이름 + 번호로 송장번호와 배송조회 버튼을 볼 수 있어요.

한 건씩 할 때는 주문 목록에서 송장번호를 입력하고 **저장**하면 자동으로 `발송완료`가 돼요.

**전체 주문 엑셀**에는 상품별 수량 열까지 다 들어 있어서 정산할 때 좋아요.

---

## 파일 구조
```
index.html          주문자 페이지 (주문하기 / 송장 조회)
admin.html          관리자 대시보드
config.js           ← 상품·가격·계좌·문구 설정
assets/
  style.css         토스/애플 느낌 기본 스타일
  admin.css         관리자 화면 스타일
  pixel.js          픽셀 아트 (귤 따는 농부, 옮기는 일꾼, 택배 트럭, 굴러가는 귤, 귤 마스코트)
  api.js            Supabase 연동 (+ 구글 시트 / 데모 모드)
  order.js          주문자 페이지 동작
  admin.js          관리자 페이지 동작 (엑셀 다운로드/업로드 포함)
supabase/
  setup.sql         데이터베이스 설정 (SQL Editor에 붙여넣기)
apps-script/        (선택) 구글 시트 백엔드
```

## 개인정보 · 보안 메모
- 주문 표는 외부에서 직접 읽을 수 없어요. 관리자 기능은 데이터베이스 안에서 비밀번호(암호화 저장)를 확인해요.
- 송장 조회는 이름과 번호가 **둘 다** 맞아야 보이고, 받는 분 이름은 가려서(김*지) 보여줘요.
- 판매가 끝나면 엑셀로 백업한 뒤 Table Editor에서 orders 데이터를 정리해주세요.

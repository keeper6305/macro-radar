# 거시경제·투자 레이더 (Macro & Investment Radar)

세무사 수험 공부와 병행해 거시 6대 지표·반전 신호·데일리 브리핑·시나리오·킬 스위치를 한 화면에서 추적하는 모바일 퍼스트 PWA입니다.
외부 CDN·프레임워크 없이 정적 파일(HTML/CSS/JS + JSON)만으로 동작합니다.

- 정본 배포: `https://keeper6305.github.io/macro-radar/` (GitHub Pages · main / root)
- 임시 검증 드롭: `python3 ../deploy.py <label>` (ship.page, 7일 만료)

## v2 (2026-11-17) 주요 변경

- **실측 시계열 차트**: 스파크라인을 SVG 꺾은선+영역 그라데이션 차트로 교체. Y축 눈금·기준선 점선·X축 날짜·탭/터치 툴팁.
  - 원천: FRED(DGS10·UNRATE·PAYEMS·CPI·PPI·PCE), Yahoo Finance(^KS11·^KQ11·^GSPC·^IXIC·DX-Y.NYB·KRW=X·개별주), CoinGecko(BTC·ETH 180일), Naver 금융(국내 재무).
  - 데이터 생성: `python3 ../build_v2_data.py && python3 ../enrich_v2.py` → `site/data/market_state.json` 갱신.
- **관심기업 탭(🏢)**: 종목 추가·수정·삭제(로컬 저장), JSON 백업/복원.
- **종목 상세**: 주가 6개월 차트(평단·손절·목표 기준선), PER/PBR 밴드 게이지, 분기·연간 매출/영업이익 막대 + 영업이익률 선, 내부자 매수 표(평단 대비 괴리), 주주환원·DART 3Q·선행지표·킬 스위치.
- **localStorage 키**: `macro_radar_memos_v1`(메모), `macro_radar_assets_v1`(관심기업), `macro_radar_theme`.
- 서비스 워커 캐시 `macro-radar-v2`로 상향.

## 구조

```
site/
├── index.html                 앱 셸 (스타일·로직 포함, 외부 의존 0)
├── data/market_state.json     ★ 지표 시계열·자산 재무·밴드·내부자 매수 데이터
├── manifest.json              PWA 매니페스트 (standalone, 아이콘 3종)
├── sw.js                      서비스 워커 (macro-radar-v1)
├── data/market_state.json     ★ 모든 수치·브리핑·자산·시나리오 데이터
├── icon-192.png / icon-512.png / icon-maskable-512.png
├── apple-touch-icon.png / favicon-32.png
└── .nojekyll                  GitHub Pages Jekyll 비활성화
```

## 검증 결과 (2026-11-17, 실제 배포 URL에서 실측)

| 항목 | 결과 |
|---|---|
| 가로 오버플로 360/390/430px × 4탭 | 0건 (scrollWidth = clientWidth) |
| 지표 해설 모달 | 열림·닫힘·내부 오버플로 0 |
| 퀴즈 메모 · 가설 노트 | localStorage 저장 확인 |
| 라이트↔다크 전환 | 정상 · 설정 유지 |
| manifest · 서비스워커 | 아이콘 3종 · active 상태 확인 |
| 콘솔 오류 | 0건 |
| 크립토 실시간 | CoinGecko → Binance 폴백 동작 확인 (실패 시 기준 데이터 유지) |

QA 하네스(`qa-mobile.html`, `qa-shot.html`)는 검증용 드롭에만 올렸고 정본 `site/`에는 포함하지 않았습니다.

## 매일 데이터 갱신 (07:00 미국 / 16:00 국내)

1. `data/market_state.json`의 `meta.version`과 `meta.asOfLabel`을 갱신 시각으로 바꿉니다.
2. 해당 항목의 `value`·`display`·`series`(날짜·값)를 새 수치로 교체합니다.
   - `series`는 `[{ "d": "11-17", "v": 4968.48 }]` 형식이고 `"e": 1`은 추정 구간(점선)입니다.
3. 파일만 올리면 앱은 재설치 없이 새 데이터를 받습니다.
   - 서비스 워커가 `index.html`과 `data/market_state.json`을 **network-first**로 처리합니다.
   - 앱이 이미 켜져 있으면 화면 복귀(visibilitychange) 시 버전을 비교해 자동 반영합니다.
   - 헤더 우측 `↻` 버튼은 크립토 실시간 시세(CoinGecko→Binance)만 새로 받습니다.

## 배포

- 임시: `python3 ../deploy.py <label>` (ship.page 드롭)
- 영구: 이 폴더를 GitHub 저장소 `keeper6305/macro-radar`의 `main` 루트에 push하고,
  저장소 Settings → Pages → Source: `Deploy from a branch` / `main` / `/ (root)`로 설정합니다.

## 캐시 규칙

| 대상 | 전략 |
|---|---|
| `index.html`, `/` (navigate) | network-first → 실패 시 캐시 |
| `data/market_state.json` | network-first → 실패 시 캐시 |
| 아이콘·매니페스트 | cache-first |

구조가 바뀌면 `sw.js`의 `CACHE`를 `macro-radar-v2`로 올리세요. 활성화 시 이전 캐시는 자동 삭제됩니다.

## 데이터 출처

- 2026-11-17 07:00 미국 마감 브리핑 / 16:00 국내 마감 브리핑
- 감성코퍼레이션·HD현대일렉트릭·효성중공업·삼성전자·SK하이닉스 2026년 3분기 DART 분기보고서
- 스파크라인의 점선 구간은 브리핑에 기록된 방향만 이은 추정값입니다.

투자 판단의 근거 자료이며 매매 권유가 아닙니다.

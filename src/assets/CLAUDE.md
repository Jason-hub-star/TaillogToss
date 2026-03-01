# assets/ — 정적 에셋 (Lottie, 이미지, 아이콘)

## 스킬 참조
- 에셋 가이드: `docs/ref/ASSET-GUIDE.md`
- 화면별 에셋 매핑: `Skill("toss_wireframes")`

## 폴더 구조

```
assets/
  lottie/           ← Lottie JSON 애니메이션 (3개)
  images/           ← 정적 이미지/일러스트 (생성 대기)
  icon/             ← 앱 아이콘 (생성 대기)
  badges/           ← 스트릭 뱃지 (생성 대기)
```

## Lottie 추가 절차
1. JSON 파일을 `lottie/`에 배치
2. `components/shared/LottieAnimation.tsx`의 `LottieAssetKey` 타입 + `LOTTIE_SOURCES`에 등록
3. 화면에서 `<LottieAnimation asset="키이름" size={200} />` 사용

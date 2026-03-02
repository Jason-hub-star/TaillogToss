# 커리큘럼 이미지 자동화 플랜 (보류)

## 상태: Pending (이미지 생성 대기)

## 필요 이미지: 7종 x 2사이즈 = 14장

| ID | 한글명 | card (96x96) | hero (720x320) |
|---|---|---|---|
| basic_obedience | 배변 훈련 | _card.webp | _hero.webp |
| leash_manners | 리드줄 매너 | _card.webp | _hero.webp |
| separation_anxiety | 분리불안 극복 | _card.webp | _hero.webp |
| reactivity_management | 반응성 관리 | _card.webp | _hero.webp |
| impulse_control | 충동 조절 | _card.webp | _hero.webp |
| socialization | 사회화 | _card.webp | _hero.webp |
| fear_desensitization | 공포 둔감화 | _card.webp | _hero.webp |

## 이미지 스타일
- 일러스트, 파스텔톤, 토스 블루(#3182F6) 포인트
- 텍스트 없음, WebP 85%, 모서리 여백 충분

## 로컬 저장 위치
```
src/assets/curriculum/{id}_card.webp
src/assets/curriculum/{id}_hero.webp
```

## 최종 배포 위치
```
Supabase Storage: curriculum-images 버킷 (public)
URL: https://kvknerzsqgmmdmyxlorl.supabase.co/storage/v1/object/public/curriculum-images/{파일명}
```

## 코드 연결 (이미지 도착 후)
1. `src/lib/data/published/showcase.ts` — image_url: null → card URL
2. `src/pages/training/detail.tsx` — heroPlaceholder → Image + hero URL
3. heroPlaceholder에 이미지 없으면 현재 이모지 폴백 유지

## 현재 구현 완료
- [x] CurriculumShowcaseCard: image_url 조건부 렌더링 + onError 폴백
- [x] detail.tsx: heroPlaceholder (이모지 상태)
- [ ] Supabase Storage 버킷 생성
- [ ] 이미지 14장 생성 + 업로드
- [ ] showcase.ts image_url 연결
- [ ] heroPlaceholder → Image 교체

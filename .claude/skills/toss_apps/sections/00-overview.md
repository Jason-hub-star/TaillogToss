Section-ID: toss_apps-00
Auto-Enrich: false
Last-Reviewed: 2026-03-01
Primary-Sources: developers-apps-in-toss.toss.im

---
name: toss_apps
description: Toss 미니앱 개발 기초 — 프레임워크, TDS 컴포넌트, mTLS 보안, S2S API, Supabase 연동 패턴.
---

# Toss Apps Skill — 개발 기초

Toss 미니앱 개발에 필요한 프레임워크, TDS(Toss Design System), 보안, API, Supabase 연동을 다룬다.
화면 와이어프레임은 `/toss_wireframes`, 사용자 여정은 `/toss_journey`를 참조.

## 1. Service Overview & Process

Apps in Toss run within the Toss application, leveraging its massive traffic.

### Service Open Process
1.  **Agreement & Contract**: Sign partnership agreement with Toss.
2.  **Registration**: Register app in [Toss Developers Console](https://developers-apps-in-toss.toss.im/).
3.  **Development**: Choose Web (WebView), React Native, or Unity.
4.  **QA & Review**: Test in Sandbox app and request formal review.
5.  **Launch**: Once approved, the app is launched within Toss.

## 2. Development Frameworks & SDKs

### Implementations
- **Web (WebView)**: Uses `@apps-in-toss/web-framework`. Mandatory **TDS WebView** for non-game apps.
- **React Native**: Uses `@granite-js/react-native` as the runtime baseline (the `@apps-in-toss/react-native-framework` template can be used when scaffolding), with file-based routing.
- **Game Engine**: Unity/Cocos support via plugins.

### JavaScript SDK (`AppsInToss` object)
The `AppsInToss` SDK (likely available globally or via the framework) provides:
- **Routing**: Internal navigation and query parameter handling.
- **System Control**: Controlling the native back button behavior and app lifecycle.
- **Standard APIs**: Standard Web APIs (`window.open`, etc.) are generally supported within the WebView context.

### Design Tools
- **Toss AppBuilder (Deus)**: Build screens using TDS components. Supports branding and prototyping.
- **Figma**: Official component library for design consistency.


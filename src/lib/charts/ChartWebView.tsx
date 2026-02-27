/**
 * ChartWebView — WebView + Chart.js 기반 차트 렌더러
 * Radar, Heatmap, Line 차트를 HTML로 생성하여 WebView에 표시
 * Parity: UI-001
 */
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import WebView from '@granite-js/native/react-native-webview';

export type ChartType = 'radar' | 'heatmap' | 'line' | 'bar';

export interface ChartWebViewProps {
  type: ChartType;
  html: string;
  height?: number;
}

/**
 * WebView 차트 래퍼 — @granite-js/native/react-native-webview 사용
 * generateChartHTML.ts에서 생성한 HTML을 WebView로 렌더링
 */
export function ChartWebView({ html, height = 300 }: ChartWebViewProps) {
  const source = useMemo(() => ({ html }), [html]);

  return (
    <WebView
      source={source}
      style={[styles.webview, { height }]}
      scrollEnabled={false}
      originWhitelist={['*']}
      javaScriptEnabled
    />
  );
}

const styles = StyleSheet.create({
  webview: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    overflow: 'hidden',
  },
});

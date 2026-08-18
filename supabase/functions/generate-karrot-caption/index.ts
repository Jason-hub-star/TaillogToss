/**
 * generate-karrot-caption — 신규 블로그 글 → 당근 동네홍보용 200자 캡션 자동 생성
 * 출처: /Users/family/.claude/plans/unified-finding-yao.md §3.7 (C3.4)
 *       잠금 L8: 당근은 API 부재 → 캡션만 봇이 생성, 발행은 사용자가 복붙
 *
 * 흐름: 블로그 RSS 피드 → 신규 글 1건 → 200자 캡션 생성 → 텔레그램 전송 →
 *       사용자가 당근 비즈프로필에 수동 복붙 발행
 */

import { type EdgeContext, fail, ok, type EdgeResult } from '../_shared/contracts.ts';
import { assertMarketingContentSafe } from '../_shared/marketingPiiGuard.ts';

export interface GenerateKarrotCaptionRequest {
  /** 블로그 글 슬러그. 미지정 시 가장 최근 글 1건 */
  slug?: string;
}

export interface GenerateKarrotCaptionResponse {
  slug: string;
  title: string;
  caption: string;
  charCount: number;
  telegramSent: boolean;
}

interface FetchClient {
  fetchText(url: string): Promise<string>;
}

interface TelegramClient {
  sendMessage(text: string): Promise<{ ok: boolean }>;
}

interface RssItem {
  title: string;
  link: string;
  description: string;
  category: string;
}

function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  for (const m of itemMatches) {
    const block = m[1];
    const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? '';
    const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? '';
    const description = block.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.trim() ?? '';
    const category = block.match(/<category>([\s\S]*?)<\/category>/)?.[1]?.trim() ?? '';
    items.push({ title, link, description, category });
  }
  return items;
}

function buildKarrotCaption(item: RssItem): string {
  // 당근 동네홍보 톤 — 친근하고 정보 위주, 광고티 회피 (L6)
  // 200자 목표, 토스 미니앱 안내 + 블로그 링크
  const lead = item.description.length > 100 ? `${item.description.slice(0, 100)}…` : item.description;
  return `우리 동네 보호자분께 도움될 글 공유해요. ${lead}\n\n토스 앱에서 "테일로그" 검색하면 1분이면 시작해요. 자세한 가이드: ${item.link}`;
}

export function createGenerateKarrotCaptionHandler(deps: {
  fetchClient: FetchClient;
  telegramClient: TelegramClient;
  feedUrl?: string;
}) {
  return async (
    request: GenerateKarrotCaptionRequest,
    context: EdgeContext
  ): Promise<EdgeResult<GenerateKarrotCaptionResponse>> => {
    if (context.role !== 'service_role') {
      return fail('AUTH_FORBIDDEN', 'Only service_role can generate karrot captions', 403);
    }

    const feedUrl = deps.feedUrl ?? 'https://tailog.kr/feed.xml';
    let xml: string;
    try {
      xml = await deps.fetchClient.fetchText(feedUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return fail('FETCH_ERROR', `Failed to fetch RSS: ${message}`, 502);
    }

    const items = parseRss(xml);
    if (items.length === 0) return fail('NO_POSTS', 'No blog posts found', 404);

    let target: RssItem | undefined;
    if (request.slug) {
      target = items.find((i) => i.link.endsWith(`/${request.slug}`));
      if (!target) return fail('NOT_FOUND', `Post with slug=${request.slug} not found`, 404);
    } else {
      target = items[0];
    }

    const caption = buildKarrotCaption(target);
    const slug = target.link.split('/').pop() ?? '';

    // L11 PII 검사
    assertMarketingContentSafe(caption, `karrot-caption-${slug}`);

    // 텔레그램으로 사용자에게 전송 (L8 — 사용자가 당근에 수동 복붙)
    const telegramText = `📣 당근 동네홍보 캡션 후보\n\n제목: ${target.title}\n\n---\n\n${caption}\n\n---\n\n위 메시지를 당근 비즈프로필에 복붙해주세요.`;
    let telegramSent = false;
    try {
      const result = await deps.telegramClient.sendMessage(telegramText);
      telegramSent = result.ok;
    } catch {
      telegramSent = false;
    }

    return ok({
      slug,
      title: target.title,
      caption,
      charCount: caption.length,
      telegramSent,
    });
  };
}

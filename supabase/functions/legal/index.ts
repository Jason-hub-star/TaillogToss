/**
 * legal — 토스 미니앱 법적 문서 HTML 서빙 Edge Function.
 * 토스 콘솔에 등록할 약관/동의문 URL 제공. verify_jwt=false.
 * GET /legal?doc=terms|privacy|marketing|ads
 */

import { LEGAL_DOCUMENTS, type LegalDocumentType } from './documents.ts';

const VALID_DOCS: LegalDocumentType[] = ['terms', 'privacy', 'marketing', 'ads'];

function renderHTML(doc: (typeof LEGAL_DOCUMENTS)[LegalDocumentType]): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${doc.title} — 테일로그</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Pretendard', sans-serif;
      font-size: 15px;
      line-height: 1.7;
      color: #333;
      background: #fff;
      padding: 24px 20px 48px;
      max-width: 640px;
      margin: 0 auto;
    }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #191f28; }
    .meta { font-size: 13px; color: #8b95a1; margin-bottom: 24px; }
    h2 { font-size: 17px; font-weight: 600; margin: 24px 0 8px; color: #191f28; }
    h3 { font-size: 15px; font-weight: 600; margin: 16px 0 6px; color: #333d4b; }
    p { margin: 8px 0; }
    ul, ol { margin: 8px 0 8px 20px; }
    li { margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 14px; }
    th, td { border: 1px solid #e5e8eb; padding: 8px 10px; text-align: left; }
    th { background: #f9fafb; font-weight: 600; color: #333d4b; }
    strong { font-weight: 600; }
  </style>
</head>
<body>
  <h1>${doc.title}</h1>
  <div class="meta">최종 수정일: ${doc.updatedAt} | 시행일: ${doc.effectiveAt}</div>
  ${doc.body}
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const url = new URL(req.url);
  const docType = url.searchParams.get('doc') as LegalDocumentType | null;

  if (!docType || !VALID_DOCS.includes(docType)) {
    return new Response(
      `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>테일로그 법적 문서</title></head><body style="font-family:sans-serif;padding:24px;">
<h1>테일로그 법적 문서</h1>
<ul>
<li><a href="?doc=terms">서비스 이용약관</a></li>
<li><a href="?doc=privacy">개인정보 수집·이용 동의</a></li>
<li><a href="?doc=marketing">마케팅 정보 수신 동의</a></li>
<li><a href="?doc=ads">광고성 정보 수신 동의</a></li>
</ul></body></html>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  const doc = LEGAL_DOCUMENTS[docType];
  const html = renderHTML(doc);

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
});

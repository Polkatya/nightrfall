'use client';

import { useEffect, useRef } from 'react';

/**
 * Renders the Adsterra 300x250 banner (highperformanceformat.com).
 *
 * The ad network's script relies on document.write(), which — if injected
 * directly into the page after load — implicitly clears and rewrites the
 * *entire* document (it's an old-style ad delivery pattern from before SPAs
 * existed). Doing that inside a Next.js app would wipe out the whole React
 * tree. To avoid that, we create our own isolated iframe and write the ad
 * markup into *its* document instead, so document.write() only ever touches
 * that sandboxed iframe, never the real page.
 */
export default function AdBanner({ className }: { className?: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent;}</style></head>
        <body>
          <script>
            atOptions = {
              'key' : 'd23a1fd1e3611a7e483d6319d05ceda4',
              'format' : 'iframe',
              'height' : 250,
              'width' : 300,
              'params' : {}
            };
          </script>
          <script src="https://www.highperformanceformat.com/d23a1fd1e3611a7e483d6319d05ceda4/invoke.js"></script>
        </body>
      </html>
    `);
    doc.close();
  }, []);

  return (
    <div className={className}>
      <iframe
        ref={iframeRef}
        title="advertisement"
        width={300}
        height={250}
        style={{ border: 'none', overflow: 'hidden' }}
        scrolling="no"
      />
    </div>
  );
}

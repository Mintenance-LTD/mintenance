import { sanitizeText } from '../../utils/sanitize';
import sanitizeDefault from '../../utils/sanitize';

describe('sanitize', () => {
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

      it('should preserve normal text without modifications', () => {
        const text = 'This is a normal text without any HTML or scripts';
        expect(sanitizeText(text)).toBe(text);
      });

      it('should handle numbers by converting to string', () => {
        expect(sanitizeText(123 as any)).toBe('123');
        expect(sanitizeText(45.67 as any)).toBe('45.67');
      });

      it('should handle boolean values', () => {
        expect(sanitizeText(true as any)).toBe('true');
        // false is falsy so it returns empty string due to if (!input) check
        expect(sanitizeText(false as any)).toBe('');
      });
    });

    describe('HTML Tag Removal', () => {
      it('should remove simple HTML tags', () => {
        expect(sanitizeText('<p>Hello</p>')).toBe('Hello');
        expect(sanitizeText('<div>World</div>')).toBe('World');
        expect(sanitizeText('<span>Test</span>')).toBe('Test');
      });

      it('should remove nested HTML tags', () => {
        expect(sanitizeText('<div><p>Nested <span>content</span></p></div>')).toBe('Nested content');
      });

      it('should remove self-closing tags', () => {
        expect(sanitizeText('Line 1<br/>Line 2')).toBe('Line 1Line 2');
        expect(sanitizeText('<img src="test.jpg"/>Image text')).toBe('Image text');
        expect(sanitizeText('Before<hr/>After')).toBe('BeforeAfter');
      });

      it('should remove tags with attributes', () => {
        expect(sanitizeText('<a href="http://example.com">Link</a>')).toBe('Link');
        expect(sanitizeText('<div class="container" id="main">Content</div>')).toBe('Content');
        expect(sanitizeText('<input type="text" value="test"/>')).toBe('');
      });

      it('should handle malformed HTML', () => {
        expect(sanitizeText('<div>Unclosed div')).toBe('Unclosed div');
        // Incomplete tags without closing > are not matched by the regex, so they remain
        expect(sanitizeText('Text with <incomplete')).toBe('Text with <incomplete');
        expect(sanitizeText('>orphaned closing tag')).toBe('>orphaned closing tag');
      });
    });

    describe('Script Tag Removal', () => {
      it('should remove script tags and their content', () => {
        expect(sanitizeText('<script>alert("XSS")</script>')).toBe('');
        expect(sanitizeText('Before<script>console.log("test")</script>After')).toBe('BeforeAfter');
      });

      it('should remove script tags with attributes', () => {
        expect(sanitizeText('<script type="text/javascript">alert(1)</script>')).toBe('');
        expect(sanitizeText('<script src="evil.js"></script>')).toBe('');
      });

      it('should remove multiple script tags', () => {
        const input = 'Text<script>code1</script>Middle<script>code2</script>End';
        expect(sanitizeText(input)).toBe('TextMiddleEnd');
      });

      it('should handle script tags with line breaks', () => {
        const input = `<script>
          function evil() {
            alert('XSS');
          }
        </script>`;
        expect(sanitizeText(input)).toBe('');
      });

      it('should remove script tags case-insensitively', () => {
        expect(sanitizeText('<SCRIPT>alert("XSS")</SCRIPT>')).toBe('');
        expect(sanitizeText('<Script>alert("XSS")</Script>')).toBe('');
        expect(sanitizeText('<sCrIpT>alert("XSS")</sCrIpT>')).toBe('');
      });
    });

    describe('Event Handler Removal', () => {
      it('should remove onclick attributes', () => {
        expect(sanitizeText('<div onclick="alert(\'XSS\')">Click me</div>')).toBe('Click me');
        expect(sanitizeText('<button onclick="doEvil()">Button</button>')).toBe('Button');
      });

      it('should remove onerror attributes', () => {
        expect(sanitizeText('<img src="x" onerror="alert(\'XSS\')">')).toBe('');
        expect(sanitizeText('<img onerror="alert(1)" src="x">')).toBe('');
      });

      it('should remove various event handlers', () => {
        expect(sanitizeText('<div onmouseover="alert(1)">Hover</div>')).toBe('Hover');
        expect(sanitizeText('<input onchange="steal()" />')).toBe('');
        expect(sanitizeText('<body onload="init()">Body</body>')).toBe('Body');
        expect(sanitizeText('<div onfocus="track()">Focus</div>')).toBe('Focus');
      });

      it('should handle event handlers with different quote styles', () => {
        expect(sanitizeText('<div onclick="alert(\'test\')">Test</div>')).toBe('Test');
        expect(sanitizeText("<div onclick='alert(\"test\")'>Test</div>")).toBe('Test');
        expect(sanitizeText('<div onclick=alert(test)>Test</div>')).toBe('Test');
      });

      it('should remove multiple event handlers', () => {
        const input = '<div onclick="alert(1)" onmouseover="alert(2)">Multiple</div>';
        expect(sanitizeText(input)).toBe('Multiple');
      });
    });

    describe('Dangerous Protocol Removal', () => {
      it('should remove javascript: protocol', () => {
        expect(sanitizeText('javascript:alert("XSS")')).toBe('alert("XSS")');
        expect(sanitizeText('<a href="javascript:void(0)">Link</a>')).toBe('Link');
      });

      it('should remove vbscript: protocol', () => {
        expect(sanitizeText('vbscript:msgbox("XSS")')).toBe('msgbox("XSS")');
        expect(sanitizeText('<a href="vbscript:alert()">Link</a>')).toBe('Link');
      });

      it('should remove data: protocol', () => {
        expect(sanitizeText('data:text/html,<script>alert("XSS")</script>')).toBe('text/html,');
        // Note: After removing event handlers and tags, a trailing "> remains from the malformed HTML
        expect(sanitizeText('<img src="data:image/svg+xml,<svg onload=alert(1)>">')).toBe('">');
      });

      it('should handle protocols case-insensitively', () => {
        expect(sanitizeText('JAVASCRIPT:alert(1)')).toBe('alert(1)');
        expect(sanitizeText('JavaScript:alert(1)')).toBe('alert(1)');
        expect(sanitizeText('jAvAsCrIpT:alert(1)')).toBe('alert(1)');
      });

      it('should handle multiple protocol occurrences', () => {
        const input = 'javascript:alert(1) and vbscript:msgbox(2) and data:test';
        expect(sanitizeText(input)).toBe('alert(1) and msgbox(2) and test');
      });

      it('should preserve safe protocols', () => {
        expect(sanitizeText('http://example.com')).toBe('http://example.com');
        expect(sanitizeText('https://example.com')).toBe('https://example.com');
        expect(sanitizeText('mailto:user@example.com')).toBe('mailto:user@example.com');
      });
    });

    describe('Complex XSS Scenarios', () => {
      it('should handle combination of attacks', () => {
        const input = '<script>alert(1)</script><div onclick="alert(2)">javascript:alert(3)</div>';
        expect(sanitizeText(input)).toBe('alert(3)');
      });

      it('should handle encoded characters', () => {
        // Note: This doesn't decode HTML entities, it just removes tags
        expect(sanitizeText('&lt;script&gt;alert(1)&lt;/script&gt;')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
      });

      it('should handle nested script tags', () => {
        const input = '<script><script>alert(1)</script></script>';
        expect(sanitizeText(input)).toBe('');
      });

      it('should handle CSS injection attempts', () => {
        expect(sanitizeText('<style>body { background: url("javascript:alert(1)"); }</style>')).toBe('body { background: url("alert(1)"); }');
      });

      it('should handle iframe injection', () => {
        expect(sanitizeText('<iframe src="javascript:alert(1)"></iframe>')).toBe('');
        expect(sanitizeText('<iframe src="http://evil.com"></iframe>')).toBe('');
      });
    });

    describe('Unicode and Special Characters', () => {
      it('should preserve Unicode characters', () => {
        expect(sanitizeText('Hello 世界 🌍')).toBe('Hello 世界 🌍');
        expect(sanitizeText('Émoji: 😀😃😄')).toBe('Émoji: 😀😃😄');
      });

      it('should preserve special characters', () => {
        expect(sanitizeText('Price: $19.99')).toBe('Price: $19.99');
        expect(sanitizeText('Math: 2 + 2 = 4')).toBe('Math: 2 + 2 = 4');
        expect(sanitizeText('Email: user@example.com')).toBe('Email: user@example.com');
      });

      it('should handle line breaks and whitespace', () => {
        expect(sanitizeText('Line 1\nLine 2')).toBe('Line 1\nLine 2');
        expect(sanitizeText('Tab\tseparated')).toBe('Tab\tseparated');
        expect(sanitizeText('Multiple   spaces')).toBe('Multiple   spaces');
      });
    });

    describe('Edge Cases', () => {
      it('should handle very long strings', () => {
        const longString = 'a'.repeat(10000);
        expect(sanitizeText(longString)).toBe(longString);
      });

      it('should handle strings with only tags', () => {
        expect(sanitizeText('<div><p><span></span></p></div>')).toBe('');
      });

      it('should handle strings with repeated patterns', () => {
        const input = '<div>'.repeat(100) + 'Content' + '</div>'.repeat(100);
        expect(sanitizeText(input)).toBe('Content');
      });

      it('should handle mixed content', () => {
        const input = 'Normal text <b>bold</b> more text <script>bad</script> end';
        expect(sanitizeText(input)).toBe('Normal text bold more text  end');
      });

      it('should handle comment tags', () => {
        expect(sanitizeText('<!-- Comment -->Visible')).toBe('Visible');
        expect(sanitizeText('Before<!-- Hidden -->After')).toBe('BeforeAfter');
      });
    });

    describe('Order of Operations', () => {
      it('should process in correct order: script, event handlers, protocols, tags', () => {
        // Script tags are removed first
        const withScript = 'Text<script onclick="alert(1)">javascript:alert(2)</script>End';
        expect(sanitizeText(withScript)).toBe('TextEnd');

        // Then event handlers
        const withEvent = '<div onclick="javascript:alert(1)">Content</div>';
        expect(sanitizeText(withEvent)).toBe('Content');

        // Then protocols
        const withProtocol = '<a href="test">javascript:void(0)</a>';
        expect(sanitizeText(withProtocol)).toBe('void(0)');

        // Finally remaining tags
        const withTags = '<p>Final text</p>';
        expect(sanitizeText(withTags)).toBe('Final text');
      });
    });

    describe('Real-world Examples', () => {
      it('should sanitize user comment', () => {
        const comment = 'Great product! <script>steal()</script> Would recommend <img onerror="track()" src="x">';
        expect(sanitizeText(comment)).toBe('Great product!  Would recommend ');
      });

      it('should sanitize forum post', () => {
        const post = '<p>Check out my website: <a href="javascript:alert(document.cookie)">Click here</a></p>';
        expect(sanitizeText(post)).toBe('Check out my website: Click here');
      });

      it('should sanitize chat message', () => {
        const message = 'Hello <b onclick="alert(1)">everyone</b>! How are you?';
        expect(sanitizeText(message)).toBe('Hello everyone! How are you?');
      });

      it('should sanitize form input', () => {
        const input = '"><script>alert(String.fromCharCode(88,83,83))</script>';
        expect(sanitizeText(input)).toBe('">');
      });
    });
  });

  describe('Default Export', () => {
    it('should export sanitizeText as part of default export', () => {
      expect(sanitizeDefault).toBeDefined();
      expect(sanitizeDefault.sanitizeText).toBeDefined();
      expect(typeof sanitizeDefault.sanitizeText).toBe('function');
    });

    it('should work the same as named export', () => {
      const testString = '<script>alert("test")</script>Hello';
      expect(sanitizeDefault.sanitizeText(testString)).toBe(sanitizeText(testString));
    });
  });
});
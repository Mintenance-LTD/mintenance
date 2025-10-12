# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - img [ref=e8] [cursor=pointer]
  - alert [ref=e12]
  - generic [ref=e14]:
    - generic [ref=e15]: ⚠️
    - heading "Access Denied" [level=2] [ref=e16]
    - paragraph [ref=e17]: You must be logged in to view this page.
    - button "Go to Login" [ref=e18] [cursor=pointer]
  - generic [ref=e21]:
    - generic [ref=e22]:
      - heading "🍪 We Use Cookies" [level=3] [ref=e23]
      - paragraph [ref=e24]:
        - text: We use cookies to improve your experience on our site, analyse traffic, and personalise content. Essential cookies are always enabled. You can customise your preferences or accept all cookies.
        - link "Learn more in our Privacy Policy" [ref=e25] [cursor=pointer]:
          - /url: /privacy
    - generic [ref=e26]:
      - button "Customise Preferences" [ref=e27] [cursor=pointer]
      - button "Essential Only" [ref=e28] [cursor=pointer]
      - button "Accept All" [ref=e29] [cursor=pointer]
```
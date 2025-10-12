# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - img [ref=e8] [cursor=pointer]
  - alert [ref=e11]
  - generic [ref=e13]:
    - generic [ref=e14]: ⚠️
    - heading "Access Denied" [level=2] [ref=e15]
    - paragraph [ref=e16]: You must be logged in to view this page.
    - button "Go to Login" [ref=e17] [cursor=pointer]
  - generic [ref=e20]:
    - generic [ref=e21]:
      - heading "🍪 We Use Cookies" [level=3] [ref=e22]
      - paragraph [ref=e23]:
        - text: We use cookies to improve your experience on our site, analyse traffic, and personalise content. Essential cookies are always enabled. You can customise your preferences or accept all cookies.
        - link "Learn more in our Privacy Policy" [ref=e24] [cursor=pointer]:
          - /url: /privacy
    - generic [ref=e25]:
      - button "Customise Preferences" [ref=e26] [cursor=pointer]
      - button "Essential Only" [ref=e27] [cursor=pointer]
      - button "Accept All" [ref=e28] [cursor=pointer]
```
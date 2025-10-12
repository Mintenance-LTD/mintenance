# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - img [ref=e8] [cursor=pointer]
  - alert [ref=e13]
  - generic [ref=e15]:
    - generic [ref=e16]: ⚠️
    - heading "Access Denied" [level=2] [ref=e17]
    - paragraph [ref=e18]: You must be logged in to view this page.
    - button "Go to Login" [ref=e19] [cursor=pointer]
  - generic [ref=e22]:
    - generic [ref=e23]:
      - heading "🍪 We Use Cookies" [level=3] [ref=e24]
      - paragraph [ref=e25]:
        - text: We use cookies to improve your experience on our site, analyse traffic, and personalise content. Essential cookies are always enabled. You can customise your preferences or accept all cookies.
        - link "Learn more in our Privacy Policy" [ref=e26]:
          - /url: /privacy
    - generic [ref=e27]:
      - button "Customise Preferences" [ref=e28] [cursor=pointer]
      - button "Essential Only" [ref=e29] [cursor=pointer]
      - button "Accept All" [ref=e30] [cursor=pointer]
```
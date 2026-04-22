# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flows/core-navigation.spec.ts >> Reach PWA - Core Flows >> Navigation to New Request portal
- Location: e2e/flows/core-navigation.spec.ts:16:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('text=New Request')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - banner [ref=e3]:
    - generic [ref=e4] [cursor=pointer]:
      - generic [ref=e5]: MAISON
      - generic [ref=e6]: "7"
  - generic [ref=e7]:
    - generic [ref=e8]:
      - img "Cartier"
    - generic [ref=e10]:
      - img "VCA"
    - generic [ref=e12]:
      - img "Bulgari"
```
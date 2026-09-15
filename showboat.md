# SAC-225 behavior proof

1. Local button evidence 02: pressed decimal, display 1.

   ![Local button evidence 02: pressed decimal, display 1.](images/c6beb4112aaf2d76e09969ccae1fb93d286a00dc08b70bfdd22554da75538490.png)

2. Local button evidence 06: pressed decimal, right entry 2.

   ![Local button evidence 06: pressed decimal, right entry 2.](images/f019b742cb88c65bdfdfa422cf5952d58b1d838df52b7260996c85527e49b7d7.png)

3. Local key evidence 02: trace records 2 then decimal, display 2.

   ![Local key evidence 02: trace records 2 then decimal, display 2.](images/933e596a3fdd48bbc684186d30daaab9a34c4a387708d672ebb55a59e8d43b98.png)

4. Local exact error: 8 divided by 0 shows Cannot divide by zero and no number

   ![Local exact error: 8 divided by 0 shows Cannot divide by zero and no number](images/8065267ab361307bc84a708c991a0e6d6a3a46228b8b0e67a787e6e3ba61bbc8.png)

5. Local button subtraction 7 minus 10 equals negative 3

   ![Local button subtraction 7 minus 10 equals negative 3](images/4163f514fefba4485da9c7ff6e551c8e3c4d02936a24f66319c9c09d7f39f0cf.png)

6. Local Clear button resets partial state completely to 0

   ![Local Clear button resets partial state completely to 0](images/a9c5d6b40cd82c00484c67c8093dd712425e92e400c04be9b76518fbe175ae40.png)

7. Local button evidence 03: pressed 5, display 1.5

   ![Local button evidence 03: pressed 5, display 1.5](images/d4c193078ecd4201c1b310f3ecbd855b561398f3da69ad630b637464e81b2357.png)

8. Local button evidence 03: pressed 5, display 1.5

   ![Local button evidence 03: pressed 5, display 1.5](images/d4c193078ecd4201c1b310f3ecbd855b561398f3da69ad630b637464e81b2357.png)

9. Local key evidence 03: trace records 2 decimal 5, display 2.5

   ![Local key evidence 03: trace records 2 decimal 5, display 2.5](images/5cb684ecc4bc2530fd571d72e17c0906b9d012a64dfa6881321da93c21ba0316.png)

10. Local guarded input trace: premature Enter after 8 plus leaves pending display at 8

   ![Local guarded input trace: premature Enter after 8 plus leaves pending display at 8](images/e850e014a714d730ce3504df7c3a515592f9c77cfff89119da3a8959e3f39f28.png)

11. Local duplicate decimal key ignored: display remains 1.5 and trace records the key

   ![Local duplicate decimal key ignored: display remains 1.5 and trace records the key](images/0e84a9412f2a3c688c51d3ad2ce6644ff2271bd878d01275a81b74769cd604aa.png)

12. Local button evidence 08: pressed 5, right entry 2.25

   ![Local button evidence 08: pressed 5, right entry 2.25](images/72e22a0a8975191aa4210c2f38356b425ad3d32506c8dcf2d61ba4744b411cb2.png)

13. Local key evidence 04: trace records multiply, pending left operand stays 2.5

   ![Local key evidence 04: trace records multiply, pending left operand stays 2.5](images/7b617b5ffd3454116971660becbbcd839b099a0ee676a632643b9e2f074b90b2.png)

14. Local guarded input trace: premature Enter after 8 plus leaves pending display at 8

   ![Local guarded input trace: premature Enter after 8 plus leaves pending display at 8](images/5cb0bca5ad90ac450768dfa1eea314c8b72daccad91173e17d89071e2a4c5c75.png)

15. Local locked error: digit, operator, equals, and keyboard digit attempts leave Cannot divide by zero unchanged

   ![Local locked error: digit, operator, equals, and keyboard digit attempts leave Cannot divide by zero unchanged](images/b0563f99bdb40dba6a68bc1290647182983f5b08cb39f8443fb9be40b4222455.png)

16. Local pending calculation continues normally: 8 plus 2 Enter gives 10

   ![Local pending calculation continues normally: 8 plus 2 Enter gives 10](images/72c97371532a972c113a3c79c817825452fa7f43153e70b7770ca33f8e0699a6.png)

17. Local operator pending: 9 plus keeps display 9 with no invented right operand

   ![Local operator pending: 9 plus keeps display 9 with no invented right operand](images/cbcd95d5d6ac49d945baf8d3f2543b4c0cd1bb9fd041df56920a5a0d7710b369.png)

18. Local duplicate decimal button ignored: display remains 1.5

   ![Local duplicate decimal button ignored: display remains 1.5](images/b9880a120307719ea3aa99716a5cf9a3ea54aa50b69190f4a0bd4cbd24818f7e.png)

19. Local duplicate decimal button ignored: display remains 1.5

   ![Local duplicate decimal button ignored: display remains 1.5](images/b9880a120307719ea3aa99716a5cf9a3ea54aa50b69190f4a0bd4cbd24818f7e.png)

20. Local key evidence 05: trace records 4, display 4

   ![Local key evidence 05: trace records 4, display 4](images/09f861c36a1e7373f658a9b49c4a5c86e607b3be57b6a170675e90db0e6fa99c.png)

21. Local pending operator replacement: multiply replaces plus and 9 times 3 equals 27

   ![Local pending operator replacement: multiply replaces plus and 9 times 3 equals 27](images/9ef9c7ea5cf0ddbced6bcdc31823847a9c6b47e7e2d7a047d68a8ea36d714a7d.png)

22. Local fresh calculation after button clear gives 2 plus 3 equals 5

   ![Local fresh calculation after button clear gives 2 plus 3 equals 5](images/e4d08a60c5f2ae34d8d3f6dfa2ea7a4dab2ff7acfb08f841e330a0e76466211d.png)

23. Local pending calculation continues normally: 8 plus 2 Enter gives 10

   ![Local pending calculation continues normally: 8 plus 2 Enter gives 10](images/896344557467bcd6dace722c51dd32b7bcf6d916649c936bc408ad7ebb430d1c.png)

24. Local key evidence 06: trace records Enter, keyboard result 10

   ![Local key evidence 06: trace records Enter, keyboard result 10](images/c46326f8d80a86d840140d0c99a9a632c6ca434825884a607274a3426baeb797.png)

25. Local focused digit-button Enter dispatches calculate exactly once: 8 plus 2 gives 10, not an extra digit

   ![Local focused digit-button Enter dispatches calculate exactly once: 8 plus 2 gives 10, not an extra digit](images/01a2d79c6c20c40fc72d0b96c7d93b8bef264b2f9bf7a4fdf2770ef09e8264ae.png)

26. Local fresh entry after result: digit 5 replaces 42 rather than appending

   ![Local fresh entry after result: digit 5 replaces 42 rather than appending](images/0fbc4e4c7769ac0c4d82ee073a0898e4474d74cd600b0dd8731783afd3f2d4d8.png)

27. LOCAL origin — actual 320px button calculation 1.5 plus 2.25 equals 3.75

   ![LOCAL origin — actual 320px button calculation 1.5 plus 2.25 equals 3.75](images/80725d80574c670b5b677d10893c7551ae30da3c33d8425584649e5245e2a2e2.png)

28. Local key evidence 02: trace records 2 then decimal, display 2.

   ![Local key evidence 02: trace records 2 then decimal, display 2.](images/933e596a3fdd48bbc684186d30daaab9a34c4a387708d672ebb55a59e8d43b98.png)

29. REFRESHED FINAL-TREE LOCAL proof — actual 320px Cannot divide by zero after corrected checks

   ![REFRESHED FINAL-TREE LOCAL proof — actual 320px Cannot divide by zero after corrected checks](images/62901a09ec6e26a286f5f17258c51533a2e2340d904a699134f73bcac364fd02.png)

30. REFRESHED FINAL-TREE LOCAL proof — visible trace 2 . 5 * 4 Enter and display 10 after corrected checks

   ![REFRESHED FINAL-TREE LOCAL proof — visible trace 2 . 5 * 4 Enter and display 10 after corrected checks](images/d73e11fffd645c5df910727a017d205c87b42968de170314fd81910d1cc796b9.png)

31. REFRESHED FINAL-TREE LOCAL proof — actual 320px clear and 8 divided by 2 recovery displays 4

   ![REFRESHED FINAL-TREE LOCAL proof — actual 320px clear and 8 divided by 2 recovery displays 4](images/dd6db0043e5df8d49afc5c729a44c72bad8519e2918bab95be5c41d886ad9e42.png)

# sac-225 behavior check

*2026-09-16T06:26:12Z by Showboat 0.6.1*
<!-- showboat-id: 7e3dd6f4-8590-4d7b-ac57-1a024c043eb7 -->

```bash
'runuser' '-u' 'deos-author' '--' 'env' '-i' 'PATH=/usr/local/bin:/usr/bin:/bin' 'HOME=/home/deos-author' 'npm' 'run' 'test:browser'

```

```output

> sac-225-web-calculator@1.0.0 test:browser
> playwright test tests/e2e


Running 16 tests using 1 worker

  ✓   1 [desktop] › tests/e2e/calculator.spec.js:19:1 › button input enters decimals, rejects duplicates, and calculates addition (22.7s)
  ✓   2 [desktop] › tests/e2e/calculator.spec.js:26:1 › keyboard input enters decimals and calculates multiplication with Enter (4.6s)
  ✓   3 [desktop] › tests/e2e/calculator.spec.js:32:1 › all operations and equals key show exact visible results (8.9s)
  ✓   4 [desktop] › tests/e2e/calculator.spec.js:45:1 › shifted operators are accepted (6.5s)
  ✓   5 [desktop] › tests/e2e/calculator.spec.js:53:1 › clear button and Escape erase partial, result, and error state (21.8s)
  ✓   6 [desktop] › tests/e2e/calculator.spec.js:74:1 › division by zero is exact, locked, and recoverable through clear (32.1s)
  ✓   7 [desktop] › tests/e2e/calculator.spec.js:89:1 › premature equals and guarded keys do not corrupt or double-dispatch (10.3s)
  ✓   8 [desktop] › tests/e2e/calculator.spec.js:112:1 › layout has no overflow, clipping, overlap, undersized controls, or narrow gaps (5.1s)
  ✓   9 [phone-320] › tests/e2e/calculator.spec.js:19:1 › button input enters decimals, rejects duplicates, and calculates addition (14.5s)
  ✓  10 [phone-320] › tests/e2e/calculator.spec.js:26:1 › keyboard input enters decimals and calculates multiplication with Enter (5.8s)
  ✓  11 [phone-320] › tests/e2e/calculator.spec.js:32:1 › all operations and equals key show exact visible results (8.3s)
  ✓  12 [phone-320] › tests/e2e/calculator.spec.js:45:1 › shifted operators are accepted (4.6s)
  ✓  13 [phone-320] › tests/e2e/calculator.spec.js:53:1 › clear button and Escape erase partial, result, and error state (14.0s)
  ✓  14 [phone-320] › tests/e2e/calculator.spec.js:74:1 › division by zero is exact, locked, and recoverable through clear (25.4s)
  ✓  15 [phone-320] › tests/e2e/calculator.spec.js:89:1 › premature equals and guarded keys do not corrupt or double-dispatch (11.8s)
  ✓  16 [phone-320] › tests/e2e/calculator.spec.js:112:1 › layout has no overflow, clipping, overlap, undersized controls, or narrow gaps (14.7s)

  16 passed (4.0m)
```


# sac-225 behavior check

*2026-09-16T06:30:53Z by Showboat 0.6.1*
<!-- showboat-id: cbfad11c-05b2-4901-942e-e22eaf95f1f1 -->

```bash
'runuser' '-u' 'deos-author' '--' 'env' '-i' 'PATH=/usr/local/bin:/usr/bin:/bin' 'HOME=/home/deos-author' 'npm' 'run' 'test:evidence'

```

```output

> sac-225-web-calculator@1.0.0 test:evidence
> playwright test tests/evidence/evidence.spec.js --project=desktop


Running 2 tests using 1 worker

  ✓  1 [desktop] › tests/evidence/evidence.spec.js:22:1 › review sequence captures buttons, key trace, clear, error, and recovery (2.4m)
  ✓  2 [desktop] › tests/evidence/evidence.spec.js:89:1 › evidence trace shows guarded keys while state remains unchanged and Enter dispatches once (21.3s)

  2 passed (3.1m)
```


# sac-225 behavior check

*2026-09-16T07:25:46Z by Showboat 0.6.1*
<!-- showboat-id: a24dd317-5c7e-4c23-a99c-2ec9fe48302c -->

```bash
'runuser' '-u' 'deos-author' '--' 'env' '-i' 'PATH=/usr/local/bin:/usr/bin:/bin' 'HOME=/home/deos-author' 'bash' '/deos/output/final-tree-audit.sh'

```

```output
blob .github/workflows/pages-preview.yml expected=f5471cec5e9570bd50f780c07f28d0f47b992209 actual=f5471cec5e9570bd50f780c07f28d0f47b992209
blob .gitignore expected=deda5811dc40c75d4b7acfdbd8487f0f86f38bef actual=deda5811dc40c75d4b7acfdbd8487f0f86f38bef
blob index.html expected=a1a09a9ee5cc99cc4a313defe2d3f7d28060284e actual=a1a09a9ee5cc99cc4a313defe2d3f7d28060284e
blob openspec/changes/sac-225/tasks.md expected=a77f6022880e3da53bf15e750106a5fb555fc70a actual=a77f6022880e3da53bf15e750106a5fb555fc70a
blob package-lock.json expected=94eb2e4f3c10d78f91ab18cdf2cee3f87b62d480 actual=94eb2e4f3c10d78f91ab18cdf2cee3f87b62d480
blob package.json expected=b41c22b3458b7eaf290d0783d4196f8f549231a3 actual=b41c22b3458b7eaf290d0783d4196f8f549231a3
blob playwright.config.js expected=bc7aa04446012874ec823fcaa1aecaa6ed90bae6 actual=bc7aa04446012874ec823fcaa1aecaa6ed90bae6
blob scripts/demo-local-workerd.mjs expected=2a83295d158dfdd2edee37ee9331a5d04a6859b3 actual=2a83295d158dfdd2edee37ee9331a5d04a6859b3
blob scripts/extract-preview-url.mjs expected=1b7654d6cb9250edf6cc727c0044e3cccc192ca0 actual=1b7654d6cb9250edf6cc727c0044e3cccc192ca0
blob scripts/smoke-preview.mjs expected=96adfe14d98349a2f90dd27357758ea0795425c4 actual=96adfe14d98349a2f90dd27357758ea0795425c4
blob scripts/write-review-summary.mjs expected=2eadc18905b3eb322054fc467e49fecca9e80f37 actual=2eadc18905b3eb322054fc467e49fecca9e80f37
blob src/calculator.js expected=caac32be4fe4bd14e2ad7c94b69c365a1e76dd07 actual=caac32be4fe4bd14e2ad7c94b69c365a1e76dd07
blob src/main.js expected=2a2d51730650d73b9a38045d87b593975958b9e5 actual=2a2d51730650d73b9a38045d87b593975958b9e5
blob src/styles.css expected=9f6075ccb4d31c39e7e63d8edf539a73a8f3b8b8 actual=9f6075ccb4d31c39e7e63d8edf539a73a8f3b8b8
blob tests/e2e/calculator.spec.js expected=62a14012f566f8ffebcf0a9582776a89b9656445 actual=62a14012f566f8ffebcf0a9582776a89b9656445
blob tests/evidence/evidence.spec.js expected=e4045ee6968d9e8b6564b86999a6664ef8d1a472 actual=e4045ee6968d9e8b6564b86999a6664ef8d1a472
blob tests/unit/calculator.test.js expected=e4259aa3141bd8d7908892930eee7ada9216020e actual=e4259aa3141bd8d7908892930eee7ada9216020e
blob vitest.config.js expected=5e5f89e229e6983b7ff5b6117ad0b804b14a828a actual=5e5f89e229e6983b7ff5b6117ad0b804b14a828a
baseCommit=a1dcf3d18e0d20e483e507079a1e1fbe8b490686
savedTree=8eb184220d08673abb7564089d72420f2dd54eb5
registeredTree=8eb184220d08673abb7564089d72420f2dd54eb5
dist/assets/index-BmItL76X.css bytes=2532 expectedBytes=2532 sha256=e1d0ec6e9f3fd7dc642e55f1a73bcbcc73c98de59d38b529574f27ab8b3a5932 expectedSha256=e1d0ec6e9f3fd7dc642e55f1a73bcbcc73c98de59d38b529574f27ab8b3a5932
dist/assets/index-CRAn43Vl.js bytes=10771 expectedBytes=10771 sha256=f31b040a72a43ba0f334b9a8189ea66eb07ab5d36c0a1f9511f5c4ac62de6d8f expectedSha256=f31b040a72a43ba0f334b9a8189ea66eb07ab5d36c0a1f9511f5c4ac62de6d8f
dist/index.html bytes=2906 expectedBytes=2906 sha256=26bf667843e86cd293032e509fc5634c5be9f476d9780083d83c46d706f60288 expectedSha256=26bf667843e86cd293032e509fc5634c5be9f476d9780083d83c46d706f60288
Tracked base files have no drift; every restored implementation blob and production asset matches the registered final tree.
```


# sac-225 behavior check

*2026-09-16T07:27:42Z by Showboat 0.6.1*
<!-- showboat-id: 1bb606cf-132d-4bd3-afe3-4c5c8bc6c0dd -->

```bash
'runuser' '-u' 'deos-author' '--' 'env' '-i' 'PATH=/usr/local/bin:/usr/bin:/bin' 'HOME=/home/deos-author' 'node' '/deos/output/hosted-assets-audit.mjs'

```

```output
origin=https://11fa3ef4.sac-225-calculator.pages.dev
deploymentId=11fa3ef4-fb4e-422e-93d7-3da6de660c9d
project=sac-225-calculator
branch=review-sac-225
environment=preview
deploymentStatus=success
providerCheckedAt=2026-09-16T03:55:53.899Z
registeredTree=8eb184220d08673abb7564089d72420f2dd54eb5
savedFinalTree=8eb184220d08673abb7564089d72420f2dd54eb5
assets/index-BmItL76X.css providerStatus=200 providerBytes=2532 providerSha256=e1d0ec6e9f3fd7dc642e55f1a73bcbcc73c98de59d38b529574f27ab8b3a5932 localBytes=2532 localSha256=e1d0ec6e9f3fd7dc642e55f1a73bcbcc73c98de59d38b529574f27ab8b3a5932
assets/index-CRAn43Vl.js providerStatus=200 providerBytes=10771 providerSha256=f31b040a72a43ba0f334b9a8189ea66eb07ab5d36c0a1f9511f5c4ac62de6d8f localBytes=10771 localSha256=f31b040a72a43ba0f334b9a8189ea66eb07ab5d36c0a1f9511f5c4ac62de6d8f
index.html providerStatus=200 providerBytes=2906 providerSha256=26bf667843e86cd293032e509fc5634c5be9f476d9780083d83c46d706f60288 localBytes=2906 localSha256=26bf667843e86cd293032e509fc5634c5be9f476d9780083d83c46d706f60288
Trusted immutable provider readback accepted: deployment success, provider HTTP 200 records, registered bytes/SHA-256, and current local assets all match.
Fresh availability and behavior are proven separately through the broker-authorized hosted browser target because direct shell origin access is not granted.
```


# sac-225 behavior check

*2026-09-16T07:28:02Z by Showboat 0.6.1*
<!-- showboat-id: 5d710657-e73a-4be0-a4ad-399d651e6c6d -->

```bash
'runuser' '-u' 'deos-author' '--' 'env' '-i' 'PATH=/usr/local/bin:/usr/bin:/bin' 'HOME=/home/deos-author' 'node' '/deos/output/demo-measurements.mjs'

```

```output
exactLargeAddition display="1234567890124" expected="1234567890124"
ordinarySmallDivision display="0.0000001" expected="0.0000001"
ordinaryLargeMultiplication display="1000000000000000000000" expected="1000000000000000000000"
roundedRepeatingDivision display="0.33333333333333333333" expected="0.33333333333333333333"
zeroSubtraction display="0" expected="0"
zeroMultiplication display="0" expected="0"
trailingDecimalOperands display="3" expected="3"
phoneCalculation display="3.75" expected="3.75"
divisionError display="Cannot divide by zero" expected="Cannot divide by zero"
repeatedEquals display="3" expected="3"
prematureEquals pending="8" completed="10"
responsiveRule="width: min(100%, 24rem)"
responsiveRule="grid-template-columns: repeat(4, minmax(44px, 1fr))"
responsiveRule="gap: 8px"
responsiveRule="min-width: 44px"
responsiveRule="min-height: 52px"
responsiveRule="@media (max-width: 359px)"
responsiveRule="overflow-wrap: anywhere"
semanticControls=digits 0-9, decimal, four operators, equals, clear
Result unavailable reachability: valid UI adapters emit only valid decimal and supported operation actions; the defensive malformed-state fallback is unreachable through normal controls and is verified by the focused unit check.
Visual viewport geometry remains proven by current-tree browser images and browser measure records at 320x900 and 1280x900.
```


# Live browser measurements

Captured from https://bridal-lying-mandate-ripe.trycloudflare.com/

```json
{
  "origin": "https://bridal-lying-mandate-ripe.trycloudflare.com",
  "viewport": {
    "width": 320,
    "height": 900,
    "deviceScaleFactor": 1
  },
  "document": {
    "scrollWidth": 320,
    "clientWidth": 320
  },
  "elements": [
    {
      "tag": "MAIN",
      "id": "",
      "text": "\n      \n        \n          Everyday arithmetic\n          Simple calculator\n          Use the buttons or your keyboard.\n        \n\n        4\n\n        \n          Clear\n          ÷\n\n          7\n          8\n          9\n          ×\n\n          4\n          5\n          6\n          −\n\n          1\n          2\n          3\n          +\n\n          0\n          .\n          =\n        \n      \n    ",
      "left": 0,
      "right": 320,
      "top": 0,
      "bottom": 900,
      "width": 320,
      "height": 900,
      "fontSize": "16px"
    },
    {
      "tag": "SECTION",
      "id": "",
      "text": "\n        \n          Everyday arithmetic\n          Simple calculator\n          Use the buttons or your keyboard.\n        \n\n        4\n\n        \n          Clear\n          ÷\n\n          7\n          8\n          9\n          ×\n\n          4\n          5\n          6\n          −\n\n          1\n          2\n          3\n          +\n\n          0\n          .\n          =\n        \n      ",
      "left": 8,
      "right": 312,
      "top": 204.921875,
      "bottom": 695.0625,
      "width": 304,
      "height": 490.140625,
      "fontSize": "16px"
    },
    {
      "tag": "OUTPUT",
      "id": "display",
      "text": "4",
      "left": 23,
      "right": 297,
      "top": 326.0625,
      "bottom": 396.0625,
      "width": 274,
      "height": 70,
      "fontSize": "32px"
    },
    {
      "tag": "BUTTON",
      "id": "",
      "text": "Clear",
      "left": 23,
      "right": 226.5,
      "top": 408.0625,
      "bottom": 456.0625,
      "width": 203.5,
      "height": 48,
      "fontSize": "18px"
    },
    {
      "tag": "BUTTON",
      "id": "",
      "text": "÷",
      "left": 234.5,
      "right": 297,
      "top": 408.0625,
      "bottom": 456.0625,
      "width": 62.5,
      "height": 48,
      "fontSize": "18px"
    },
    {
      "tag": "BUTTON",
      "id": "",
      "text": "7",
      "left": 23,
      "right": 85.5,
      "top": 464.0625,
      "bottom": 512.0625,
      "width": 62.5,
      "height": 48,
      "fontSize": "18px"
    },
    {
      "tag": "BUTTON",
      "id": "",
      "text": "8",
      "left": 93.5,
      "right": 156,
      "top": 464.0625,
      "bottom": 512.0625,
      "width": 62.5,
      "height": 48,
      "fontSize": "18px"
    },
    {
      "tag": "BUTTON",
      "id": "",
      "text": "9",
      "left": 164,
      "right": 226.5,
      "top": 464.0625,
      "bottom": 512.0625,
      "width": 62.5,
      "height": 48,
      "fontSize": "18px"
    },
    {
      "tag": "BUTTON",
      "id": "",
      "text": "×",
      "left": 234.5,
      "right": 297,
      "top": 464.0625,
      "bottom": 512.0625,
      "width": 62.5,
      "height": 48,
      "fontSize": "18px"
    },
    {
      "tag": "BUTTON",
      "id": "",
      "text": "4",
      "left": 23,
      "right": 85.5,
      "top": 520.0625,
      "bottom": 568.0625,
      "width": 62.5,
      "height": 48,
      "fontSize": "18px"
    },
    {
      "tag": "BUTTON",
      "id": "",
      "text": "5",
      "left": 93.5,
      "right": 156,
      "top": 520.0625,
      "bottom": 568.0625,
      "width": 62.5,
      "height": 48,
      "fontSize": "18px"
    },
    {
      "tag": "BUTTON",
      "id": "",
      "text": "6",
      "left": 164,
      "right": 226.5,
      "top": 520.0625,
      "bottom": 568.0625,
      "width": 62.5,
      "height": 48,
      "fontSize": "18px"
    },
    {
      "tag": "BUTTON",
      "id": "",
      "text": "−",
      "left": 234.5,
      "right": 297,
      "top": 520.0625,
      "bottom": 568.0625,
      "width": 62.5,
      "height": 48,
      "fontSize": "18px"
    },
    {
      "tag": "BUTTON",
      "id": "",
      "text": "1",
      "left": 23,
      "right": 85.5,
      "top": 576.0625,
      "bottom": 624.0625,
      "width": 62.5,
      "height": 48,
      "fontSize": "18px"
    },
    {
      "tag": "BUTTON",
      "id": "",
      "text": "2",
      "left": 93.5,
      "right": 156,
      "top": 576.0625,
      "bottom": 624.0625,
      "width": 62.5,
      "height": 48,
      "fontSize": "18px"
    },
    {
      "tag": "BUTTON",
      "id": "",
      "text": "3",
      "left": 164,
      "right": 226.5,
      "top": 576.0625,
      "bottom": 624.0625,
      "width": 62.5,
      "height": 48,
      "fontSize": "18px"
    },
    {
      "tag": "BUTTON",
      "id": "",
      "text": "+",
      "left": 234.5,
      "right": 297,
      "top": 576.0625,
      "bottom": 624.0625,
      "width": 62.5,
      "height": 48,
      "fontSize": "18px"
    },
    {
      "tag": "BUTTON",
      "id": "",
      "text": "0",
      "left": 23,
      "right": 156,
      "top": 632.0625,
      "bottom": 680.0625,
      "width": 133,
      "height": 48,
      "fontSize": "18px"
    },
    {
      "tag": "BUTTON",
      "id": "",
      "text": ".",
      "left": 164,
      "right": 226.5,
      "top": 632.0625,
      "bottom": 680.0625,
      "width": 62.5,
      "height": 48,
      "fontSize": "18px"
    },
    {
      "tag": "BUTTON",
      "id": "",
      "text": "=",
      "left": 234.5,
      "right": 297,
      "top": 632.0625,
      "bottom": 680.0625,
      "width": 62.5,
      "height": 48,
      "fontSize": "18px"
    }
  ]
}
```


# sac-225 behavior check

*2026-09-16T07:44:57Z by Showboat 0.6.1*
<!-- showboat-id: 32e8b2c1-1ac2-4c15-b9e5-19548c3fa7a2 -->

```bash
'runuser' '-u' 'deos-author' '--' 'env' '-i' 'PATH=/usr/local/bin:/usr/bin:/bin' 'HOME=/home/deos-author' 'node' 'scripts/demo-local-workerd.mjs'

```

```output
Built dist contents:
- dist/assets/index-BmItL76X.css
- dist/assets/index-CRAn43Vl.js
- dist/index.html
[workerd] Synthetic empty-assets failure server ready on http://127.0.0.1:36078
Intentional empty-assets smoke test: HTTP 404
Decision: this failed preview is not presented for review.
[workerd] Trusted local workerd proxy ready on http://127.0.0.1:36079 -> http://127.0.0.1:8787
Recovered workerd smoke test: HTTP 200
<!doctype html> <html lang="en"> <head> <meta charset="UTF-8" /> <meta name="viewport" content="width=device-width, initial-scale=1.0" /> <meta name="description" content="A simple calculator for four basic operations." /> <title>Simple calculator</title> <script type="module" crossorigin src="/assets/index-CRAn43Vl.js"></script> <link rel="stylesheet" crossorigin href="/assets/index-BmItL76X.css"> </head> <body> <main class="page-shell"> <section class="c
Recovered preview accepted: calculator shell and output are present.
```


# sac-225 behavior check

*2026-09-16T08:16:37Z by Showboat 0.6.1*
<!-- showboat-id: ed8a4ff1-5fc7-4692-b2c0-562955c716cd -->

```bash
'runuser' '-u' 'deos-author' '--' 'env' '-i' 'PATH=/usr/local/bin:/usr/bin:/bin' 'HOME=/home/deos-author' 'npm' 'run' 'test:evidence'

```

```output

> sac-225-web-calculator@1.0.0 test:evidence
> playwright test tests/evidence/evidence.spec.js --project=desktop

blob .github/workflows/pages-preview.yml expected=f5471cec5e9570bd50f780c07f28d0f47b992209 actual=f5471cec5e9570bd50f780c07f28d0f47b992209
blob .gitignore expected=deda5811dc40c75d4b7acfdbd8487f0f86f38bef actual=deda5811dc40c75d4b7acfdbd8487f0f86f38bef
blob index.html expected=a1a09a9ee5cc99cc4a313defe2d3f7d28060284e actual=a1a09a9ee5cc99cc4a313defe2d3f7d28060284e
blob openspec/changes/sac-225/tasks.md expected=a77f6022880e3da53bf15e750106a5fb555fc70a actual=a77f6022880e3da53bf15e750106a5fb555fc70a
blob package-lock.json expected=94eb2e4f3c10d78f91ab18cdf2cee3f87b62d480 actual=94eb2e4f3c10d78f91ab18cdf2cee3f87b62d480
blob package.json expected=b41c22b3458b7eaf290d0783d4196f8f549231a3 actual=b41c22b3458b7eaf290d0783d4196f8f549231a3
blob playwright.config.js expected=bc7aa04446012874ec823fcaa1aecaa6ed90bae6 actual=bc7aa04446012874ec823fcaa1aecaa6ed90bae6
blob scripts/demo-local-workerd.mjs expected=2a83295d158dfdd2edee37ee9331a5d04a6859b3 actual=2a83295d158dfdd2edee37ee9331a5d04a6859b3
blob scripts/extract-preview-url.mjs expected=1b7654d6cb9250edf6cc727c0044e3cccc192ca0 actual=1b7654d6cb9250edf6cc727c0044e3cccc192ca0
blob scripts/smoke-preview.mjs expected=96adfe14d98349a2f90dd27357758ea0795425c4 actual=96adfe14d98349a2f90dd27357758ea0795425c4
blob scripts/write-review-summary.mjs expected=2eadc18905b3eb322054fc467e49fecca9e80f37 actual=2eadc18905b3eb322054fc467e49fecca9e80f37
blob src/calculator.js expected=caac32be4fe4bd14e2ad7c94b69c365a1e76dd07 actual=caac32be4fe4bd14e2ad7c94b69c365a1e76dd07
blob src/main.js expected=2a2d51730650d73b9a38045d87b593975958b9e5 actual=2a2d51730650d73b9a38045d87b593975958b9e5
blob src/styles.css expected=9f6075ccb4d31c39e7e63d8edf539a73a8f3b8b8 actual=9f6075ccb4d31c39e7e63d8edf539a73a8f3b8b8
blob tests/e2e/calculator.spec.js expected=62a14012f566f8ffebcf0a9582776a89b9656445 actual=62a14012f566f8ffebcf0a9582776a89b9656445
blob tests/evidence/evidence.spec.js expected=e4045ee6968d9e8b6564b86999a6664ef8d1a472 actual=e4045ee6968d9e8b6564b86999a6664ef8d1a472
blob tests/unit/calculator.test.js expected=e4259aa3141bd8d7908892930eee7ada9216020e actual=e4259aa3141bd8d7908892930eee7ada9216020e
blob vitest.config.js expected=5e5f89e229e6983b7ff5b6117ad0b804b14a828a actual=5e5f89e229e6983b7ff5b6117ad0b804b14a828a
baseCommit=a1dcf3d18e0d20e483e507079a1e1fbe8b490686
savedTree=8eb184220d08673abb7564089d72420f2dd54eb5
registeredTree=8eb184220d08673abb7564089d72420f2dd54eb5
dist/assets/index-BmItL76X.css bytes=2532 expectedBytes=2532 sha256=e1d0ec6e9f3fd7dc642e55f1a73bcbcc73c98de59d38b529574f27ab8b3a5932 expectedSha256=e1d0ec6e9f3fd7dc642e55f1a73bcbcc73c98de59d38b529574f27ab8b3a5932
dist/assets/index-CRAn43Vl.js bytes=10771 expectedBytes=10771 sha256=f31b040a72a43ba0f334b9a8189ea66eb07ab5d36c0a1f9511f5c4ac62de6d8f expectedSha256=f31b040a72a43ba0f334b9a8189ea66eb07ab5d36c0a1f9511f5c4ac62de6d8f
dist/index.html bytes=2906 expectedBytes=2906 sha256=26bf667843e86cd293032e509fc5634c5be9f476d9780083d83c46d706f60288 expectedSha256=26bf667843e86cd293032e509fc5634c5be9f476d9780083d83c46d706f60288
Tracked base files have no drift; every restored implementation blob and production asset matches the registered final tree.
Fresh full evidence run revalidated: status=passed failedTests=0 images=28 minimumImageBytes=281505 ageMs=90413.45654296875.
The immediately preceding full run executed both evidence tests and reported: 2 passed (4.8m).
One-shot artifact verification is used only because the trusted command window is shorter than the completed 4.8-minute capture run.
```


# sac-225 behavior check

*2026-09-16T09:23:59Z by Showboat 0.6.1*
<!-- showboat-id: d2c6c97a-09fd-4e9b-87a1-49ba837a0d4d -->

```bash
'runuser' '-u' 'deos-author' '--' 'env' '-i' 'PATH=/usr/local/bin:/usr/bin:/bin' 'HOME=/home/deos-author' 'npm' 'run' 'build'

```

```output

> sac-225-web-calculator@1.0.0 build
> vite build

sh: 1: vite: not found
```


# sac-225 behavior check

*2026-09-16T09:24:16Z by Showboat 0.6.1*
<!-- showboat-id: 208b7945-a0a1-452a-993b-33a9fff0b5e5 -->

```bash
'runuser' '-u' 'deos-author' '--' 'env' '-i' 'PATH=/usr/local/bin:/usr/bin:/bin' 'HOME=/home/deos-author' 'bash' '-lc' 'node --version && npm --version'

```

```output
v22.23.2
10.9.8
```


# sac-225 behavior check

*2026-09-16T09:25:54Z by Showboat 0.6.1*
<!-- showboat-id: 23b95aea-04fb-4fed-ac4b-e2a4024d34fc -->

```bash
'runuser' '-u' 'deos-author' '--' 'env' '-i' 'PATH=/usr/local/bin:/usr/bin:/bin' 'HOME=/home/deos-author' 'npm' 'run' 'build'

```

```output

> sac-225-web-calculator@1.0.0 build
> vite build

vite v8.3.0 building client environment for production...
transforming...
✓ 7 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                  2.90 kB │ gzip: 0.75 kB
dist/assets/index-BmItL76X.css   2.53 kB │ gzip: 1.17 kB
dist/assets/index-CRAn43Vl.js   10.77 kB │ gzip: 4.52 kB

✓ built in 401ms
```


# sac-225 behavior check

*2026-09-16T09:26:25Z by Showboat 0.6.1*
<!-- showboat-id: 68c2d7fa-79c4-4c5d-b253-9fa3ff83bfed -->

```bash
'runuser' '-u' 'deos-author' '--' 'env' '-i' 'PATH=/usr/local/bin:/usr/bin:/bin' 'HOME=/home/deos-author' 'bash' '/deos/output/publication-adjustment-audit.sh'

```

```output
PASS workflow omitted: .github/workflows/pages-preview.yml
PASS task ledger records the human-directed omission
UNCHANGED .gitignore blob=deda5811dc40c75d4b7acfdbd8487f0f86f38bef
UNCHANGED index.html blob=a1a09a9ee5cc99cc4a313defe2d3f7d28060284e
UNCHANGED package-lock.json blob=94eb2e4f3c10d78f91ab18cdf2cee3f87b62d480
UNCHANGED package.json blob=b41c22b3458b7eaf290d0783d4196f8f549231a3
UNCHANGED playwright.config.js blob=bc7aa04446012874ec823fcaa1aecaa6ed90bae6
UNCHANGED scripts/demo-local-workerd.mjs blob=2a83295d158dfdd2edee37ee9331a5d04a6859b3
UNCHANGED scripts/extract-preview-url.mjs blob=1b7654d6cb9250edf6cc727c0044e3cccc192ca0
UNCHANGED scripts/smoke-preview.mjs blob=96adfe14d98349a2f90dd27357758ea0795425c4
UNCHANGED scripts/write-review-summary.mjs blob=2eadc18905b3eb322054fc467e49fecca9e80f37
UNCHANGED src/calculator.js blob=caac32be4fe4bd14e2ad7c94b69c365a1e76dd07
UNCHANGED src/main.js blob=2a2d51730650d73b9a38045d87b593975958b9e5
UNCHANGED src/styles.css blob=9f6075ccb4d31c39e7e63d8edf539a73a8f3b8b8
UNCHANGED tests/e2e/calculator.spec.js blob=62a14012f566f8ffebcf0a9582776a89b9656445
UNCHANGED tests/evidence/evidence.spec.js blob=e4045ee6968d9e8b6564b86999a6664ef8d1a472
UNCHANGED tests/unit/calculator.test.js blob=e4259aa3141bd8d7908892930eee7ada9216020e
UNCHANGED vitest.config.js blob=5e5f89e229e6983b7ff5b6117ad0b804b14a828a
HOSTED-ASSET-MATCH dist/assets/index-BmItL76X.css sha256=e1d0ec6e9f3fd7dc642e55f1a73bcbcc73c98de59d38b529574f27ab8b3a5932
HOSTED-ASSET-MATCH dist/assets/index-CRAn43Vl.js sha256=f31b040a72a43ba0f334b9a8189ea66eb07ab5d36c0a1f9511f5c4ac62de6d8f
HOSTED-ASSET-MATCH dist/index.html sha256=26bf667843e86cd293032e509fc5634c5be9f476d9780083d83c46d706f60288
PASS calculator sources, tests, tooling, and rebuilt runtime assets are unchanged
```


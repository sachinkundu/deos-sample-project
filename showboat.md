# SAC-243 behavior proof

1. Anonymous first visit to the hosted desktop preview shows the add form, all five filters, an empty ledger, and a €0.00 visible total.

   ![Anonymous first visit to the hosted desktop preview shows the add form, all five filters, an empty ledger, and a €0.00 visible total.](images/b060685a3ef19a978f4187c19c1c49f188bb6fd47f9e5dcc243a44c27fee49f9.png)

2. Adding Train in Travel leaves both expenses visible and recalculates the exact total to €32.50.

   ![Adding Train in Travel leaves both expenses visible and recalculates the exact total to €32.50.](images/2a7fed8b9cfc671c4925649d0eff7fdd9a2a7fb4123425ad01686f39f848d2ac.png)

3. Saving the edit replaces Train with Power bill in Bills and recalculates the all-expense total to €58.25.

   ![Saving the edit replaces Train with Power bill in Bills and recalculates the all-expense total to €58.25.](images/3f49447da09ee0fad5b78246f14fcac88644828504589a823cb90de998beefb8.png)

4. After a real refresh, Lunch and Power bill retain the same names, categories, amounts, and €58.25 total.

   ![After a real refresh, Lunch and Power bill retain the same names, categories, amounts, and €58.25 total.](images/d4c13ee448aaf51d456913f3af19630d1e4b6bbf05bae63133ec3486f02f368b.png)

5. After another real refresh, the deleted Lunch expense does not return and Power bill remains saved.

   ![After another real refresh, the deleted Lunch expense does not return and Power bill remains saved.](images/7c19ac3d8c48c4664cc136234b9fe1ab2d2d91cf53b9a457446348046c783adb.png)

6. A blank name is rejected with a clear name message while the saved Lunch row and €12.50 total stay unchanged.

   ![A blank name is rejected with a clear name message while the saved Lunch row and €12.50 total stay unchanged.](images/6de8845d12f4117539f97f7cc6657ce946290869fbedea9c348c81874a8a872c.png)

7. An amount with three decimal places is rejected with the two-decimal limit and no Snack row is added.

   ![An amount with three decimal places is rejected with the two-decimal limit and no Snack row is added.](images/b53820df1407407a86567734297083567b0627c848e0f7c47c2ae863317e6aed.png)

8. A zero-value edit is rejected; the draft stays open while the saved Lunch value remains visibly €12.50.

   ![A zero-value edit is rejected; the draft stays open while the saved Lunch value remains visibly €12.50.](images/7ba753684c0991dba9eb2ccae69cc2c1f43ecfaac9de61414542cb0ed275091d.png)

9. The selected Food filter shows only Lunch and changes the visible total to €12.50.

   ![The selected Food filter shows only Lunch and changes the visible total to €12.50.](images/8462593552b6592e7374de80a4f66cee9a9da7c3d79d7927ed43490521744b16.png)

10. The selected Bills filter shows its empty state and a visible total of €0.00 without changing saved expenses.

   ![The selected Bills filter shows its empty state and a visible total of €0.00 without changing saved expenses.](images/dce4aea7abab302a8c0cee0aca0aa2400fe9b212d7c0aeabb0d1d2c020d0e772.png)

11. Adding a Travel expense while Food is selected switches to All, announces why, shows Taxi, and totals both rows at €20.90.

   ![Adding a Travel expense while Food is selected switches to All, announces why, shows Taxi, and totals both rows at €20.90.](images/3e63952e05d8ee4be089e629739c1b032a3a3b4cc48551f5e9da306194ea5088.png)

12. Harness-forced allowlist probe — Entertainment is rejected with the four-category message; Concert is absent and Lunch with €12.50 is unchanged.

   ![Harness-forced allowlist probe — Entertainment is rejected with the four-category message; Concert is absent and Lunch with €12.50 is unchanged.](images/31436c891e09d29a2a4c4c7f0d9180d443b610d8c9e9eeb177eb386c5bdcf6fd.png)

13. The storage harness opens a blocked recovery state: no partial expense is loaded, mutations are disabled, and clearing requires confirmation.

   ![The storage harness opens a blocked recovery state: no partial expense is loaded, mutations are disabled, and clearing requires confirmation.](images/33e57fb4b41f0bfc45b1aa76ace83e1a451cf1a2f28123df91ff4541d1cfafb7.png)

14. A preflight conflict rejects the stale edit, adopts Coffee from the external document, and preserves the €15.00 edit draft for review.

   ![A preflight conflict rejects the stale edit, adopts Coffee from the external document, and preserves the €15.00 edit draft for review.](images/554f9e01e1fbec24778e9b7a70e5008af8cffcba14f10ebb10ef2fee852f8ba2.png)

15. After refresh, the recovered and retried document remains saved with Lunch, Coffee, and the €18.00 total.

   ![After refresh, the recovered and retried document remains saved with Lunch, Coffee, and the €18.00 total.](images/bddcbc80116118bdc7dfe134c7e0d2f20030737eb1042c266ca41e66fd45ca89.png)

# sac-243 behavior check

*2026-09-17T06:55:45Z by Showboat 0.6.1*
<!-- showboat-id: f2a81010-cd7d-4d69-99b2-dfef82447df9 -->

```bash
'runuser' '-u' 'deos-author' '--' 'env' '-i' 'PATH=/usr/local/bin:/usr/bin:/bin' 'HOME=/home/deos-author' 'NODE_EXTRA_CA_CERTS=/etc/cloudflare/certs/cloudflare-containers-ca.crt' 'node' '/deos/output/requests/behavior-proof.mjs'

```

```output
Unsupported category: rejected with the four-category allowlist; saved document unchanged (1 expense).
Exact large total: €9007199254740994.00
Stale write: rejected; latest valid document adopted with 2 expenses.
```


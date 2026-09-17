# SAC-245 behavior proof

1. Kindred and Dune begin in To read, with the global counts showing 2, 0, and 0.

   ![Kindred and Dune begin in To read, with the global counts showing 2, 0, and 0.](images/c6f1b2305ff1ce2e9526cbb0c0c28042e9379f5cb4ecf4721846d123b420ac48.png)

2. Moving Kindred to Reading updates its badge and changes the global counts to 1, 1, and 0.

   ![Moving Kindred to Reading updates its badge and changes the global counts to 1, 1, and 0.](images/661a6495e9fe02888466db586c3e5e7ead143bb98b19601ba27380047ab867a5.png)

3. Moving Kindred to Finished updates its badge and changes the global counts to 1, 0, and 1.

   ![Moving Kindred to Finished updates its badge and changes the global counts to 1, 0, and 1.](images/9b39c50e76f98bd2f615647bdbb4afd9e2e3702fa60d66659b003160ea89eb58.png)

4. Moving Kindred back to To read restores counts of 2, 0, and 0 while preserving book order.

   ![Moving Kindred back to To read restores counts of 2, 0, and 0 while preserving book order.](images/233de352bff033ba9f311f8550440f7bc03807c4e5b24d4a6784ca10359e9f5c.png)

5. A blank title shows the inline Add a title error and leaves the saved Kindred row unchanged.

   ![A blank title shows the inline Add a title error and leaves the saved Kindred row unchanged.](images/91d035728a0e1c38061361f5b2f8bcd9cdd5c5e3f26804ae4119adbed2065b61.png)

6. The selected Reading filter shows only Kindred while global counts still include The Dispossessed in To read.

   ![The selected Reading filter shows only Kindred while global counts still include The Dispossessed in To read.](images/cb895a45bfe81ca3a16c27ea9cc290715412f89514f2ac196c487b1ce45730bf.png)

7. The selected Finished filter shows its explicit empty state while the global To read and Reading counts remain visible and unchanged.

   ![The selected Finished filter shows its explicit empty state while the global To read and Reading counts remain visible and unchanged.](images/f42bceb0e5915544c919a9c67c77bedb5b88b56ad66f69cf8639f05bd7fba1e3.png)

8. A blank author edit shows the inline Add an author error without committing the draft.

   ![A blank author edit shows the inline Add an author error without committing the draft.](images/2343239a451734ab1dfb386cb62602441c5e4130dbee382ebbe7c316093b06ea.png)

9. After correcting the rejected edit, Dune Messiah still shows Frank Herbert and Reading with the error cleared.

   ![After correcting the rejected edit, Dune Messiah still shows Frank Herbert and Reading with the error cleared.](images/37be24401a22a3c889dc6393cb60c732c7303e20bbe83294f0dcf628a03fd75c.png)

10. Three saved books occupy Finished, Reading, and To read with one global count in each status.

   ![Three saved books occupy Finished, Reading, and To read with one global count in each status.](images/1c0e4eaf13cff0f9f25a9c62b9006ca414e0d243aa39cd00c4a02147ab46d5f8.png)

11. Deleting Dune removes its row and reduces only the Reading count to zero.

   ![Deleting Dune removes its row and reduces only the Reading count to zero.](images/e6b436885a7c304a435e2b005fcd808a77dd344214c9609b190cf2b35c8fca94.png)

12. After refresh, Kindred and The Dispossessed reload in order with their statuses and counts, and Dune stays deleted.

   ![After refresh, Kindred and The Dispossessed reload in order with their statuses and counts, and Dune stays deleted.](images/cb8375871d874196e63f79009b257b5cfd13075aa331446ba4821097277771ef.png)

13. After refresh, both literal markup-looking text and the wrapped long title reload from browser storage.

   ![After refresh, both literal markup-looking text and the wrapped long title reload from browser storage.](images/81fbb0356df16d3a2a44b955561e1da884aaa5bfc2e790af6bf947c913b27273.png)

# sac-245 behavior check

*2026-09-17T11:36:27Z by Showboat 0.6.1*
<!-- showboat-id: 0d5629db-4d87-444c-98e5-b5d4071be82b -->

```bash
'runuser' '-u' 'deos-author' '--' 'env' '-i' 'PATH=/usr/local/bin:/usr/bin:/bin' 'HOME=/home/deos-author' 'NODE_EXTRA_CA_CERTS=/etc/cloudflare/certs/cloudflare-containers-ca.crt' 'node' '-e' 'const fs=require('\''fs'\''); const html=fs.readFileSync('\''dist/index.html'\'','\''utf8'\''); const refs=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]).filter(x=>x.startsWith('\''/assets/'\'')); if(refs.length!==2) throw new Error('\''Expected one script and one stylesheet'\''); for(const ref of refs){const path='\''dist'\''+ref; if(!fs.existsSync(path)) throw new Error('\''Missing '\''+path); console.log(ref+'\'' — '\''+fs.statSync(path).size+'\'' bytes'\'')} const bundle=refs.map(ref=>fs.readFileSync('\''dist'\''+ref,'\''utf8'\'')).join('\''\n'\''); if(/https?:\/\//.test(bundle)) throw new Error('\''Unexpected runtime network URL'\''); console.log('\''Static entry point resolves every required asset.'\''); console.log('\''Application bundle contains no runtime network URL.'\'');'

```

```output
/assets/index-BrN4B9mY.js — 12932 bytes
/assets/index-BZYleh6D.css — 7558 bytes
Static entry point resolves every required asset.
Application bundle contains no runtime network URL.
```


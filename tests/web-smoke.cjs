/* Smoke-test sem navegador, rede ou credenciais. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const src = fs.readFileSync('docs/app.js', 'utf8');
const stop = src.indexOf("$('files').addEventListener");
assert.ok(stop > 0,'Missing event-handler bootstrap marker');
const scope = {URL, Date, console, setTimeout, clearTimeout};
vm.createContext(scope);
vm.runInContext(src.slice(0,stop)+';globalThis.TEST={parseOfferHTML,parseCSV,parseJSON,makeFlow,makeCaption,makeDM,score,normalize};',scope);
const t = scope.TEST;
const raw={appProps:{pageProps:{data:{items:[{type:'ORGANIC_ITEM',position:1,card:{
 metadata:{id:'MLB1234567890',url:'www.mercadolivre.com.br/produto-test/p/MLB123456'},
 pictures:{pictures:[{id:'605306-MLA119872143535_102026'}]},
 components:[
  {type:'title',title:{text:'Câmera WiFi segurança'}} ,
  {type:'seller',seller:{values:[{key:'label',label:{text:'Loja Teste'}}]}},
  {type:'review_compacted',review_compacted:{values:[{key:'label',label:{text:'4.9'}},{key:'label2',label:{text:'| +10mil vendidos'}}]}},
  {type:'price',price:{current_price:{value:68.9},price_labels:[{values:[{price:{previous:true,value:199.9}}]}],discount_polylabel:{values:[{pill:{text:'65% OFF'}}]},unit_description:{text:'no Pix'}}},
  {type:'shipping_v2',shipping_v2:[{text:'Frete grátis'}]}
 ]
}}]}}}};
const html='<script id="__NORDIC_RENDERING_CTX__">_n.ctx.r='+JSON.stringify(raw)+';</script>';
const rows=t.parseOfferHTML(html);
assert.equal(rows.length,1);assert.equal(rows[0].id,'MLB1234567890');assert.equal(rows[0].price,68.9);
assert.equal(rows[0].discount,65);assert.equal(rows[0].rating,4.9);
assert.ok(rows[0].image.includes('http2.mlstatic.com'));assert.equal(rows[0].pix,true);
const product={...rows[0],affiliate:'https://www.mercadolivre.com.br/meu-link'};
assert.match(t.makeFlow(product),/GOOGLE FLOW/i);assert.match(t.makeFlow(product),/NÃO adicionar nenhum texto/);assert.match(t.makeFlow(product),/EU QUERO/);
assert.match(t.makeCaption(product),/Comente EU QUERO/);assert.match(t.makeCaption(product),/https:\/\/www.mercadolivre.com.br\/meu-link/);
assert.doesNotMatch(t.makeCaption(product),/link na bio/i);
assert.match(t.makeDM(product),/https:\/\/www.mercadolivre.com.br\/meu-link/);
const csv='item_id,title,price,image_url\nMLB1234567890,"Câmera WiFi segurança",68.90,https://http2.mlstatic.com/test.webp';
assert.equal(t.parseCSV(csv).length,1);
assert.equal(t.parseJSON(JSON.stringify({offers:[product]}))[0].affiliate,product.affiliate);
const evaluated=t.score({...rows[0],lastSeen:Date.now()});
assert.ok(evaluated.priority>=0&&evaluated.priority<=100);
console.log('Web smoke-test OK: cards, preço, imagem, prompt Veo, legenda, DM, CSV, JSON, ranking.');

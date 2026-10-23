const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const manifest=JSON.parse(fs.readFileSync('extension-chrome/manifest.json','utf8'));
assert.equal(manifest.manifest_version,3);
assert.ok(manifest.permissions.includes('scripting'));
assert.ok(manifest.permissions.includes('downloads'));
assert.deepEqual(manifest.host_permissions,['https://www.mercadolivre.com.br/*']);
const script=fs.readFileSync('extension-chrome/capture.js','utf8');
const item={type:'ORGANIC_ITEM',position:1,card:{
 metadata:{id:'MLB4035471677',url:'www.mercadolivre.com.br/teste/p/MLB23037572'},
 pictures:{pictures:[{id:'794417-MLA99985509435_112025'}]},
 components:[
 {type:'title',title:{text:'TP-Link Tapo C500 Câmera de Segurança'}},
 {type:'seller',seller:{values:[{key:'label',label:{text:'TP-LINK'}}]}},
 {type:'review_compacted',review_compacted:{values:[{key:'label',label:{text:'4.8'}},{key:'label2',label:{text:'| +50mil vendidos'}}]}},
 {type:'price',price:{current_price:{value:171.75},price_labels:[{values:[{price:{previous:true,value:299.9}}]}],discount_polylabel:{values:[{pill:{text:'42% OFF'}}]},unit_description:{text:'no Pix'}}},
 {type:'promotions',promotions:[{type:'coupon',text:'{1} com Cupom',values:[{type:'price',price:{value:156.75}}]}]},
 {type:'shipping_v2',shipping_v2:[{text:'Frete grátis'}]}
 ],
 widget_components:[{poly_label_component:{countdown:{period_end:'2026-10-24T03:00:00Z'}}}]
}};
const page={appProps:{pageProps:{data:{items:[item]}}}};
const ctx={
 document:{getElementById:id=>id==='__NORDIC_RENDERING_CTX__'?{textContent:'_n.ctx.r='+JSON.stringify(page)+';'}:null},
 location:{origin:'https://www.mercadolivre.com.br',pathname:'/ofertas',search:'?promotion_type=lightning'},
 URL, URLSearchParams, Date, console
};
vm.createContext(ctx);
vm.runInContext(script+';globalThis.capture=readOffersFromVisiblePage;',ctx);
const result=ctx.capture();
assert.equal(result.section,'relampago');
assert.equal(result.items.length,1);
const x=result.items[0];
assert.equal(x.id,'MLB4035471677');
assert.equal(x.price,171.75);
assert.equal(x.previous,299.9);
assert.equal(x.discount,42);
assert.equal(x.rating,4.8);
assert.equal(x.couponPrice,156.75);
assert.equal(x.pix,true);
assert.equal(x.shipping,true);
assert.equal(x.expiry,'2026-10-24T03:00:00Z');
assert.match(x.image,/^https:\/\/http2\.mlstatic\.com\//);
assert.equal(x.source,'relampago');
assert.equal(x.url,'https://www.mercadolivre.com.br/teste/p/MLB23037572');
assert.ok(x.sold.includes('50mil'));
assert.equal(x.sponsored,false);
const pwa=JSON.parse(fs.readFileSync('docs/manifest.webmanifest','utf8'));
assert.equal(pwa.share_target.method,'POST');
assert.ok(pwa.share_target.params.files.some(f=>f.accept.includes('.html')));
console.log('Chrome extension smoke-test OK: ofertas, preços, Pix, cupom, link e imagem.');
console.log('PWA manifest share target OK.');

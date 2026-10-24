'use strict';
const $=id=>document.getElementById(id);
function csvRows(text){
 text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"')quoted=false;else cell+=c;}else if(c==='"')quoted=true;else if(c===','){row.push(cell);cell='';}else if(c==='\n'){row.push(cell);rows.push(row);row=[];cell='';}else if(c!=='\r')cell+=c;}
 if(cell||row.length){row.push(cell);rows.push(row);}return rows;
}
function parseCSV(text,ranking='conversion'){
 const rows=csvRows(text);if(rows.length<2)throw Error('CSV sem produtos.');
 const head=rows.shift().map(s=>s.trim().toLowerCase());
 const idcol=head.findIndex(s=>['id','item_id','product_id'].includes(s)),urlcol=head.findIndex(s=>['url','url_publica','product_url'].includes(s));
 const titlecol=head.findIndex(s=>['title','titulo'].includes(s));
 const rankcol=head.indexOf(ranking), prioritycol=head.indexOf('priority'), conversioncol=head.indexOf('conversion');
 if(rankcol<0)throw Error('CSV sem coluna '+ranking+'. Exporte pelo botão Exportar CSV do painel Observatório ML.');
 if(idcol<0||urlcol<0)throw Error('CSV precisa ter colunas id e url.');
 const map=new Map();
 for(const r of rows){
  const id=(r[idcol]||'').trim().toUpperCase(),url=(r[urlcol]||'').trim();
  if(!/^MLB\d{7,14}$/.test(id)||map.has(id))continue;
  try{const u=new URL(url);if(u.protocol!=='https:'||!['www.mercadolivre.com.br','produto.mercadolivre.com.br'].includes(u.hostname))continue;
   map.set(id,{id,url:u.href,title:(r[titlecol]||'').slice(0,180),rank:Number(r[rankcol]||0),priority:Number(r[prioritycol]||0),conversion:Number(r[conversioncol]||0)});
  }catch{}
 }
 return [...map.values()].sort((a,b)=>b.rank-a.rank||b.conversion-a.conversion||b.priority-a.priority).slice(0,20);
}
$('start').onclick=async()=>{
 try{const file=$('file').files[0];if(!file)throw Error('Selecione o CSV completo exportado pelo painel.');
 const items=parseCSV(await file.text(),$('ranking').value);if(!items.length)throw Error('Nenhum item válido; confira os IDs e URLs no CSV.');
 const ans=await chrome.runtime.sendMessage({type:'OML_BEGIN',items});
 if(!ans.ok)throw Error(ans.error);$('status').textContent='Iniciado: '+items.length+' melhores produtos. A extensão tentará abrir Compartilhar automaticamente.';
 }catch(e){$('status').textContent='Erro: '+e.message;}
};
$('cancel').onclick=async()=>{await chrome.runtime.sendMessage({type:'OML_CANCEL'});$('status').textContent='Captura interrompida. Links concluídos continuam disponíveis para exportação.'};
$('export').onclick=async()=>{
 const ans=await chrome.runtime.sendMessage({type:'OML_EXPORT'}),b=ans.batch;
 if(!b?.done?.length){$('status').textContent='Ainda não há links capturados.';return;}
 const safe=x=>'"'+String(x??'').replace(/"/g,'""')+'"';
 const lines=['id,affiliate',...b.done.map(r=>[r.id,r.affiliate].map(safe).join(','))];
 const data='\uFEFF'+lines.join('\r\n');const url='data:text/csv;charset=utf-8,'+encodeURIComponent(data);
 await chrome.downloads.download({url,filename:'observatorio-top20-afiliados.csv',saveAs:true,conflictAction:'uniquify'});
 $('status').textContent='CSV de afiliados exportado: '+b.done.length+' links.';
};
async function status(){try{const r=await chrome.runtime.sendMessage({type:'OML_STATUS'}),b=r.batch;if(!b)return;
 $('status').textContent='Status: '+b.status+'\nCapturados: '+b.done.length+'/'+b.items.length+'\nPróximo: '+(b.items[b.index]?.title||'—');
 }catch{}}
status();setInterval(status,2200);

#!/usr/bin/env python3
"""Converte CSV do Observatório em feed público (SEM segredo, sem token, sem sessão).
Uso: python tools/gerar_feed.py ranking_ofertas_ml.csv
Produz: docs/data/ofertas.json
ATENÇÃO: os preços podem estar desatualizados; este arquivo será público no GitHub.
"""
import csv
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/"docs"/"data"/"ofertas.json"

def amount(v):
    if v in (None,""):return None
    try:return float(v)
    except (ValueError,TypeError):return None

def url(v,images=False):
    try:
        p=urlparse(str(v or ""))
        allowed=("http2.mlstatic.com",) if images else ("www.mercadolivre.com.br","produto.mercadolivre.com.br")
        return p.geturl() if p.scheme=="https" and p.hostname in allowed else ""
    except (TypeError,ValueError):return ""

def read_offers(path):
    with path.open(encoding="utf-8-sig",newline="") as stream:
        for row in csv.DictReader(stream):
            item=(row.get("item_id") or row.get("id") or "").strip()
            title=(row.get("title") or row.get("titulo") or "").strip()
            price=amount(row.get("price") or row.get("preco_exibido"))
            if not re.fullmatch(r"MLB\d{7,14}",item) or not title or price is None:
                continue
            yield {"id":item,"title":title[:400],"seller":(row.get("seller") or row.get("vendedor_exibido") or "")[:150],
                "price":price,"previous":amount(row.get("previous_displayed") or row.get("preco_riscado")),
                "discount":amount(row.get("discount_advertised") or row.get("desconto_anunciado_pct")),
                "rating":amount(row.get("rating")),"sold":(row.get("sold_text") or "")[:100],
                "source":(row.get("offer_source") or "publicado")[:40],
                "image":url(row.get("image_url"),images=True),
                "url":url(row.get("url") or row.get("url_publica")),
                "pix":str(row.get("pix") or "").lower() in ("true","1"),
                "shipping":str(row.get("free_shipping") or "").lower() in ("true","1"),
                "couponPrice":amount(row.get("coupon_price")),"couponDiscount":amount(row.get("coupon_discount")),
                "expiry":str(row.get("expires_at") or "")[:90]}

def main():
    if len(sys.argv)!=2:
        raise SystemExit("Uso: python tools/gerar_feed.py caminho/para/ranking_ofertas_ml.csv")
    path=Path(sys.argv[1])
    if not path.is_file():raise SystemExit("CSV não encontrado: "+str(path))
    rows={x["id"]:x for x in read_offers(path)}
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    data={"format":"observatorio-ml-offers","version":1,"generatedAt":datetime.now(timezone.utc).isoformat(),
          "notice":"Preços de capturas históricas; confirme no anúncio. Feed público.", "offers":list(rows.values())}
    OUTPUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"{len(rows)} produtos públicos preparados em {OUTPUT}")
    print("Revise o JSON antes do commit; só publique dados comerciais que podem ficar públicos.")
if __name__=="__main__":main()

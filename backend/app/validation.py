from difflib import SequenceMatcher

from app.catalog import CATALOG
from app.models import Item


def _similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def match_catalog(product_name: str) -> tuple[str | None, dict | None]:
    best_match = None
    best_score = 0.0

    for catalog_name, meta in CATALOG.items():
        score = _similarity(product_name, catalog_name)
        if score > best_score:
            best_score = score
            best_match = (catalog_name, meta)

    return (best_match[0], best_match[1]) if best_score >= 0.6 else (None, None)


def validate_item(item: Item) -> str | None:
    if item.quantidade <= 0:
        return "Quantidade inválida."

    if item.quantidade >= 500:
        return "Quantidade muito alta. Verifique o pedido."

    catalog_name, meta = match_catalog(item.produto)

    if catalog_name and meta:
        expected = meta["unidade_padrao"]
        if _similarity(item.unidade, expected) < 0.6:
            return f"Unidade inesperada. Use {expected}."
    else:
        return "Produto não encontrado no catálogo."

    return None


def item_confidence(item: Item) -> float:
    score = 1.0

    if item.alerta:
        score -= 0.3

    catalog_name, _ = match_catalog(item.produto)
    if catalog_name:
        score += 0.1
    else:
        score -= 0.2

    common_units = {"unidade", "kg", "g", "litro", "ml", "caixa", "pacote", "garrafa", "lata", "fardo"}
    if item.unidade.lower() not in common_units:
        score -= 0.15

    return round(max(0.0, min(1.0, score)), 2)

from app.state import _app_settings


def build_interpretation_prompt(text: str) -> str:
    default_unit = _app_settings["default_unit"]
    strict_note = (
        "- Seja rigoroso: só inclua itens quando tiver certeza. "
        "Caso algo esteja muito ambíguo, ignore.\n"
        if _app_settings["strict_mode"]
        else ""
    )

    return f"""Você é o motor de interpretação de pedidos de uma plataforma de distribuição de alimentos.

Seu trabalho é ler a mensagem livre enviada por um cliente e convertê-la em um pedido estruturado.

Extraia cada item mencionado no pedido abaixo e retorne EXCLUSIVAMENTE um JSON no seguinte formato:
{{"items": [{{"produto": "nome normalizado do produto", "quantidade": numero, "unidade": "unidade normalizada"}}]}}

Diretrizes de interpretação:
- Separe cada produto em um item distinto, mesmo que o cliente os liste na mesma linha.
- Normalize nomes de produtos para português claro e padronizado (ex.: "refri cola" → "Refrigerante Cola", "leit integral" → "Leite Integral").
- Converta unidades abreviadas para a forma completa e padronizada:
  "cx" → "caixa", "kg" → "kg", "g" → "g", "l" → "litro", "ml" → "ml", "un", "und", "pct" → "{default_unit}".
- Quando a quantidade for escrita por extenso ("cinco", "meia dúzia", "uma dúzia"), converta para número.
- Se o cliente pedir "uma dúzia" ou "1 dz", use quantidade 12 e unidade "{default_unit}".
- Se a unidade não estiver explícita, infera a mais provável para o produto ou use "{default_unit}".
- Sempre retorne a quantidade como número, nunca como string.
- Ignore informações irrelevantes como saudações, endereço, data de entrega ou formas de pagamento.
- Se o pedido não contiver nenhum produto, retorne {{"items": []}}.
{strict_note}- NÃO inclua explicações, markdown ou texto fora do JSON.

Pedido do cliente:
{text}
"""

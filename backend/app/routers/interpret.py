import json
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException

from app.config import MODEL, OPENAI_API_KEY
from app.models import Interpretation, Item, OrderInput, UpdateInterpretationInput
from app.prompts import build_interpretation_prompt
from app.state import MAX_HISTORY, _interpretations_db
from app.validation import item_confidence, validate_item

router = APIRouter()


@router.post("", response_model=Interpretation)
async def interpret(input: OrderInput):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="Chave da OpenAI não configurada no servidor.")

    prompt = build_interpretation_prompt(input.text)

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.2,
                },
            )
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(content)
    except httpx.HTTPStatusError:
        raise HTTPException(status_code=502, detail="Não deu pra interpretar esse pedido agora. A OpenAI retornou um erro.")
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="Parece que estamos sem conexão com a OpenAI. Tente de novo daqui a pouco.")
    except (json.JSONDecodeError, KeyError, TypeError):
        raise HTTPException(status_code=500, detail="A IA respondeu algo inesperado. Tente reformular o pedido.")

    if not isinstance(parsed.get("items"), list):
        raise HTTPException(status_code=500, detail="A IA respondeu um formato que não reconhecemos.")

    items: list[Item] = []
    for raw in parsed["items"]:
        try:
            item = Item(produto=raw["produto"], quantidade=float(raw["quantidade"]), unidade=raw["unidade"], confianca=0.0)
            item.alerta = validate_item(item)
            item.confianca = item_confidence(item)
            items.append(item)
        except Exception:
            raise HTTPException(status_code=500, detail="A IA retornou dados inconsistentes. Tente reformular o pedido.")

    confidence = round(sum(item.confianca for item in items) / len(items), 2) if items else 0.0

    record = Interpretation(
        id=_next_id(),
        raw_text=input.text,
        confidence=confidence,
        items=items,
        total_items=len(items),
        interpreted_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    )

    _interpretations_db.insert(0, record.model_dump())
    if len(_interpretations_db) > MAX_HISTORY:
        _interpretations_db.pop()

    return record


@router.put("", response_model=Interpretation)
async def update_interpretation(input: UpdateInterpretationInput):
    record = next(
        (i for i in _interpretations_db if i["id"] == input.interpretation_id),
        None,
    )

    if not record:
        raise HTTPException(status_code=404, detail="Interpretação não encontrada.")

    if input.item.index >= len(record["items"]):
        raise HTTPException(status_code=400, detail="Item não encontrado na interpretação.")

    updated = Item(
        produto=input.item.produto,
        quantidade=input.item.quantidade,
        unidade=input.item.unidade,
        confianca=0.0,
    )
    updated.alerta = validate_item(updated)
    updated.confianca = item_confidence(updated)

    record["items"][input.item.index] = updated.model_dump()
    record["confidence"] = round(
        sum(item["confianca"] for item in record["items"]) / len(record["items"]),
        2,
    ) if record["items"] else 0.0

    return Interpretation(**record)


@router.get("/history", response_model=list[Interpretation])
async def history(limit: int = 10):
    return _interpretations_db[:limit]


@router.get("/history/{order_id}", response_model=Interpretation)
async def history_detail(order_id: str):
    for record in _interpretations_db:
        if record["id"] == order_id:
            return Interpretation(**record)
    raise HTTPException(status_code=404, detail="Interpretação não encontrada.")


def _next_id() -> str:
    import uuid
    return str(uuid.uuid4())[:8]

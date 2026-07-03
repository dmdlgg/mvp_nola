from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.models import CreateOrderInput, Order
from app.state import _interpretations_db, _orders_db

router = APIRouter()


@router.post("", response_model=Order)
async def create_order(input: CreateOrderInput):
    interpretation = next(
        (i for i in _interpretations_db if i["id"] == input.interpretation_id),
        None,
    )

    if not interpretation:
        raise HTTPException(status_code=404, detail="Interpretação não encontrada.")

    existing = next(
        (o for o in _orders_db if o["interpretation_id"] == input.interpretation_id),
        None,
    )

    if existing:
        raise HTTPException(status_code=409, detail="Esse pedido já foi aprovado.")

    order = Order(
        id=_next_id(),
        interpretation_id=interpretation["id"],
        status="aprovado",
        items=interpretation["items"],
        total_items=interpretation["total_items"],
        created_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    )

    _orders_db.insert(0, order.model_dump())
    return order


@router.get("", response_model=list[Order])
async def list_orders(limit: int = 50):
    return _orders_db[:limit]


def _next_id() -> str:
    import uuid
    return str(uuid.uuid4())[:8]

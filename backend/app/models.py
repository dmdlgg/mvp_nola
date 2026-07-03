from pydantic import BaseModel, Field


class Item(BaseModel):
    produto: str
    quantidade: float
    unidade: str
    alerta: str | None = None
    confianca: float


class Interpretation(BaseModel):
    id: str
    raw_text: str
    confidence: float
    items: list[Item]
    total_items: int
    interpreted_at: str


class Order(BaseModel):
    id: str
    interpretation_id: str
    status: str
    items: list[Item]
    total_items: int
    created_at: str


class Settings(BaseModel):
    default_unit: str = "unidade"
    strict_mode: bool = False


class OrderInput(BaseModel):
    text: str = Field(..., min_length=1)


class CreateOrderInput(BaseModel):
    interpretation_id: str


class ItemUpdate(BaseModel):
    index: int = Field(..., ge=0)
    produto: str = Field(..., min_length=1)
    quantidade: float = Field(..., gt=0)
    unidade: str = Field(..., min_length=1)


class UpdateInterpretationInput(BaseModel):
    interpretation_id: str
    item: ItemUpdate


class SettingsInput(BaseModel):
    defaultUnit: str | None = None
    strictMode: bool | None = None

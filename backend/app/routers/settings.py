from fastapi import APIRouter

from app.models import Settings, SettingsInput
from app.state import _app_settings

router = APIRouter()


@router.get("", response_model=Settings)
async def get_settings():
    return Settings(**_app_settings)


@router.put("", response_model=Settings)
async def update_settings(input: SettingsInput):
    if input.defaultUnit is not None:
        _app_settings["default_unit"] = input.defaultUnit.strip() or "unidade"
    if input.strictMode is not None:
        _app_settings["strict_mode"] = input.strictMode
    return Settings(**_app_settings)

import json
import os
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Optional
from urllib.request import Request, urlopen

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from calculator.models import FetchRun, ModelSnapshot


OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"


def _try_load_env_file(env_path: Path) -> dict[str, str]:
    if not env_path.exists():
        return {}

    values: dict[str, str] = {}
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        k, v = line.split("=", 1)
        k = k.strip()
        v = v.strip().strip('"').strip("'")
        if k:
            values[k] = v
    return values


def _to_decimal(value: Any) -> Optional[Decimal]:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return value
    if isinstance(value, (int, float, str)):
        try:
            return Decimal(str(value))
        except (InvalidOperation, ValueError):
            return None
    if isinstance(value, dict):
        # Defensive: some providers may nest values.
        for key in ("value", "price", "usd"):
            if key in value:
                return _to_decimal(value.get(key))
        return None
    return None


def _to_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(x) for x in value]
    return [str(value)]


@dataclass(frozen=True)
class ModelRow:
    name: str
    canonical_slug: str
    context_length: Optional[int]
    input_modalities: list[str]
    output_modalities: list[str]
    pricing_prompt: Optional[Decimal]
    pricing_completion: Optional[Decimal]
    pricing_image: Optional[Decimal]
    pricing_request: Optional[Decimal]


class Command(BaseCommand):
    help = "Fetch OpenRouter models and store a timestamped snapshot."

    def handle(self, *args: Any, **options: Any) -> None:
        api_key = os.environ.get("OPENROUTER_API_KEY")
        if not api_key:
            env_values = _try_load_env_file(Path(__file__).resolve().parents[3] / ".env")
            api_key = env_values.get("OPENROUTER_API_KEY")

        if not api_key:
            raise CommandError(
                "OPENROUTER_API_KEY is not set (env var or webapp/.env)."
            )

        payload = self._fetch_models(api_key)
        rows = self._parse_models(payload)

        if not rows:
            raise CommandError("No models returned from OpenRouter.")

        with transaction.atomic():
            fetch_run = FetchRun.objects.create()
            snapshots = [
                ModelSnapshot(
                    fetch_run=fetch_run,
                    name=r.name,
                    canonical_slug=r.canonical_slug,
                    context_length=r.context_length,
                    input_modalities=r.input_modalities,
                    output_modalities=r.output_modalities,
                    pricing_prompt=r.pricing_prompt,
                    pricing_completion=r.pricing_completion,
                    pricing_image=r.pricing_image,
                    pricing_request=r.pricing_request,
                )
                for r in rows
            ]
            ModelSnapshot.objects.bulk_create(snapshots, batch_size=500)

        self.stdout.write(
            self.style.SUCCESS(
                f"Fetched {len(rows)} models into run {fetch_run.id}."
            )
        )

    def _fetch_models(self, api_key: str) -> dict[str, Any]:
        req = Request(
            OPENROUTER_MODELS_URL,
            method="GET",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Accept": "application/json",
            },
        )

        try:
            with urlopen(req, timeout=30) as resp:
                raw = resp.read().decode("utf-8")
        except Exception as e:
            raise CommandError(f"Failed to fetch models: {e}") from e

        try:
            return json.loads(raw)
        except json.JSONDecodeError as e:
            raise CommandError(f"Invalid JSON response: {e}") from e

    def _parse_models(self, payload: dict[str, Any]) -> list[ModelRow]:
        data = payload.get("data")
        if not isinstance(data, list):
            raise CommandError("Unexpected response shape: missing data[].")

        rows: list[ModelRow] = []
        for item in data:
            if not isinstance(item, dict):
                continue

            name = str(item.get("name") or "")
            canonical_slug = str(item.get("canonical_slug") or item.get("id") or "")
            if not name or not canonical_slug:
                continue

            arch = item.get("architecture") or {}
            if not isinstance(arch, dict):
                arch = {}
            pricing = item.get("pricing") or {}
            if not isinstance(pricing, dict):
                pricing = {}

            context_length = item.get("context_length")
            if isinstance(context_length, bool):
                context_length = None
            if not isinstance(context_length, int):
                context_length = None

            rows.append(
                ModelRow(
                    name=name,
                    canonical_slug=canonical_slug,
                    context_length=context_length,
                    input_modalities=_to_list(arch.get("input_modalities")),
                    output_modalities=_to_list(arch.get("output_modalities")),
                    pricing_prompt=_to_decimal(pricing.get("prompt")),
                    pricing_completion=_to_decimal(pricing.get("completion")),
                    pricing_image=_to_decimal(pricing.get("image")),
                    pricing_request=_to_decimal(pricing.get("request")),
                )
            )
        return rows


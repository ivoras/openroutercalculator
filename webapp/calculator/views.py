from __future__ import annotations

from typing import Any

from django.http import JsonResponse
from django.shortcuts import render

from calculator.models import FetchRun, ModelSnapshot


def index(request):
    return render(request, "calculator/index.html")


def api_models(request):
    latest_run = FetchRun.objects.order_by("-fetched_at").first()
    if latest_run is None:
        return JsonResponse({"fetched_at": None, "models": []})

    qs = ModelSnapshot.objects.filter(fetch_run=latest_run).order_by("name")

    data: list[dict[str, Any]] = []
    for m in qs:
        data.append(
            {
                "name": m.name,
                "canonical_slug": m.canonical_slug,
                "context_length": m.context_length,
                "input_modalities": m.input_modalities,
                "output_modalities": m.output_modalities,
                "pricing_prompt": str(m.pricing_prompt) if m.pricing_prompt is not None else None,
                "pricing_completion": str(m.pricing_completion)
                if m.pricing_completion is not None
                else None,
                "pricing_image": str(m.pricing_image) if m.pricing_image is not None else None,
                "pricing_request": str(m.pricing_request)
                if m.pricing_request is not None
                else None,
            }
        )

    return JsonResponse({"fetched_at": latest_run.fetched_at.isoformat(), "models": data})

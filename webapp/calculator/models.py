from django.db import models

class FetchRun(models.Model):
    fetched_at = models.DateTimeField(auto_now_add=True, db_index=True)

    def __str__(self) -> str:
        return f"FetchRun({self.id}) @ {self.fetched_at.isoformat()}"


class ModelSnapshot(models.Model):
    fetch_run = models.ForeignKey(
        FetchRun, on_delete=models.CASCADE, related_name="models"
    )

    name = models.TextField()
    canonical_slug = models.TextField(db_index=True)
    context_length = models.IntegerField(null=True, blank=True)

    input_modalities = models.JSONField(default=list)
    output_modalities = models.JSONField(default=list)

    pricing_completion = models.DecimalField(
        max_digits=18, decimal_places=10, null=True, blank=True
    )
    pricing_prompt = models.DecimalField(
        max_digits=18, decimal_places=10, null=True, blank=True
    )
    pricing_image = models.DecimalField(
        max_digits=18, decimal_places=10, null=True, blank=True
    )
    pricing_request = models.DecimalField(
        max_digits=18, decimal_places=10, null=True, blank=True
    )

    class Meta:
        indexes = [
            models.Index(fields=["fetch_run", "canonical_slug"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.canonical_slug})"

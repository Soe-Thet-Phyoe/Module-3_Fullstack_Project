import logging

from django.db import DatabaseError
from django.db.models.functions import Lower
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from catalog.models import CategoryModel, ProductModel
from catalog.views import _product_payload

logger = logging.getLogger(__name__)


@require_GET
def shop_products(request):
    """Return the catalog products needed by the customer shop."""
    try:
        products = ProductModel.objects.select_related("category").order_by("-created_at", "-id")
        categories = CategoryModel.objects.order_by(Lower("name"), "id").values("id", "name")
        return JsonResponse({
            "products": [_product_payload(request, product) for product in products],
            "categories": list(categories),
        })
    except DatabaseError:
        logger.exception("Could not load shop products")
        return JsonResponse({"error": "Products could not be loaded from the database."}, status=503)


@require_GET
def shop_product_detail(request, product_id):
    """Return one product for the customer-facing product detail page."""
    try:
        product = ProductModel.objects.select_related("category").get(pk=product_id)
    except ProductModel.DoesNotExist:
        return JsonResponse({"error": "Product not found."}, status=404)
    except DatabaseError:
        logger.exception("Could not load shop product %s", product_id)
        return JsonResponse({"error": "Product could not be loaded from the database."}, status=503)

    return JsonResponse({"product": _product_payload(request, product)})

import json
import base64
import binascii
import logging
from decimal import Decimal, InvalidOperation
from io import BytesIO

from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.http.multipartparser import MultiPartParser
from django.db import DatabaseError, IntegrityError, transaction
from django.http import HttpResponse, JsonResponse
from django.views.decorators.http import require_http_methods
from PIL import Image, UnidentifiedImageError

from authentication.dashboard import dashboard_required
from catalog.models import CategoryModel, ProductModel

logger = logging.getLogger(__name__)
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_IMAGE_PIXELS = 25_000_000


def _valid_image_bytes(image_bytes):
    if len(image_bytes) > MAX_IMAGE_BYTES:
        return False
    try:
        with Image.open(BytesIO(image_bytes)) as image:
            if image.width * image.height > MAX_IMAGE_PIXELS:
                return False
            image.verify()
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        return False
    return True


def _product_payload(request, product):
    return {
        "id": str(product.id),
        "title": product.title,
        "price": str(product.price),
        "quantity": product.quantity,
        "image": request.build_absolute_uri(product.image.url) if product.image else None,
        "description": product.description,
        "category": str(product.category_id) if product.category_id else None,
        "category_name": product.category.name if product.category_id else None,
        "created_at": product.created_at.isoformat(),
        "updated_at": product.updated_at.isoformat(),
    }


def _product_form_values(request, product=None):
    data = request.POST
    files = request.FILES
    json_payload = None
    if request.method == "PATCH" and request.content_type.startswith("multipart/form-data"):
        data, files = MultiPartParser(request.META, request, request.upload_handlers).parse()
    if not data and request.content_type == "application/json":
        try:
            payload = json.loads(request.body)
            json_payload = payload if isinstance(payload, dict) else None
            data = json_payload or {}
        except (json.JSONDecodeError, UnicodeDecodeError):
            return None, "Request body must be valid JSON."
    raw_title = data.get("title", product.title if product else "")
    if not isinstance(raw_title, str):
        return None, "Product title must be text."
    title = raw_title.strip()
    raw_description = data.get("description", product.description if product else "")
    if not isinstance(raw_description, str):
        return None, "Product description must be text."
    description = raw_description.strip()
    if not title:
        return None, "Product title is required."
    if len(title) > 255:
        return None, "Product title must be 255 characters or fewer."
    try:
        price = Decimal(data.get("price", str(product.price) if product else ""))
    except (InvalidOperation, TypeError):
        return None, "Enter a valid product price."
    if not price.is_finite() or price < 0 or price.as_tuple().exponent < -2 or price >= Decimal("100000000"):
        return None, "Price must be between 0 and 99,999,999.99 with up to two decimal places."
    try:
        quantity = int(data.get("quantity", str(product.quantity) if product else ""))
    except (TypeError, ValueError):
        return None, "Enter a valid product quantity."
    if quantity < 0:
        return None, "Product quantity cannot be negative."

    category_id = data.get("category", str(product.category_id) if product and product.category_id else "") or ""
    if not isinstance(category_id, str):
        return None, "Choose a valid product category."
    category_id = category_id.strip()
    category = None
    if category_id:
        try:
            category = CategoryModel.objects.get(pk=category_id)
        except (CategoryModel.DoesNotExist, ValueError, TypeError, ValidationError):
            return None, "Choose a valid product category."
    values = {"title": title, "description": description, "price": price, "quantity": quantity, "category": category}
    if files.get("image"):
        image_file = files["image"]
        if image_file.size > MAX_IMAGE_BYTES:
            return None, "Product images must be 5 MB or smaller."
        image_bytes = image_file.read()
        image_file.seek(0)
        if not _valid_image_bytes(image_bytes):
            return None, "Upload a valid image no larger than 5 MB and 25 megapixels."
        values["image"] = image_file
    elif json_payload and json_payload.get("image"):
        image = json_payload["image"]
        if not isinstance(image, dict) or not isinstance(image.get("data"), str):
            return None, "Image must include a filename and base64 data."
        if len(image["data"]) > ((MAX_IMAGE_BYTES + 2) // 3) * 4:
            return None, "Product images must be 5 MB or smaller."
        try:
            image_bytes = base64.b64decode(image["data"], validate=True)
        except (binascii.Error, ValueError):
            return None, "Image data must be valid base64."
        if not _valid_image_bytes(image_bytes):
            return None, "Upload a valid image no larger than 5 MB and 25 megapixels."
        filename = image.get("filename", "product-image")
        if not isinstance(filename, str) or not filename.strip():
            return None, "Image filename is required."
        filename = filename.replace("\\", "/").rsplit("/", 1)[-1]
        if filename in {"", ".", ".."}:
            return None, "Image filename is required."
        values["image"] = ContentFile(image_bytes, name=filename)
    elif product and data.get("clear_image") in ("true", True):
        values["image"] = ""
    return values, None


@dashboard_required
@require_http_methods(["PATCH", "DELETE"])
def product_detail(request, product_id):
    try:
        product = ProductModel.objects.select_related("category").get(pk=product_id)
    except ProductModel.DoesNotExist:
        return JsonResponse({"error": "Product not found."}, status=404)
    except DatabaseError:
        return JsonResponse({"error": "Product could not be loaded from the database."}, status=503)

    if request.method == "DELETE":
        image_storage = product.image.storage if product.image else None
        image_name = product.image.name if product.image else None
        try:
            with transaction.atomic():
                product.delete()
        except DatabaseError:
            return JsonResponse({"error": "Product could not be deleted from the database."}, status=503)
        if image_storage and image_name:
            try:
                image_storage.delete(image_name)
            except OSError:
                logger.exception("Could not remove image for deleted product %s", product_id)
        return HttpResponse(status=204)

    values, error = _product_form_values(request, product)
    if error:
        return JsonResponse({"error": error}, status=400)
    try:
        for field, value in values.items():
            setattr(product, field, value)
        product.save()
        return JsonResponse({"product": _product_payload(request, product)})
    except DatabaseError:
        return JsonResponse({"error": "Product could not be saved to the database."}, status=503)


@dashboard_required
@require_http_methods(["GET", "POST"])
def products(request):
    if request.method == "GET":
        try:
            items = ProductModel.objects.select_related("category").order_by("-created_at", "-id")
            return JsonResponse({"products": [_product_payload(request, item) for item in items]})
        except DatabaseError:
            return JsonResponse({"error": "Products could not be loaded from the database."}, status=503)

    values, error = _product_form_values(request)
    if error:
        return JsonResponse({"error": error}, status=400)
    try:
        product = ProductModel.objects.create(**values)
        return JsonResponse({"product": _product_payload(request, product)}, status=201)
    except DatabaseError:
        return JsonResponse({"error": "Product could not be saved to the database."}, status=503)


def _category_payload(category):
    return {
        "id": str(category.id),
        "name": category.name,
        "created_at": category.created_at.isoformat(),
        "updated_at": category.updated_at.isoformat(),
    }


@dashboard_required
@require_http_methods(["GET", "POST"])
def categories(request):
    if request.method == "GET":
        try:
            items = CategoryModel.objects.order_by("-created_at", "-id")
            return JsonResponse({"categories": [_category_payload(item) for item in items]})
        except DatabaseError:
            return JsonResponse(
                {"error": "Categories could not be loaded from the database."},
                status=503,
            )

    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "Request body must be valid JSON."}, status=400)

    name = payload.get("name") if isinstance(payload, dict) else None
    if not isinstance(name, str) or not name.strip():
        return JsonResponse({"error": "Category name is required."}, status=400)

    name = name.strip()
    if len(name) > 255:
        return JsonResponse(
            {"error": "Category name must be 255 characters or fewer."}, status=400
        )

    try:
        if CategoryModel.objects.filter(name__iexact=name).exists():
            return JsonResponse(
                {"error": "A category with this name already exists."}, status=400
            )

        with transaction.atomic():
            item = CategoryModel.objects.create(name=name)
        return JsonResponse({"category": _category_payload(item)}, status=201)
    except IntegrityError:
        # Keep duplicate responses consistent if simultaneous requests race.
        return JsonResponse(
            {"error": "A category with this name already exists."}, status=400
        )
    except DatabaseError:
        return JsonResponse(
            {"error": "Category could not be saved to the database."}, status=503
        )


@dashboard_required
@require_http_methods(["PATCH", "DELETE"])
def category_detail(request, category_id):
    try:
        category = CategoryModel.objects.get(pk=category_id)
    except CategoryModel.DoesNotExist:
        return JsonResponse({"error": "Category not found."}, status=404)
    except DatabaseError:
        return JsonResponse(
            {"error": "Category could not be loaded from the database."}, status=503
        )

    if request.method == "DELETE":
        try:
            category.delete()
            return HttpResponse(status=204)
        except DatabaseError:
            return JsonResponse(
                {"error": "Category could not be deleted from the database."},
                status=503,
            )

    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "Request body must be valid JSON."}, status=400)

    name = payload.get("name") if isinstance(payload, dict) else None
    if not isinstance(name, str) or not name.strip():
        return JsonResponse({"error": "Category name is required."}, status=400)

    name = name.strip()
    if len(name) > 255:
        return JsonResponse(
            {"error": "Category name must be 255 characters or fewer."}, status=400
        )

    try:
        if CategoryModel.objects.filter(name__iexact=name).exclude(pk=category.pk).exists():
            return JsonResponse(
                {"error": "A category with this name already exists."}, status=400
            )
        category.name = name
        category.save(update_fields=["name", "updated_at"])
        return JsonResponse({"category": _category_payload(category)})
    except IntegrityError:
        return JsonResponse(
            {"error": "A category with this name already exists."}, status=400
        )
    except DatabaseError:
        return JsonResponse(
            {"error": "Category could not be saved to the database."}, status=503
        )

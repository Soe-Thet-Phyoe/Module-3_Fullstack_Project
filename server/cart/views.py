import json
from decimal import Decimal
from uuid import UUID

from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from catalog.models import ProductModel
from .models import Cart, CartItem


def cart_response(request, cart):
    items = []
    total = Decimal("0.00")
    for item in cart.items.select_related("product").order_by("pk"):
        product = item.product
        subtotal = product.price * item.quantity
        total += subtotal
        items.append({
            "product_id": str(product.pk), "title": product.title, "price": str(product.price),
            "image": request.build_absolute_uri(product.image.url) if product.image else None,
            "stock": product.quantity, "quantity": item.quantity, "line_total": str(subtotal),
        })
    return JsonResponse({"items": items, "total": str(total)})


def error(message, status):
    return JsonResponse({"error": message}, status=status)


@never_cache
@ensure_csrf_cookie
@require_GET
def current_cart(request):
    if not request.user.is_authenticated:
        return error("Sign in to view your cart.", 401)
    cart, _ = Cart.objects.get_or_create(user=request.user)
    return cart_response(request, cart)


@require_POST
def add_item(request):
    return change_item(request)


@require_http_methods(["PATCH", "DELETE"])
def edit_item(request, product_id):
    return change_item(request, product_id)


@transaction.atomic
def change_item(request, product_id=None):
    if not request.user.is_authenticated:
        return error("Sign in to change your cart.", 401)

    if request.method != "DELETE":
        try:
            data = json.loads(request.body)
        except (ValueError, UnicodeDecodeError):
            return error("Enter a valid JSON object.", 400)
        if not isinstance(data, dict) or type(data.get("quantity")) is not int or data["quantity"] < 1:
            return error("Quantity must be a positive whole number.", 400)
        quantity = data["quantity"]
        if request.method == "POST":
            try:
                product_id = UUID(str(data.get("product_id")))
            except ValueError:
                return error("Enter a valid product ID.", 400)

    # Serialize edits to this cart, including the first addition of a product.
    cart, _ = Cart.objects.select_for_update().get_or_create(user=request.user)
    item = cart.items.filter(product_id=product_id).first()
    if request.method != "POST" and item is None:
        return error("Item is no longer in your cart.", 404)
    if request.method == "DELETE":
        item.delete()
        return cart_response(request, cart)

    product = ProductModel.objects.select_for_update().filter(pk=product_id).first()
    if product is None:
        return error("Product is no longer available.", 404)
    if request.method == "POST" and item:
        quantity += item.quantity
    if quantity > product.quantity:
        return error(f"Only {product.quantity} available. Choose a smaller quantity.", 409)
    if item is None:
        CartItem.objects.create(cart=cart, product=product, quantity=quantity)
    else:
        item.quantity = quantity
        item.save(update_fields=["quantity"])
    return cart_response(request, cart)


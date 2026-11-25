import json
from decimal import Decimal
from uuid import UUID

from django.core.paginator import Paginator
from django.http import JsonResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_http_methods, require_POST

from authentication.dashboard import dashboard_required
from catalog.models import ProductModel
from .models import Order
from .services import EmptyCart, StockConflict, buy_product, place_order


def receipt(order):
    items = []
    total = Decimal("0.00")
    for item in order.items.all():
        subtotal = item.price * item.quantity
        total += subtotal
        items.append({
            "product_id": str(item.product_id), "title": item.title, "price": str(item.price),
            "quantity": item.quantity, "line_total": str(subtotal),
        })
    return {"id": str(order.pk), "created_at": order.created_at.isoformat(), "total": str(total), "items": items}


def order_page(request, queryset, *, include_customer=False):
    page = Paginator(queryset.prefetch_related("items"), 20).get_page(request.GET.get("page", 1))
    orders = []
    for order in page:
        entry = receipt(order)
        if include_customer:
            entry["customer"] = order.user.email or order.user.get_username()
        orders.append(entry)
    payload = {"orders": orders, "page": page.number, "pages": page.paginator.num_pages}
    if include_customer:
        payload["total_count"] = page.paginator.count
    return JsonResponse(payload)


@dashboard_required
@require_http_methods(["GET"])
def staff_orders(request):
    return order_page(request, Order.objects.select_related("user"), include_customer=True)


@never_cache
@require_POST
def buy_now(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Sign in to place an order."}, status=401)
    try:
        data = json.loads(request.body)
    except ValueError:
        return JsonResponse({"error": "Enter a valid JSON object."}, status=400)
    if not isinstance(data, dict) or type(data.get("quantity")) is not int or data["quantity"] < 1:
        return JsonResponse({"error": "Quantity must be a positive whole number."}, status=400)
    try:
        product_id = UUID(str(data.get("product_id")))
    except ValueError:
        return JsonResponse({"error": "Enter a valid product ID."}, status=400)

    try:
        order = buy_product(request.user, product_id, data["quantity"])
    except ProductModel.DoesNotExist:
        return JsonResponse({"error": "Product is no longer available."}, status=404)
    except StockConflict as exc:
        return JsonResponse({"error": str(exc), "available": exc.available}, status=409)
    return JsonResponse(receipt(order), status=201)


@never_cache
@require_http_methods(["GET", "POST"])
def orders(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Sign in to access your orders."}, status=401)
    if request.method == "POST":
        try:
            order = place_order(request.user)
        except EmptyCart as exc:
            return JsonResponse({"error": str(exc)}, status=400)
        except StockConflict as exc:
            return JsonResponse({"error": str(exc)}, status=409)
        return JsonResponse(receipt(order), status=201)

    return order_page(request, Order.objects.filter(user=request.user))

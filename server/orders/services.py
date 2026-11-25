from django.db import transaction

from cart.models import Cart
from catalog.models import ProductModel
from .models import Order, OrderItem


class EmptyCart(Exception):
    pass


class StockConflict(Exception):
    def __init__(self, product):
        self.available = product.quantity
        super().__init__(f"Only {self.available} available for {product.title}.")


@transaction.atomic
def place_order(user):
    # Cart edits lock the same cart first. Order product locks consistently
    # when different customers check out overlapping baskets.
    cart, _ = Cart.objects.select_for_update().get_or_create(user=user)
    lines = list(cart.items.select_related("product").select_for_update().order_by("product_id"))
    if not lines:
        raise EmptyCart("Your cart is empty.")

    order = _order_from_locked_products(user, [(line.product, line.quantity) for line in lines])
    cart.items.all().delete()
    return order


@transaction.atomic
def buy_product(user, product_id, quantity):
    product = ProductModel.objects.select_for_update().get(pk=product_id)
    return _order_from_locked_products(user, [(product, quantity)])


def _order_from_locked_products(user, purchases):
    for product, quantity in purchases:
        if quantity > product.quantity:
            raise StockConflict(product)

    order = Order.objects.create(user=user)
    receipts = []
    products = []
    for product, quantity in purchases:
        receipts.append(OrderItem(order=order, product_id=product.pk, title=product.title,
                                  price=product.price, quantity=quantity))
        product.quantity -= quantity
        products.append(product)
    OrderItem.objects.bulk_create(receipts)
    ProductModel.objects.bulk_update(products, ["quantity"])
    return order

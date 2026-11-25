from django.urls import path

from catalog.views import categories, category_detail, product_detail, products
from catalog.shop_views import shop_product_detail, shop_products

urlpatterns = [
    path("products/", products, name="products"),
    path("products/<uuid:product_id>/", product_detail, name="product-detail"),
    path("shop/products/", shop_products, name="shop-products"),
    path("shop/products/<uuid:product_id>/", shop_product_detail, name="shop-product-detail"),
    path("categories/", categories, name="categories"),
    path("categories/<uuid:category_id>/", category_detail, name="category-detail"),
]

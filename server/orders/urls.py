from django.urls import path

from .views import buy_now, orders

urlpatterns = [
    path("", orders, name="orders"),
    path("buy-now/", buy_now, name="buy_now"),
]

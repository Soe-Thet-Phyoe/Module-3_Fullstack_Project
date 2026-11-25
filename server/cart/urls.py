from django.urls import path

from . import views

app_name = "cart"
urlpatterns = [
    path("", views.current_cart, name="detail"),
    path("items/", views.add_item, name="add-item"),
    path("items/<uuid:product_id>/", views.edit_item, name="edit-item"),
]


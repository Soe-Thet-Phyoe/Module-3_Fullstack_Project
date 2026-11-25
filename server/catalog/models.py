from django.db import models
from django.db.models.functions import Lower

from server.models import BaseModel


class CategoryModel(BaseModel):
    name = models.CharField(max_length=255)

    class Meta:
        constraints = [models.UniqueConstraint(Lower("name"), name="catalog_category_name_ci_uniq")]

    def __str__(self):
        return self.name


class ProductModel(BaseModel):
    title = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()
    description = models.TextField()
    image = models.ImageField(upload_to="products/", blank=True)
    category = models.ForeignKey(
        CategoryModel,
        on_delete=models.SET_NULL,
        null=True,
        related_name="products",
    )

    def __str__(self):
        return self.title

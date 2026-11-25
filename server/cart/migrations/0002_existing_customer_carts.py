from itertools import batched

from django.conf import settings
from django.db import migrations


def create_existing_carts(apps, schema_editor):
    database = schema_editor.connection.alias
    users = apps.get_model(settings.AUTH_USER_MODEL).objects.using(database)
    Cart = apps.get_model("cart", "Cart")
    ids = users.values_list("pk", flat=True).iterator(chunk_size=1000)
    for batch in batched(ids, 1000):
        Cart.objects.using(database).bulk_create(
            [Cart(user_id=user_id) for user_id in batch], ignore_conflicts=True,
        )


class Migration(migrations.Migration):
    dependencies = [("cart", "0001_initial")]
    operations = [migrations.RunPython(create_existing_carts, migrations.RunPython.noop)]


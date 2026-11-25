from django.db import migrations


DEMO_CATEGORY_NAMES = ("Electronics", "Clothing", "Home & Living")


def seed_demo_categories(apps, schema_editor):
    CategoryModel = apps.get_model("catalog", "CategoryModel")
    database = schema_editor.connection.alias
    for name in DEMO_CATEGORY_NAMES:
        CategoryModel.objects.using(database).get_or_create(name=name)


class Migration(migrations.Migration):
    dependencies = [("catalog", "0001_initial")]

    operations = [migrations.RunPython(seed_demo_categories, migrations.RunPython.noop)]

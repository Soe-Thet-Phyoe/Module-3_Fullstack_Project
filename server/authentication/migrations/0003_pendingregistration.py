from django.conf import settings
from django.db import migrations, models


def remove_legacy_unverified_signups(apps, schema_editor):
    EmailVerification = apps.get_model("authentication", "EmailVerification")
    db_alias = schema_editor.connection.alias
    user_ids = EmailVerification.objects.using(db_alias).filter(user__is_active=False).values_list("user_id", flat=True)
    apps.get_model(*settings.AUTH_USER_MODEL.split(".")).objects.using(db_alias).filter(pk__in=user_ids).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("authentication", "0002_alter_emailverification_code_hash"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PendingRegistration",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("email", models.EmailField(max_length=254, unique=True)),
                ("password_hash", models.CharField(max_length=128)),
                ("code_hash", models.CharField(max_length=128)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("expires_at", models.DateTimeField()),
                ("last_sent_at", models.DateTimeField()),
                ("attempts", models.PositiveSmallIntegerField(default=0)),
            ],
        ),
        migrations.RunPython(remove_legacy_unverified_signups, migrations.RunPython.noop),
        migrations.DeleteModel(name="EmailVerification"),
    ]

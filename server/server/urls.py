"""
URL configuration for server project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from authentication import dashboard
from orders.views import staff_orders
from authentication.views import cancel_registration, current_customer, customer_login, customer_logout, email_availability, register, resend_registration_code, verify_registration

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/admin/auth/session/', dashboard.session_status),
    path('api/admin/auth/login/', dashboard.login),
    path('api/admin/auth/logout/', dashboard.logout),
    path('api/admin/orders/', staff_orders, name='staff-orders'),
    path('api/', include('catalog.urls')),
    path('api/cart/', include('cart.urls')),
    path('api/orders/', include('orders.urls')),
    path('api/auth/register/', register, name='register'),
    path('api/auth/verify-registration/', verify_registration, name='verify-registration'),
    path('api/auth/resend-registration-code/', resend_registration_code, name='resend-registration-code'),
    path('api/auth/cancel-registration/', cancel_registration, name='cancel-registration'),
    path('api/auth/email-availability/', email_availability, name='email-availability'),
    path('api/auth/me/', current_customer, name='current-customer'),
    path('api/auth/login/', customer_login, name='login'),
    path('api/auth/logout/', customer_logout, name='logout'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

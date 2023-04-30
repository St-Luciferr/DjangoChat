from django.urls import path
from .views import register,home
from django.contrib.auth import views as auth_views

urlpatterns = [
    path("register/",register,name='register'),
    path("login/",auth_views.LoginView.as_view(template_name='Users/login.html'),name='login'),
    path("logout/",auth_views.LogoutView.as_view(template_name='Users/logout.html'),name='logout'),
    path('',home,name='home'),
]

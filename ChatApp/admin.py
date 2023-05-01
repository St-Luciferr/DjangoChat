from django.contrib import admin
from .models import ChatMsg,ChatRoom
# Register your models here.

admin.site.register(ChatRoom)

admin.site.register(ChatMsg)
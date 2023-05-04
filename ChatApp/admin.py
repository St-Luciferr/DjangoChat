from django.contrib import admin
from .models import ChatMsg,ChatRoom
# Register your models here.

class RoomAdmin(admin.ModelAdmin):
    list_display=('name',)


admin.site.register(ChatRoom,RoomAdmin)

class MsgAdmin(admin.ModelAdmin):
    list_display=('sender','room_name','timestamp','content')
  
admin.site.register(ChatMsg,MsgAdmin)
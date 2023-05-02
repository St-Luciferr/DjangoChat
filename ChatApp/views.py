from django.shortcuts import render
from .models import ChatMsg,ChatRoom
from django.contrib.auth.decorators import login_required

@login_required
def index(request):
    return render(request, "ChatApp/index.html")

@login_required
def room(request, room_name):
    username=request.user.username
    group_name="chat_"+room_name
    group=ChatRoom.objects.filter(name=group_name).first()
    chats=[]
    if group:
        chats=ChatMsg.objects.filter(room_name=group)
    else:
        room=ChatRoom(name=group_name)
        room.save()
    print(username)
    return render(request, "ChatApp/room.html", {"room_name": room_name,'user_name':username,'chats':chats})
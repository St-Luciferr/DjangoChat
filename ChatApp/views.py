from django.shortcuts import render


def index(request):
    return render(request, "ChatApp/index.html")

def room(request, room_name):
    username=request.user
    print(username)
    return render(request, "ChatApp/room.html", {"room_name": room_name,'user_name':username})
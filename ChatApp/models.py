from django.db import models
from django.contrib.auth.models import User
# Create your models here.

class ChatRoom(models.Model):
    name=models.CharField(max_length=25)

    def __str__(self):
        return self.name
    
class ChatMsg(models.Model):
    sender=models.ForeignKey(User,on_delete=models.CASCADE)
    content=models.TextField(max_length=1000)
    timestamp=models.DateTimeField(auto_now=True)
    room_name=models.ForeignKey(ChatRoom,on_delete=models.CASCADE)

    def __str__(self):
        return self.content
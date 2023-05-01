# chat/consumers.py
import json

from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import User
from channels.db import database_sync_to_async
from .models import ChatMsg,ChatRoom

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = self.room_name

        # Join room group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json["message"]
        sender=text_data_json["sender"]
        sending_user=await database_sync_to_async(User.objects.get)(username=sender)
        group=await database_sync_to_async(ChatRoom.objects.get)(name=self.room_group_name)

        # create and save new chat object of received msg
        chat=ChatMsg(sender=sending_user,content=message,room_name=group)
        await database_sync_to_async(chat.save)()
        print(message)
        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {"type": "chat_message",
             "message": message,
             'sender':sender
            }
        )

    # Receive message from room group
    async def chat_message(self, event):
        message = event["message"]
        sender=event["sender"]
        print("chat_message ",message)
        # Send message to WebSocket (front end)
        await self.send(text_data=json.dumps({
            "message": message,
            'sender':sender
            }))
# chat/consumers.py
import json

from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import User
from channels.db import database_sync_to_async
from .models import ChatMsg, ChatRoom


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = "chat_%s" % self.room_name

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        sender = text_data_json["sender"]
        event_type = text_data_json['type']
        message = text_data_json["message"]

        # if chat message is received
        if event_type == 'msg':
            sending_user = await database_sync_to_async(User.objects.get)(username=sender)
            group = await database_sync_to_async(ChatRoom.objects.get)(name=self.room_group_name)

            # create and save new chat object of received msg
            chat = ChatMsg(sender=sending_user,
                           content=message, room_name=group)
            await database_sync_to_async(chat.save)()
            print(message)
            # Send message to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat_message",
                    "message": message,
                    'sender': sender
                }
            )

        # if new call is received
        elif event_type == 'call':
            print(sender, "is calling\n")
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'incoming_call',
                    "sender": sender,
                    'message': message
                }
            )

        # answering the call
        elif event_type == 'answer_call':
            print("Answering call from ", sender)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'call_answered',
                    "sender": sender,
                    'message': message
                }
            )

        # ICE candidate received from peer
        elif event_type == 'ICE_Candidate':
            print("Receiving ICE Candidate from ", sender)

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'ICE_Candidate',
                    "sender": sender,
                    'message': message
                }
            )
        elif event_type=='end_call':
            print("Ending Call:")
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type':'end_call',
                    'sender':sender,
                    'message':'ending call'
                }
            )

    # Receive message from room group

    async def chat_message(self, event):
        message = event["message"]
        sender = event["sender"]
        # Send message to WebSocket (front end)
        await self.send(text_data=json.dumps({
            "type": 'msg',
            "message": message,
            'sender': sender
        }))

    async def incoming_call(self, event):
        await self.send(text_data=json.dumps({
            'type': 'call_received',
            'sender': event["sender"],
            'message': event["message"],
        }))

    async def call_answered(self, event):
        print("call Answered")
        await self.send(text_data=json.dumps({
            'type': 'call_answered',
            'sender': event["sender"],
            'message': event['message']
        }))

    async def end_call(self,event):
        await self.send(text_data=json.dumps({
            'type':'End_Call',
            'sender':event["sender"]
        }))

    async def ICE_Candidate(self, event):
        print("ICE candidate received:\n")
        await self.send(text_data=json.dumps({
            'type': 'ICE_Candidate',
            'sender': event["sender"],
            'message': event['message']
        }))

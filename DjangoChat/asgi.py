

import os

from django.core.asgi import get_asgi_application
import ChatApp.routing
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "DjangoChat.settings")

application = ProtocolTypeRouter({
    'http':get_asgi_application(),
    'websocket': AllowedHostsOriginValidator(
            AuthMiddlewareStack(URLRouter(ChatApp.routing.websocket_urlpatterns))
            ),
})

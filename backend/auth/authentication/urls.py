from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.conf import settings
from django.conf.urls.static import static

from .views import (
    UserViewSet,
    LogoutView,
    CookieTokenRefreshView,
    CookieTokenObtainPairView,
    RegisterView,
    SendFriendRequestView,
    AcceptFriendRequestView,
    PendingFriendRequestsView,
)

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")

urlpatterns = [
    path("", include(router.urls)),
    path("login/", CookieTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("login/refresh/", CookieTokenRefreshView.as_view(), name="token_refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("register/", RegisterView.as_view(), name="register"),
    path("friends/", UserViewSet.as_view({"get": "list_friends"}), name="friends"),
    path("add-friend/", UserViewSet.as_view({"post": "add_friend"}), name="add_friend"),
    path(
        "send-friend-request/",
        SendFriendRequestView.as_view(),
        name="send_friend_request",
    ),
    path(
        "accept-friend-request/",
        AcceptFriendRequestView.as_view(),
        name="accept_friend_request",
    ),
    path(
        "pending-friend-requests/",
        PendingFriendRequestsView.as_view(),
        name="pending_friend_requests",
    ),
    # path('verify-email/', send_mymail, name='send_mymail'),
    # path('email-verified/', views.mail_verified),
    path(
        "login/42/",
        UserViewSet.as_view({"post": "login_with_42"}),
        name="login_with_42",
    ),
    path("api-auth/", include("rest_framework.urls", namespace="rest_framework")),
    # path('auth/42/callback/', handle_42_callback, name='handle_42_callback'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

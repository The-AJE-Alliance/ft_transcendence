from .models import FriendRequest
from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    # Utiliser PrimaryKeyRelatedField pour gérer les IDs des amis
    friends = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), many=True, required=False
    )
    avatar_url_full = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "nickname",
            "email",
            "avatar_url",
            "avatar",
            "avatar_url_full",
            "auth_method",
            "is_active",
            "is_superuser",
            "is_staff",
            "friends",
            "is_online",
            "password",
            "two_factor_enabled",
        )
        read_only_fields = [
            "is_superuser",
            "id",
            "is_staff",
            "is_active",
            "date_joined",
            "is_online",
            "auth_method",
        ]
        extra_kwargs = {
            "password": {"write_only": True, "required": True},
        }

    def get_avatar_url_full(self, obj):
        request = self.context.get("request")
        if obj.avatar and hasattr(obj.avatar, "url"):
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            else:
                return obj.avatar.url
        elif obj.avatar_url:
            return obj.avatar_url
        return None

    def create(self, validated_data):
        friends_data = validated_data.pop("friends", [])
        user = User.objects.create_user(**validated_data)
        if friends_data:
            user.friends.set(friends_data)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        friends_data = validated_data.pop("friends", None)
        if password:
            instance.set_password(password)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if friends_data is not None:
            instance.friends.set(friends_data)  # Utiliser les IDs des amis
        instance.save()
        return instance

    def validate_nickname(self, value):
        user = self.context["request"].user
        if User.objects.exclude(pk=user.pk).filter(nickname=value).exists():
            raise serializers.ValidationError("This nickname is already used.")
        return value


class FriendRequestSerializer(serializers.ModelSerializer):
    from_user = UserSerializer(read_only=True)
    to_user = UserSerializer(read_only=True)

    class Meta:
        model = FriendRequest
        fields = ["id", "from_user", "to_user", "status", "created_at"]

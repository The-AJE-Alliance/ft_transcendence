from rest_framework import serializers
from .models import User

from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    # Utiliser PrimaryKeyRelatedField pour gérer les IDs des amis
    friends = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), many=True, required=False
    )

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "nickname",
            "email",
            "avatar",
            "is_active",
            "is_superuser",
            "is_staff",
            "friends",
            "is_online",
            "password",
        )
        read_only_fields = [
            "is_superuser",
            "id",
            "is_staff",
            "is_active",
            "date_joined",
            "is_online",
        ]
        extra_kwargs = {
            "username": {"required": True},
            "nickname": {"required": True},
            "email": {"required": True},
            "password": {"write_only": True, "required": True},
            "avatar": {"required": False},
        }

    def validate(self, data):
        if not data.get("username"):
            raise serializers.ValidationError({"username": "Username is required."})
        if not data.get("nickname"):
            raise serializers.ValidationError({"nickname": "Nickname is required."})
        if not data.get("email"):
            raise serializers.ValidationError({"email": "Email is required."})
        if not data.get("password"):
            raise serializers.ValidationError({"password": "Password is required."})
        return data

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

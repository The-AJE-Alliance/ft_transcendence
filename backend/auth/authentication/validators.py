from django.core.exceptions import ValidationError


def validate_alnum(value):
    if not value.isalnum():
        raise ValidationError("%(value)s is not an alpha numeric value")

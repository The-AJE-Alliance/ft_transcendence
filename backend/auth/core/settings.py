"""
Django settings for core project.

Generated by 'django-admin startproject' using Django 5.1.1.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/5.1/ref/settings/
"""
import os
from datetime import timedelta
from pathlib import Path
from vault12factor import DjangoAutoRefreshDBCredentialsDict, VaultAuth12Factor, VaultCredentialProvider

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-=1&$&oa)7se1sj)#7935n!_r%0bj0=82wqdutfhse3u^mr4cy8'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'False').lower() in ('true', '1')

ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", default="").split(" ")

VAULT_DATABASE_PATH = 'database/creds/auth'
VAULT_CACERT = '/ca/ca.pem'
DATABASE_URL = 'postgres://auth-db:5432/auth'
DATABASE_OWNERROLE = 'auth'

# Application definition

INSTALLED_APPS = [
    'authentication',
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django_dbconn_retry',
    'django_otp',
    'django_otp.plugins.otp_totp',
    'health_check',
    'health_check.db',
    'postgresql_setrole',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'vault12factor',
    'corsheaders',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
}

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'django_otp.middleware.OTPMiddleware',
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOWED_ORIGINS = [
    "https://transcendence.local"
]

CORS_ALLOW_HEADERS = [
    'authorization',
    'content-type',
    'x-csrftoken',
    'cookie',
]

CSRF_TRUSTED_ORIGINS = [
    "https://transcendence.local"
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

ASGI_APPLICATION = 'core.asgi.application'

VAULT = VaultAuth12Factor.fromenv()
CREDS = VaultCredentialProvider(os.getenv("VAULT_ADDR"), VAULT,
                                "database/creds/auth",
                                os.getenv("VAULT_CACERT", None), True,
                                DEBUG)

# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases

DATABASES = {
    'default': DjangoAutoRefreshDBCredentialsDict(CREDS, {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'auth',
        'USER': CREDS.username,
        'PASSWORD': CREDS.password,
        'HOST': 'auth-db',
        'PORT': '5432',
        'SET_ROLE': 'owner'
    }),
}

# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': False,
}

AUTH_USER_MODEL = 'authentication.User'

# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'Europe/Paris'

USE_I18N = True

USE_TZ = True

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/

STATIC_URL = '/static/'
STATIC_ROOT = '/static/'

MEDIA_URL = '/media/'
#MEDIA_ROOT = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
# EMAIL_HOST = 'smtp.gmail.com'  # Serveur SMTP de Gmail
# EMAIL_PORT = 587  # Port pour les connexions sécurisées avec TLS
# EMAIL_USE_TLS = True  # Utilisation du protocole TLS
# DEFAULT_FROM_EMAIL = 'ponggame@mail.com'

CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
REDIRECT_URI = os.getenv("REDIRECT_URI")

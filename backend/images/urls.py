from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AlbumViewSet, ImageViewSet

router = DefaultRouter()
router.register(r'images', ImageViewSet)
router.register(r'albums', AlbumViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

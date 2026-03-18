from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from .models import Album, Image
from .serializers import AlbumSerializer, ImageSerializer


class ImageViewSet(viewsets.ModelViewSet):
    queryset = Image.objects.all()
    serializer_class = ImageSerializer
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'title', 'file_size']

    def get_queryset(self):
        qs = super().get_queryset()
        album_id = self.request.query_params.get('album')
        if album_id:
            qs = qs.filter(album_id=album_id)
        return qs

    @action(detail=False, methods=['post'], url_path='batch-upload')
    def batch_upload(self, request):
        files = request.FILES.getlist('files')
        album_id = request.data.get('album')
        if not files:
            return Response({'error': '请选择至少一个文件'}, status=status.HTTP_400_BAD_REQUEST)

        images = []
        for f in files:
            img = Image(file=f, album_id=album_id if album_id else None)
            img.save()
            images.append(img)

        serializer = self.get_serializer(images, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='batch-delete')
    def batch_delete(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': '请提供要删除的图片ID'}, status=status.HTTP_400_BAD_REQUEST)
        deleted_count, _ = Image.objects.filter(id__in=ids).delete()
        return Response({'deleted': deleted_count})


class AlbumViewSet(viewsets.ModelViewSet):
    queryset = Album.objects.all()
    serializer_class = AlbumSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']

    @action(detail=True, methods=['get'])
    def images(self, request, pk=None):
        album = self.get_object()
        images = album.images.all()
        page = self.paginate_queryset(images)
        if page is not None:
            serializer = ImageSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        serializer = ImageSerializer(images, many=True, context={'request': request})
        return Response(serializer.data)

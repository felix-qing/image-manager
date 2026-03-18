from rest_framework import serializers

from .models import Album, Image


class ImageSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Image
        fields = [
            'id', 'title', 'description', 'file', 'file_url',
            'album', 'width', 'height', 'file_size',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'width', 'height', 'file_size', 'created_at', 'updated_at']

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class AlbumSerializer(serializers.ModelSerializer):
    image_count = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()

    class Meta:
        model = Album
        fields = [
            'id', 'name', 'description', 'image_count', 'cover_image',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_image_count(self, obj):
        return obj.images.count()

    def get_cover_image(self, obj):
        first_image = obj.images.first()
        if first_image and first_image.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(first_image.file.url)
        return None

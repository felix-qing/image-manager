import uuid

from django.db import models


class Album(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField('相册名称', max_length=200)
    description = models.TextField('描述', blank=True, default='')
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '相册'
        verbose_name_plural = '相册'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class Image(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField('标题', max_length=200, blank=True, default='')
    description = models.TextField('描述', blank=True, default='')
    file = models.ImageField('图片文件', upload_to='images/%Y/%m/%d/')
    album = models.ForeignKey(
        Album,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='images',
        verbose_name='所属相册',
    )
    width = models.PositiveIntegerField('宽度', null=True, blank=True)
    height = models.PositiveIntegerField('高度', null=True, blank=True)
    file_size = models.PositiveIntegerField('文件大小(字节)', null=True, blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '图片'
        verbose_name_plural = '图片'
        ordering = ['-created_at']

    def __str__(self):
        return self.title or str(self.file)

    def save(self, *args, **kwargs):
        if self.file:
            from PIL import Image as PILImage
            img = PILImage.open(self.file)
            self.width = img.width
            self.height = img.height
            self.file_size = self.file.size
            if not self.title:
                self.title = self.file.name.split('/')[-1]
        super().save(*args, **kwargs)

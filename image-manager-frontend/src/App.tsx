import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Upload,
  Trash2,
  FolderPlus,
  Image as ImageIcon,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Grid3x3,
  Check,
  Edit,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface ImageItem {
  id: string
  title: string
  description: string
  file: string
  file_url: string
  album: string | null
  width: number | null
  height: number | null
  file_size: number | null
  created_at: string
  updated_at: string
}

interface Album {
  id: string
  name: string
  description: string
  image_count: number
  cover_image: string | null
  created_at: string
  updated_at: string
}

interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN')
}

function App() {
  const [images, setImages] = useState<ImageItem[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null)
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [previewImage, setPreviewImage] = useState<ImageItem | null>(null)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showAlbumDialog, setShowAlbumDialog] = useState(false)
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null)
  const [albumName, setAlbumName] = useState('')
  const [albumDescription, setAlbumDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [totalImages, setTotalImages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [showSidebar, setShowSidebar] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const fetchImages = useCallback(async () => {
    setLoading(true)
    try {
      let url = `${API_URL}/api/images/?page=${currentPage}`
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`
      if (selectedAlbum) url += `&album=${selectedAlbum}`
      const res = await fetch(url)
      const data: PaginatedResponse<ImageItem> = await res.json()
      setImages(data.results)
      setTotalImages(data.count)
    } catch (err) {
      console.error('Failed to fetch images:', err)
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchQuery, selectedAlbum])

  const fetchAlbums = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/albums/?page_size=100`)
      const data: PaginatedResponse<Album> = await res.json()
      setAlbums(data.results)
    } catch (err) {
      console.error('Failed to fetch albums:', err)
    }
  }, [])

  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  useEffect(() => {
    fetchAlbums()
  }, [fetchAlbums])

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const formData = new FormData()
      Array.from(files).forEach(f => formData.append('files', f))
      if (selectedAlbum) formData.append('album', selectedAlbum)

      const res = await fetch(`${API_URL}/api/images/batch-upload/`, {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        setShowUploadDialog(false)
        fetchImages()
        fetchAlbums()
      }
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (ids: string[]) => {
    if (!confirm(`确定删除 ${ids.length} 张图片吗？`)) return
    try {
      await fetch(`${API_URL}/api/images/batch-delete/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      setSelectedImages(new Set())
      fetchImages()
      fetchAlbums()
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const handleCreateOrUpdateAlbum = async () => {
    if (!albumName.trim()) return
    try {
      const url = editingAlbum
        ? `${API_URL}/api/albums/${editingAlbum.id}/`
        : `${API_URL}/api/albums/`
      const method = editingAlbum ? 'PUT' : 'POST'
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: albumName, description: albumDescription }),
      })
      setShowAlbumDialog(false)
      setEditingAlbum(null)
      setAlbumName('')
      setAlbumDescription('')
      fetchAlbums()
    } catch (err) {
      console.error('Album operation failed:', err)
    }
  }

  const handleDeleteAlbum = async (albumId: string) => {
    if (!confirm('确定删除此相册吗？相册中的图片不会被删除。')) return
    try {
      await fetch(`${API_URL}/api/albums/${albumId}/`, { method: 'DELETE' })
      if (selectedAlbum === albumId) setSelectedAlbum(null)
      fetchAlbums()
    } catch (err) {
      console.error('Delete album failed:', err)
    }
  }

  const toggleImageSelection = (id: string) => {
    setSelectedImages(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openPreview = (image: ImageItem) => {
    setPreviewImage(image)
    setPreviewIndex(images.indexOf(image))
  }

  const navigatePreview = (direction: number) => {
    const newIndex = previewIndex + direction
    if (newIndex >= 0 && newIndex < images.length) {
      setPreviewIndex(newIndex)
      setPreviewImage(images[newIndex])
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleUpload(e.dataTransfer.files)
  }

  const totalPages = Math.ceil(totalImages / 20)

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-6 h-6 text-blue-600" />
              <h1 className="text-lg font-bold text-gray-900">图片管理</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setEditingAlbum(null)
                setAlbumName('')
                setAlbumDescription('')
                setShowAlbumDialog(true)
              }}
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              新建相册
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div
              className={`flex items-center gap-2 px-4 py-3 cursor-pointer transition-colors ${
                selectedAlbum === null
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
              onClick={() => { setSelectedAlbum(null); setCurrentPage(1) }}
            >
              <Grid3x3 className="w-4 h-4" />
              <span className="text-sm font-medium">全部图片</span>
              <span className="ml-auto text-xs text-gray-500">{totalImages}</span>
            </div>

            {albums.map(album => (
              <div
                key={album.id}
                className={`group flex items-center gap-2 px-4 py-3 cursor-pointer transition-colors ${
                  selectedAlbum === album.id
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
                onClick={() => { setSelectedAlbum(album.id); setCurrentPage(1) }}
              >
                <FolderOpen className="w-4 h-4" />
                <span className="text-sm font-medium truncate flex-1">{album.name}</span>
                <span className="text-xs text-gray-500">{album.image_count}</span>
                <div className="hidden group-hover:flex gap-1">
                  <button
                    className="p-1 hover:bg-gray-200 rounded"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingAlbum(album)
                      setAlbumName(album.name)
                      setAlbumDescription(album.description)
                      setShowAlbumDialog(true)
                    }}
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                  <button
                    className="p-1 hover:bg-red-100 rounded text-red-500"
                    onClick={(e) => { e.stopPropagation(); handleDeleteAlbum(album.id) }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            {showSidebar ? <ChevronLeft className="w-4 h-4" /> : <Grid3x3 className="w-4 h-4" />}
          </Button>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="搜索图片..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {selectedImages.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(Array.from(selectedImages))}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                删除 ({selectedImages.size})
              </Button>
            )}
            <Button size="sm" onClick={() => setShowUploadDialog(true)}>
              <Upload className="w-4 h-4 mr-1" />
              上传图片
            </Button>
          </div>
        </div>

        {/* Image Grid */}
        <div
          className={`flex-1 overflow-y-auto p-6 ${dragOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">加载中...</div>
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <ImageIcon className="w-16 h-16 mb-4" />
              <p className="text-lg">暂无图片</p>
              <p className="text-sm mt-1">点击上传或拖拽图片到此处</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {images.map((image) => (
                <Card
                  key={image.id}
                  className={`group relative overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                    selectedImages.has(image.id) ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div
                    className="absolute top-2 left-2 z-10"
                    onClick={(e) => { e.stopPropagation(); toggleImageSelection(image.id) }}
                  >
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedImages.has(image.id)
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-white bg-black/20 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {selectedImages.has(image.id) && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </div>

                  <div
                    className="aspect-square bg-gray-100"
                    onClick={() => openPreview(image)}
                  >
                    <img
                      src={image.file_url}
                      alt={image.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/f3f4f6/9ca3af/png?text=Error'
                      }}
                    />
                  </div>

                  <div className="p-2">
                    <p className="text-xs font-medium text-gray-700 truncate">{image.title}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(image.file_size)}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pb-4">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>上传图片</DialogTitle>
          </DialogHeader>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files) }}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
            <p className="text-sm text-gray-600 mb-2">拖拽图片到此处，或</p>
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? '上传中...' : '选择文件'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
            <p className="text-xs text-gray-400 mt-2">支持 JPG, PNG, GIF, WebP 等格式</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowUploadDialog(false)}>取消</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Album Dialog */}
      <Dialog open={showAlbumDialog} onOpenChange={setShowAlbumDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAlbum ? '编辑相册' : '新建相册'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="album-name">相册名称</Label>
              <Input
                id="album-name"
                placeholder="输入相册名称"
                value={albumName}
                onChange={(e) => setAlbumName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="album-desc">描述</Label>
              <Textarea
                id="album-desc"
                placeholder="输入相册描述（可选）"
                value={albumDescription}
                onChange={(e) => setAlbumDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAlbumDialog(false)}>取消</Button>
            <Button onClick={handleCreateOrUpdateAlbum}>
              {editingAlbum ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setPreviewImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2"
            onClick={() => setPreviewImage(null)}
          >
            <X className="w-6 h-6" />
          </button>

          {previewIndex > 0 && (
            <button
              className="absolute left-4 text-white hover:bg-white/20 rounded-full p-2"
              onClick={(e) => { e.stopPropagation(); navigatePreview(-1) }}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {previewIndex < images.length - 1 && (
            <button
              className="absolute right-4 text-white hover:bg-white/20 rounded-full p-2"
              onClick={(e) => { e.stopPropagation(); navigatePreview(1) }}
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          <div className="max-w-5xl max-h-screen p-8" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImage.file_url}
              alt={previewImage.title}
              className="max-w-full max-h-[80vh] object-contain mx-auto"
            />
            <div className="text-white text-center mt-4">
              <p className="text-lg font-medium">{previewImage.title}</p>
              <p className="text-sm text-gray-300 mt-1">
                {previewImage.width && previewImage.height
                  ? `${previewImage.width} x ${previewImage.height}`
                  : ''}
                {previewImage.file_size ? ` | ${formatFileSize(previewImage.file_size)}` : ''}
                {` | ${formatDate(previewImage.created_at)}`}
              </p>
              {previewImage.description && (
                <p className="text-sm text-gray-400 mt-1">{previewImage.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

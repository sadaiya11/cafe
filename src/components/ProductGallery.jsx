import { useState } from 'react'

export default function ProductGallery({ images = [] }) {
  const [selectedImage, setSelectedImage] = useState(null)
  const activeImage = selectedImage && images.includes(selectedImage) ? selectedImage : (images[0] ?? '')

  if (!images.length) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <img src={activeImage} alt="Featured product" className="h-[420px] w-full object-cover md:h-[560px]" />
      </div>

      <div className="grid grid-cols-4 gap-3">
        {images.map((image) => (
          <button
            key={image}
            type="button"
            onClick={() => setSelectedImage(image)}
            className={`overflow-hidden rounded-2xl border-2 transition ${
              activeImage === image ? 'border-orange-500' : 'border-slate-200'
            }`}
          >
            <img src={image} alt="Product thumbnail" className="h-20 w-full object-cover md:h-24" />
          </button>
        ))}
      </div>
    </div>
  )
}

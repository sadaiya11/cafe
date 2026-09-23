import { useState } from 'react'

export default function ProductGallery({ images = [] }) {
  const [selectedImage, setSelectedImage] = useState(null)
  const activeImage = selectedImage && images.includes(selectedImage) ? selectedImage : (images[0] ?? '')

  if (!images.length) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <img src={activeImage} alt="Featured product" className="h-[340px] w-full object-cover sm:h-[400px] lg:h-[440px]" />
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        {images.map((image) => (
          <button
            key={image}
            type="button"
            onClick={() => setSelectedImage(image)}
            className={`overflow-hidden rounded-xl border-2 transition ${
              activeImage === image ? 'border-orange-500 shadow-sm' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <img src={image} alt="Product thumbnail" className="h-16 w-full object-cover sm:h-20" />
          </button>
        ))}
      </div>
    </div>
  )
}

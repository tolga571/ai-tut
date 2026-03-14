# Skill — File & Media Management

## Core Rule

> Never store uploaded files on the server filesystem.
> Always use cloud storage (S3 or Cloudinary).
> Always validate type, size, and content before storing.

---

## Stack Options

```
Cloudinary  → Images/video with auto-optimization, transformations. Best for avatars, product photos.
AWS S3      → Any file type, raw storage, more control. Best for documents, large files.
UploadThing → Modern, type-safe, easy setup. Good for Next.js projects.
```

---

## Cloudinary Setup (Images — Recommended)

```bash
npm install cloudinary multer
npm install -D @types/multer
```

```typescript
// src/config/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key:    env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

// .env
// CLOUDINARY_CLOUD_NAME=your_cloud_name
// CLOUDINARY_API_KEY=your_api_key
// CLOUDINARY_API_SECRET=your_api_secret
```

---

## Upload Service

```typescript
// src/services/uploadService.ts
import cloudinary from '@/config/cloudinary';
import { ValidationError } from '@/utils/errors';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;  // 5MB
const MAX_DOC_SIZE   = 10 * 1024 * 1024; // 10MB

export class UploadService {
  async uploadImage(file: Express.Multer.File, folder: string): Promise<UploadResult> {
    this.validateImage(file);

    const result = await new Promise<cloudinary.UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder,
          transformation: [{ width: 1200, height: 1200, crop: 'limit' }, { quality: 'auto' }, { fetch_format: 'auto' }],
        },
        (error, result) => { if (error) reject(error); else resolve(result!); }
      ).end(file.buffer);
    });

    return { url: result.secure_url, publicId: result.public_id };
  }

  async uploadAvatar(file: Express.Multer.File): Promise<UploadResult> {
    this.validateImage(file);

    const result = await new Promise<cloudinary.UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'avatars',
          transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }, { quality: 'auto' }],
        },
        (error, result) => { if (error) reject(error); else resolve(result!); }
      ).end(file.buffer);
    });

    return { url: result.secure_url, publicId: result.public_id };
  }

  async deleteFile(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }

  private validateImage(file: Express.Multer.File) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new ValidationError(`Unsupported file type. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
    }
    if (file.size > MAX_IMAGE_SIZE) {
      throw new ValidationError('Image too large. Maximum size is 5MB.');
    }
  }
}

export const uploadService = new UploadService();

interface UploadResult { url: string; publicId: string; }
```

---

## Multer Middleware

```typescript
// src/middleware/upload.ts
import multer from 'multer';
import path from 'path';
import { ValidationError } from '@/utils/errors';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOC_TYPES   = ['application/pdf', 'application/msword'];

const createUploader = (allowedTypes: string[], maxSize: number) =>
  multer({
    storage: multer.memoryStorage(), // never write to disk
    limits: { fileSize: maxSize },
    fileFilter: (_, file, cb) => {
      if (!allowedTypes.includes(file.mimetype)) {
        return cb(new ValidationError('Unsupported file type') as any);
      }
      const ext = path.extname(file.originalname).toLowerCase();
      const validExts = allowedTypes.flatMap(t => t === 'image/jpeg' ? ['.jpg', '.jpeg'] : [`.${t.split('/')[1]}`]);
      if (!validExts.includes(ext)) {
        return cb(new ValidationError('Invalid file extension') as any);
      }
      cb(null, true);
    },
  });

export const uploadImage    = createUploader(ALLOWED_IMAGE_TYPES, 5 * 1024 * 1024);
export const uploadDocument = createUploader(ALLOWED_DOC_TYPES,  10 * 1024 * 1024);
```

---

## Avatar Upload Route

```typescript
// src/modules/user/user.routes.ts
router.patch('/avatar',
  authenticate,
  uploadImage.single('avatar'),
  catchAsync(async (req, res) => {
    if (!req.file) throw new ValidationError('No file uploaded');

    // Delete old avatar if exists
    const user = await userRepository.findById(req.user.id);
    if (user?.avatarPublicId) {
      await uploadService.deleteFile(user.avatarPublicId);
    }

    const { url, publicId } = await uploadService.uploadAvatar(req.file);
    const updated = await userRepository.update(req.user.id, { avatar: url, avatarPublicId: publicId });

    res.json(ApiResponse.ok(updated, 'Avatar updated'));
  })
);
```

---

## Multiple Images (e.g. Product Photos)

```typescript
// Upload multiple product images
router.post('/products/:id/images',
  authenticate,
  authorize('seller', 'admin'),
  uploadImage.array('images', 10), // max 10 images
  catchAsync(async (req, res) => {
    if (!req.files?.length) throw new ValidationError('No files uploaded');

    const uploadPromises = (req.files as Express.Multer.File[]).map(file =>
      uploadService.uploadImage(file, 'products')
    );
    const results = await Promise.all(uploadPromises);
    const urls = results.map(r => ({ url: r.url, publicId: r.publicId }));

    const product = await productService.addImages(req.params.id, urls);
    res.json(ApiResponse.ok(product, 'Images uploaded'));
  })
);
```

---

## Frontend — File Upload Component

```typescript
// src/components/shared/AvatarUpload.tsx
'use client'; // or standard React
import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { userService } from '@/services/userService';
import { notify } from '@/utils/toast';

export const AvatarUpload = ({ currentAvatar, userId }: AvatarUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const { mutate: uploadAvatar, isPending } = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('avatar', file);
      return userService.updateAvatar(form);
    },
    onSuccess: () => notify.success('Avatar updated'),
    onError:   () => notify.error('Upload failed'),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    if (file.size > 5 * 1024 * 1024) return notify.error('File too large (max 5MB)');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return notify.error('Invalid file type');
    }

    // Show preview immediately
    setPreview(URL.createObjectURL(file));
    uploadAvatar(file);
  };

  return (
    <div className="relative w-24 h-24">
      <img
        src={preview || currentAvatar || '/default-avatar.png'}
        alt="Avatar"
        className="w-24 h-24 rounded-full object-cover"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? <Spinner className="w-4 h-4" /> : <PencilIcon className="w-4 h-4" />}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
};
```

---

## Upload Checklist

- [ ] Files stored in cloud, never on server disk?
- [ ] File type validated (mimetype + extension)?
- [ ] File size validated?
- [ ] Old files deleted when replaced?
- [ ] Images auto-optimized/resized?
- [ ] Client-side preview shown immediately?
- [ ] Upload progress/loading state shown?
- [ ] Error feedback shown on failure?

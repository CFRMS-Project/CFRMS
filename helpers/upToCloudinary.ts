import { v2 as cloudinary } from "cloudinary";
// Lỗi 1 & 2: Phải thêm chữ 'type' khi import Type-only
import type { UploadApiResponse, UploadApiErrorResponse } from "cloudinary";
import streamifier from "streamifier";

// Lỗi 3: Ép kiểu hoặc khẳng định biến môi trường không bị undefined
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
    api_key: process.env.CLOUDINARY_API_KEY as string,
    api_secret: process.env.CLOUDINARY_API_SECRET as string,
});

const streamUpload = (buffer: Buffer): Promise<UploadApiResponse> => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                // Lỗi 4: Khẳng định upload_preset là string
                upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET as string,
                // Cloudinary sẽ tự động dùng folder 'CFRMS' như bạn đã cài đặt trong Preset
            },
            (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
                if (result) {
                    resolve(result);
                } else {
                    reject(error);
                }
            }
        );

        streamifier.createReadStream(buffer).pipe(stream);
    });
};

export const uploadToCloudinary = async (buffer: Buffer): Promise<string> => {
    try {
        const result = await streamUpload(buffer);
        return result.secure_url;
    } catch (error) {
        console.error("Cloudinary Upload Error:", error);
        throw new Error("Lỗi khi upload ảnh lên Cloudinary");
    }
};
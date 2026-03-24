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

/**
 * Xóa ảnh khỏi Cloudinary theo URL.
 * Trích xuất public_id từ URL (bao gồm folder path nếu có).
 * Ví dụ: https://res.cloudinary.com/demo/image/upload/v123/CFRMS/abc.jpg
 *   → public_id = "CFRMS/abc"
 */
export const deleteFromCloudinary = async (url: string): Promise<void> => {
    try {
        // Tách public_id từ URL: lấy phần sau "/upload/v<số>/" và bỏ phần mở rộng
        const uploadIndex = url.indexOf("/upload/");
        if (uploadIndex === -1) return;

        const afterUpload = url.substring(uploadIndex + "/upload/".length);
        // Bỏ qua phiên bản v<số>/ nếu có
        const withoutVersion = afterUpload.replace(/^v\d+\//, "");
        // Bỏ phần mở rộng file (.jpg, .png, .webp, ...)
        const publicId = withoutVersion.replace(/\.[^/.]+$/, "");

        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        // Ghi log lỗi nhưng không throw để không làm gián đoạn luồng chính
        console.error("Cloudinary Delete Error (url:", url, "):", error);
    }
};
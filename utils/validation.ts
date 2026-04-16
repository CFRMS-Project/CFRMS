import { StatusEnum } from "@prisma/client";

export const MAX_FEEDBACK_CONTENT_LENGTH = 500;
export const MAX_FEEDBACK_MEDIA_COUNT = 5;
export const MAX_FEEDBACK_MEDIA_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_LOGIN_USERNAME_LENGTH = 100;
export const MAX_LOGIN_PASSWORD_LENGTH = 255;
export const MAX_REPLY_CONTENT_LENGTH = 1000;

type ValidationSuccess<T> = {
  ok: true;
  value: T;
};

type ValidationFailure = {
  ok: false;
  message: string;
};

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

const valid = <T>(value: T): ValidationResult<T> => ({
  ok: true,
  value,
});

const invalid = <T>(message: string): ValidationResult<T> => ({
  ok: false,
  message,
});

export const parsePositiveInt = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

export const validateLoginPayload = (payload: {
  username?: unknown;
  password?: unknown;
}): ValidationResult<{ username: string; password: string }> => {
  const username =
    typeof payload.username === "string" ? payload.username.trim() : "";
  const password =
    typeof payload.password === "string" ? payload.password : "";

  if (!username) {
    return invalid("Vui lòng nhập tên đăng nhập.");
  }

  if (username.length > MAX_LOGIN_USERNAME_LENGTH) {
    return invalid(
      `Tên đăng nhập không được quá ${MAX_LOGIN_USERNAME_LENGTH} ký tự.`
    );
  }

  if (!password) {
    return invalid("Vui lòng nhập mật khẩu.");
  }

  if (password.length > MAX_LOGIN_PASSWORD_LENGTH) {
    return invalid(
      `Mật khẩu không được quá ${MAX_LOGIN_PASSWORD_LENGTH} ký tự.`
    );
  }

  return valid({ username, password });
};

const normalizeTags = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const tags = value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag, index, arr) => arr.indexOf(tag) === index);

  return tags.length > 0 ? tags.join(", ") : null;
};

const parseRemovedImages = (value: unknown): ValidationResult<string[]> => {
  if (value === undefined || value === null || value === "") {
    return valid([]);
  }

  if (typeof value !== "string") {
    return invalid("Danh sách ảnh cần xóa không hợp lệ.");
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return invalid("Danh sách ảnh cần xóa không hợp lệ.");
    }

    if (parsed.some((item) => typeof item !== "string")) {
      return invalid("Danh sách ảnh cần xóa không hợp lệ.");
    }

    const urls = parsed
      .map((url) => url.trim())
      .filter(Boolean)
      .filter((url, index, arr) => arr.indexOf(url) === index);

    return valid(urls);
  } catch {
    return invalid("Danh sách ảnh cần xóa không hợp lệ.");
  }
};

export const validateFeedbackPayload = (payload: {
  rating?: unknown;
  content?: unknown;
  tags?: unknown;
  isAnonymous?: unknown;
  removedImages?: unknown;
}): ValidationResult<{
  rating: number;
  content: string;
  tags: string | null;
  isAnonymous: boolean;
  removedUrls: string[];
}> => {
  const rating =
    typeof payload.rating === "number"
      ? payload.rating
      : Number(String(payload.rating ?? "").trim());

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return invalid("Rating phải từ 1 đến 5 sao.");
  }

  const content =
    typeof payload.content === "string" ? payload.content.trim() : "";

  if (!content) {
    return invalid("Vui lòng nhập nội dung đánh giá.");
  }

  if (content.length > MAX_FEEDBACK_CONTENT_LENGTH) {
    return invalid(
      `Nội dung đánh giá không được quá ${MAX_FEEDBACK_CONTENT_LENGTH} ký tự.`
    );
  }

  const removedImages = parseRemovedImages(payload.removedImages);
  if (!removedImages.ok) {
    return removedImages;
  }

  return valid({
    rating,
    content,
    tags: normalizeTags(payload.tags),
    isAnonymous:
      payload.isAnonymous === "on" || payload.isAnonymous === "true",
    removedUrls: removedImages.value,
  });
};

export const normalizeFeedbackStatus = (
  value: unknown
): StatusEnum | null => {
  const normalized =
    typeof value === "string" ? value.trim().toUpperCase() : "";

  if (normalized === StatusEnum.APPROVED || normalized === StatusEnum.REJECTED) {
    return normalized as StatusEnum;
  }

  return null;
};

export const validateReplyContent = (
  value: unknown
): ValidationResult<string> => {
  if (value === undefined || value === null) {
    return valid("");
  }

  if (typeof value !== "string") {
    return invalid("Nội dung phản hồi không hợp lệ.");
  }

  const reply = value.trim();
  if (reply.length > MAX_REPLY_CONTENT_LENGTH) {
    return invalid(
      `Phản hồi không được quá ${MAX_REPLY_CONTENT_LENGTH} ký tự.`
    );
  }

  return valid(reply);
};

export const validateBulkIds = (
  value: unknown
): ValidationResult<number[]> => {
  if (!Array.isArray(value)) {
    return invalid("Danh sách ID không hợp lệ.");
  }

  const parsedIds = value.map((item) => parsePositiveInt(item));
  if (parsedIds.some((item) => item === null)) {
    return invalid("Danh sách ID không hợp lệ.");
  }

  const ids = parsedIds
    .filter((item): item is number => item !== null)
    .filter((id, index, arr) => arr.indexOf(id) === index);

  if (ids.length === 0) {
    return invalid("Vui lòng chọn ít nhất 1 đánh giá hợp lệ.");
  }

  return valid(ids);
};

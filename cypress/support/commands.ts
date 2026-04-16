/// <reference types="cypress" />

/**
 * =============================================================
 * Cypress Custom Commands – CFRMS
 * =============================================================
 * Định nghĩa các lệnh tái sử dụng cho toàn bộ test suite.
 *
 * Danh sách commands:
 *   - cy.loginAsCustomer()         → Đăng nhập tài khoản customer01
 *   - cy.loginAsAdmin()            → Đăng nhập tài khoản admin
 *   - cy.logout()                  → Đăng xuất
 *   - cy.submitFeedback(data)      → Điền và submit form đánh giá
 *   - cy.assertFlashMessage(key)   → Kiểm tra flash message theo key
 * =============================================================
 */

// ─── Khai báo TypeScript types cho custom commands ───────────────────────────

export interface FeedbackData {
  rating: number;
  content: string;
  tags?: string;
  isAnonymous?: boolean;
}

declare global {
  namespace Cypress {
    interface Chainable {
      loginAsCustomer(): Chainable<void>;
      loginAsAdmin(): Chainable<void>;
      logout(): Chainable<void>;
      submitFeedback(data: FeedbackData): Chainable<void>;
      assertFlashMessage(key: string): Chainable<void>;
      /** Kiểm tra flash message nếu có trong DOM (optional). Không fail nếu không có element. */
      assertOptionalFlash(): Chainable<void>;
    }
  }
}

// ─── cy.loginAsCustomer() ─────────────────────────────────────────────────────
/**
 * Đăng nhập tài khoản customer01/123 qua form /login.
 * Dùng cy.session() để cache session giữa các test (tăng hiệu năng).
 *
 * @example
 *   beforeEach(() => cy.loginAsCustomer())
 */
Cypress.Commands.add("loginAsCustomer", () => {
  cy.session(
    "customer01-session",
    () => {
      cy.fixture("users").then((users) => {
        cy.visit("/login");
        cy.get('input[name="username"]').type(users.customer.username);
        cy.get('input[name="password"]').type(users.customer.password);
        cy.get('button[type="submit"]').click();
        cy.url().should("include", "/customer/home");
      });
    },
    {
      // Validate session vẫn còn hiệu lực bằng cách kiểm tra cookie
      validate: () => {
        cy.request({ url: "/customer/history", failOnStatusCode: false }).its(
          "status"
        ).should("eq", 200);
      },
    }
  );
});

// ─── cy.loginAsAdmin() ────────────────────────────────────────────────────────
/**
 * Đăng nhập tài khoản admin/123 qua form /admin/login.
 * Dùng cy.session() để cache session.
 *
 * @example
 *   beforeEach(() => cy.loginAsAdmin())
 */
Cypress.Commands.add("loginAsAdmin", () => {
  cy.session(
    "admin-session",
    () => {
      cy.fixture("users").then((users) => {
        cy.visit("/admin/login");
        cy.get('input[name="username"]').type(users.admin.username);
        cy.get('input[name="password"]').type(users.admin.password);
        cy.get('button[type="submit"]').click();
        cy.url().should("include", "/admin/dashboard");
      });
    },
    {
      validate: () => {
        cy.request({ url: "/admin/dashboard", failOnStatusCode: false }).its(
          "status"
        ).should("eq", 200);
      },
    }
  );
});

// ─── cy.logout() ──────────────────────────────────────────────────────────────
/**
 * Đăng xuất bằng cách visit /logout và clear tất cả sessions.
 *
 * @example
 *   afterEach(() => cy.logout())
 */
Cypress.Commands.add("logout", () => {
  cy.visit("/logout");
  cy.url().should("include", "/login");
  // Xóa Cypress session cache để lần login sau không dùng cache cũ
  Cypress.session.clearAllSavedSessions();
});

// ─── cy.submitFeedback(data) ──────────────────────────────────────────────────
/**
 * Điền và submit form đánh giá. Giả định đã đang ở trang form đánh giá.
 * Mock Cloudinary upload để test không phụ thuộc mạng ngoài.
 *
 * @param data - Dữ liệu đánh giá: rating, content, tags, isAnonymous
 *
 * @example
 *   cy.visit('/feedback/new')
 *   cy.submitFeedback({ rating: 5, content: 'Rất tốt', tags: 'Giao nhanh' })
 */
Cypress.Commands.add("submitFeedback", (data: FeedbackData) => {
  // Mock Cloudinary trước khi submit (intercept API upload)
  cy.intercept("POST", "**/upload**", {
    fixture: "cloudinary-mock.json",
    statusCode: 200,
  }).as("cloudinaryUpload");

  // Chọn rating (click vào ngôi sao tương ứng hoặc dùng input hidden)
  // Thử nhiều selector phổ biến cho star rating
  cy.get("body").then(($body) => {
    // Nếu dùng input[type="radio"] cho rating
    if ($body.find(`input[name="rating"][value="${data.rating}"]`).length > 0) {
      cy.get(`input[name="rating"][value="${data.rating}"]`).check({
        force: true,
      });
    }
    // Nếu dùng input[name="rating"] type hidden + stars clickable
    else if ($body.find(`[data-rating="${data.rating}"]`).length > 0) {
      cy.get(`[data-rating="${data.rating}"]`).click();
    }
    // Fallback: set giá trị trực tiếp vào input hidden
    else {
      cy.get('input[name="rating"]').invoke("val", String(data.rating)).trigger("change", { force: true });
    }
  });

  // Điền nội dung
  if (data.content) {
    cy.get('textarea[name="content"]').clear().type(data.content);
  }

  // Điền tags (nếu có)
  if (data.tags) {
    cy.get('input[name="tags"]').clear().type(data.tags);
  }

  // Tích ẩn danh (nếu cần)
  if (data.isAnonymous) {
    cy.get('input[name="isAnonymous"]').check({ force: true });
  }

  // Submit
  cy.get('button[type="submit"]').click();
});

// ─── cy.assertFlashMessage(key) ───────────────────────────────────────────────
/**
 * Kiểm tra flash message sau redirect.
 * Hỗ trợ 2 cơ chế: URL query param và DOM element.
 *
 * @param key - Key của message (vd: "success", "update_success", "hide_success")
 *
 * @example
 *   cy.assertFlashMessage('success')
 */
Cypress.Commands.add("assertFlashMessage", (key: string) => {
  // Cách 1: Kiểm tra URL query param ?message=<key>
  cy.url().should("include", `message=${key}`);

  // Cách 2: Kiểm tra DOM element thông báo (nếu có render từ server)
  // Dùng .then() để không fail nếu không có element (vì URL check đã đủ)
  cy.get("body").then(($body) => {
    const flashSelectors = [
      "[data-flash]",
      ".flash-message",
      ".alert",
      ".notification",
      "#flash-message",
      ".toast",
    ];
    const hasFlashEl = flashSelectors.some(
      (sel) => $body.find(sel).length > 0
    );
    if (hasFlashEl) {
      cy.get(flashSelectors.join(", ")).should("be.visible");
    }
    // Nếu không có element flash thì URL check ở trên đã đủ
  });
});

// ─── cy.assertOptionalFlash() ─────────────────────────────────────────────────
/**
 * Kiểm tra flash message / toast nếu có trong DOM.
 * KHÔNG fail nếu không tìm thấy element nào – hành vi là optional.
 * Dùng trong các test redirect khi flash có thể hiển thị tuỳ server render.
 *
 * @example
 *   cy.visit('/customer/history?message=success')
 *   cy.assertOptionalFlash()
 */
Cypress.Commands.add("assertOptionalFlash", () => {
  const FLASH_SELECTORS = [
    "[data-flash]",
    ".flash-message",
    ".alert",
    ".notification",
    "#flash-message",
    ".toast",
  ];

  cy.get("body").then(($body) => {
    const found = FLASH_SELECTORS.find((sel) => $body.find(sel).length > 0);
    if (found) {
      cy.get(found).should("be.visible");
    }
    // Không có flash element → pass silently (server có thể không render flash)
  });
});

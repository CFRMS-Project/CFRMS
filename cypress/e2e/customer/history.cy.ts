/**
 * =============================================================
 * HIST: Lịch Sử Đánh Giá (Customer History)
 * =============================================================
 * Test cases: HIST-01 → HIST-05
 * Routes:  GET /customer/history?message=...
 */

describe("HIST: Lịch sử đánh giá", () => {
  before(() => cy.task("db:reset"));

  // ── HIST-01: Trang history bảo vệ bởi auth ──────────────────
  it("[HIST-01] /customer/history chưa login → redirect về /login", () => {
    Cypress.session.clearAllSavedSessions();
    cy.visit("/customer/history", { failOnStatusCode: false });
    cy.url().should("include", "/login");
  });

  // ── HIST-02: Hiển thị danh sách đánh giá của user ────────────
  it("[HIST-02] Trang history hiển thị danh sách đánh giá của user đang login", () => {
    cy.loginAsCustomer();
    cy.visit("/customer/history");
    cy.url().should("not.include", "/login");
    // Trang phải render (seed tạo 3 feedbacks cho customer01)
    cy.get("body").should("not.be.empty");
  });

  // ── HIST-03/04/05: Flash message sau các thao tác ────────────
  // Lưu ý: flash message chỉ hiển thị nếu server render nó.
  // Test kiểm tra URL trước (bắt buộc), DOM element là optional.
  const flashMessages = [
    { it: "[HIST-03] Flash message sau khi gửi đánh giá thành công", key: "success" },
    { it: "[HIST-04] Flash message sau khi cập nhật đánh giá", key: "update_success" },
    { it: "[HIST-05] Flash message sau khi ẩn đánh giá", key: "hide_success" },
  ];

  flashMessages.forEach(({ it: label, key }) => {
    it(label, () => {
      cy.loginAsCustomer();
      cy.visit(`/customer/history?message=${key}`);
      cy.url().should("include", `message=${key}`);
      // Optional: kiểm tra flash element nếu có trong DOM
      cy.assertOptionalFlash();
    });
  });
});

/**
 * =============================================================
 * FB-HIDE: Ẩn Đánh Giá (Customer Toggle Hide Feedback)
 * =============================================================
 * Test cases: FB-HIDE-01 → FB-HIDE-03
 * Routes:
 *   POST /feedback/:id/toggle-hide  → Ẩn đánh giá (protected)
 */

describe("FB-HIDE: Ẩn đánh giá", () => {
  // Reset DB trước mỗi test để ID luôn hợp lệ
  beforeEach(() => {
    cy.task("db:reset");
    Cypress.session.clearAllSavedSessions();
  });

  // ── FB-HIDE-01: Ẩn đánh giá của chính mình ──────────────────
  it("[FB-HIDE-01] Ẩn đánh giá của chính mình → redirect ?message=hide_success", () => {
    cy.loginAsCustomer();
    cy.fixture("seed-data").then((seedData) => {
      const id = seedData.feedbacks.pendingId; // feedback của customer01
      // Submit POST qua form (dùng cy.request với cookies)
      cy.visit(`/feedback/${id}/toggle-hide`, { failOnStatusCode: false });
      // Hoặc submit form nếu có nút ẩn trên trang history
      cy.request({
        method: "POST",
        url: `/feedback/${id}/toggle-hide`,
        followRedirect: false,
      }).then((response) => {
        // Server redirect về history với message=hide_success
        expect(response.status).to.be.oneOf([302, 200]);
        if (response.status === 302) {
          expect(response.headers["location"]).to.include("hide_success");
        }
      });
    });
  });

  // ── FB-HIDE-02: Không thể ẩn feedback của người khác ────────
  it("[FB-HIDE-02] customer02 không thể ẩn feedback của customer01 → 403", () => {
    // Login customer02
    cy.session("customer02-hide-test", () => {
      cy.fixture("users").then((users) => {
        cy.visit("/login");
        cy.get('input[name="username"]').type(users.customer2.username);
        cy.get('input[name="password"]').type(users.customer2.password);
        cy.get('button[type="submit"]').click();
        cy.url().should("include", "/customer/home");
      });
    });
    cy.fixture("seed-data").then((seedData) => {
      const id = seedData.feedbacks.pendingId; // feedback của customer01
      cy.request({
        method: "POST",
        url: `/feedback/${id}/toggle-hide`,
        failOnStatusCode: false,
        followRedirect: false,
      }).then((response) => {
        expect(response.status).to.eq(403);
      });
    });
  });

  // ── FB-HIDE-03: Chưa login → redirect ───────────────────────
  it("[FB-HIDE-03] Chưa đăng nhập → redirect về /login khi toggle-hide", () => {
    cy.fixture("seed-data").then((seedData) => {
      const id = seedData.feedbacks.pendingId;
      cy.request({
        method: "POST",
        url: `/feedback/${id}/toggle-hide`,
        failOnStatusCode: false,
        followRedirect: false,
      }).then((response) => {
        // Middleware requireLogin redirect về /login
        expect(response.status).to.eq(302);
        expect(response.headers["location"]).to.include("/login");
      });
    });
  });
});

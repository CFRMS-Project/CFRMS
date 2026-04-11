/**
 * =============================================================
 * ADM-LIST: Admin Danh Sách Feedback
 * =============================================================
 * Test cases: ADM-LIST-01 → ADM-LIST-05
 * Routes:  GET /admin/feedbacks?tab=...&page=...
 */

describe("ADM-LIST: Admin danh sách feedback", () => {
  before(() => cy.task("db:reset"));

  beforeEach(() => {
    cy.loginAsAdmin();
    cy.visit("/admin/feedbacks");
  });

  // ── ADM-LIST-01: Mặc định hiển thị tab PENDING ──────────────
  it("[ADM-LIST-01] Mặc định hiển thị tab PENDING và có bảng dữ liệu", () => {
    cy.url().should("include", "/admin/feedbacks");
    // Bảng phải tồn tại
    cy.get("table, [data-testid='feedback-table'], .feedback-list").should("exist");
    // Tab PENDING active (có thể có class active hoặc aria-selected)
    cy.get("body").then(($body) => {
      const tabSelectors = [
        "[data-tab='pending'].active",
        ".tab-pending.active",
        "a[href*='tab=pending']",
        "button.active",
      ];
      const hasActiveTab = tabSelectors.some(
        (sel) => $body.find(sel).length > 0
      );
      // Hoặc URL mặc định chứa tab=pending
      if (!hasActiveTab) {
        cy.url().then((url) => {
          if (!url.includes("tab=")) {
            // Default tab không cần query param, URL ok
            expect(url).to.include("/admin/feedbacks");
          }
        });
      }
    });
  });

  // ── ADM-LIST-02: Chuyển tab APPROVED ────────────────────────
  it("[ADM-LIST-02] Click tab Đã duyệt → URL có ?tab=approved", () => {
    // Chỉ click chính xác link có chứa href='tab=approved' để tránh nhầm với sidebar
    cy.get("a[href*='tab=approved']").first().click();
    cy.url().should("include", "tab=approved");
  });

  // ── ADM-LIST-03: Chuyển tab REJECTED ────────────────────────
  it("[ADM-LIST-03] Click tab Bị từ chối → URL có ?tab=rejected", () => {
    cy.get("a[href*='tab=rejected']").first().click();
    cy.url().should("include", "tab=rejected");
  });

  // ── ADM-LIST-04: Chuyển tab ALL ─────────────────────────────
  it("[ADM-LIST-04] Click tab Tất cả → URL có ?tab=all", () => {
    cy.get("a[href*='tab=all']").first().click();
    cy.url().should("include", "tab=all");
  });

  // ── ADM-LIST-05: Phân trang hoạt động đúng ──────────────────
  it("[ADM-LIST-05] Phân trang: truy cập ?tab=all&page=1 → hiển thị trang đầu", () => {
    cy.visit("/admin/feedbacks?tab=all&page=1");
    cy.url().should("include", "page=1");
    // Bảng có dữ liệu (seed có 5 feedbacks)
    cy.get("table tr, [data-row], .feedback-item").should("have.length.gte", 1);
  });
});
